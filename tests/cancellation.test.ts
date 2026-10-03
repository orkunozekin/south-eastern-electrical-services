import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "../lib/booking/types";
vi.mock("../lib/booking/repository", () => ({
  cancelBooking: vi.fn(),
  getBookingSettings: vi.fn(),
  recordCancelNotice: vi.fn(),
}));
vi.mock("../lib/plunk", () => ({
  cancellationRescheduleUrl: vi.fn(),
  isPlunkConfigured: vi.fn(),
  resolveRecipients: vi.fn(),
  sendCustomerCancellation: vi.fn(),
}));
import {
  cancelBooking,
  getBookingSettings,
  recordCancelNotice,
} from "../lib/booking/repository";
import {
  cancellationRescheduleUrl,
  isPlunkConfigured,
  resolveRecipients,
  sendCustomerCancellation,
} from "../lib/plunk";
import { cancelAndNotify } from "../lib/booking/cancellation";
const booking: Booking = {
  id: "test",
  name: "Jane",
  phone: "5551234567",
  email: "jane@example.com",
  startsAt: new Date("2099-10-05T14:00Z"),
  endsAt: new Date("2099-10-05T14:30Z"),
  status: "cancelled",
  createdAt: new Date(),
  slotId: "test",
  inviteUid: "original@old.example",
  inviteOrganizerEmail: "hello@old.example",
  customerTimezone: "America/Chicago",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(cancelBooking).mockResolvedValue({ booking, changed: true });
  vi.mocked(getBookingSettings).mockResolvedValue({
    timezone: "UTC",
    slotDurationMinutes: 30,
    notifyEmails: ["owner@example.com"],
    weeklyHours: {},
    minNoticeMinutes: 0,
    bookingWindowDays: 14,
  });
  vi.mocked(resolveRecipients).mockImplementation((emails) =>
    emails?.length ? emails : ["bootstrap@example.com"],
  );
  vi.mocked(isPlunkConfigured).mockReturnValue(true);
  vi.mocked(cancellationRescheduleUrl).mockReturnValue(
    "https://example.com/book?ref=cancelled",
  );
  vi.mocked(sendCustomerCancellation).mockResolvedValue("sent");
});
describe("cancel then notify", () => {
  it("uses stored customer timezone and business reply address", async () => {
    expect(
      await cancelAndNotify("test", { notifyCustomer: true, message: "Sorry" }),
    ).toMatchObject({ notice: "sent", changed: true, recorded: true });
    expect(sendCustomerCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        booking,
        replyTo: "owner@example.com",
        whenLabel: expect.stringContaining("CT"),
      }),
    );
  });
  it.each([true, false])(
    "reports no email even when notify is %s",
    async (notifyCustomer) => {
      vi.mocked(cancelBooking).mockResolvedValue({
        booking: { ...booking, email: undefined },
        changed: true,
      });
      expect(await cancelAndNotify("test", { notifyCustomer })).toMatchObject({
        notice: "skipped",
        noticeReason: expect.stringContaining("No email"),
      });
      expect(sendCustomerCancellation).not.toHaveBeenCalled();
    },
  );
  it("uses the bootstrap reply address when saved recipients are empty", async () => {
    const settings = await getBookingSettings();
    vi.mocked(getBookingSettings).mockResolvedValue({
      ...settings,
      notifyEmails: [],
    });
    await cancelAndNotify("test", { notifyCustomer: true });
    expect(sendCustomerCancellation).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: "bootstrap@example.com" }),
    );
  });
  it("skips when the admin opts out or booking is past", async () => {
    expect(
      await cancelAndNotify("test", { notifyCustomer: false }),
    ).toMatchObject({ notice: "skipped" });
    vi.mocked(cancelBooking).mockResolvedValue({
      booking: { ...booking, startsAt: new Date(0) },
      changed: true,
    });
    expect(
      await cancelAndNotify("test", { notifyCustomer: true }),
    ).toMatchObject({ noticeReason: expect.stringContaining("passed") });
    expect(sendCustomerCancellation).not.toHaveBeenCalled();
  });
  it("does not resend an already cancelled booking", async () => {
    vi.mocked(cancelBooking).mockResolvedValue({
      booking: { ...booking, cancelNotice: "sent" },
      changed: false,
    });
    expect(
      await cancelAndNotify("test", { notifyCustomer: true }),
    ).toMatchObject({
      changed: false,
      notice: "sent",
      noticeReason: undefined,
    });
    expect(sendCustomerCancellation).not.toHaveBeenCalled();
  });
  it("reports pending rather than claiming delivery after an interrupted cancellation", async () => {
    vi.mocked(cancelBooking).mockResolvedValue({ booking, changed: false });
    expect(
      await cancelAndNotify("test", { notifyCustomer: true }),
    ).toMatchObject({ notice: "pending" });
  });
  it("preserves the cancellation when email fails", async () => {
    vi.mocked(sendCustomerCancellation).mockRejectedValue(
      new Error("Plunk secret error"),
    );
    const result = await cancelAndNotify("test", { notifyCustomer: true });
    expect(result.notice).toBe("failed");
    expect(result.noticeReason).not.toContain("Plunk");
    expect(recordCancelNotice).toHaveBeenCalledWith(
      "test",
      "failed",
      expect.any(String),
    );
  });
  it("still returns success if recording the email result fails", async () => {
    vi.mocked(recordCancelNotice).mockRejectedValue(
      new Error("database failure"),
    );
    expect(
      await cancelAndNotify("test", { notifyCustomer: true }),
    ).toMatchObject({ notice: "sent", recorded: false });
  });
  it("never sends if the cancel transaction fails", async () => {
    vi.mocked(cancelBooking).mockRejectedValue(new Error("transaction failed"));
    await expect(
      cancelAndNotify("test", { notifyCustomer: true }),
    ).rejects.toThrow();
    expect(sendCustomerCancellation).not.toHaveBeenCalled();
  });
  it("skips when email or reschedule URL isn't configured", async () => {
    vi.mocked(isPlunkConfigured).mockReturnValue(false);
    expect(
      await cancelAndNotify("test", { notifyCustomer: true }),
    ).toMatchObject({ notice: "skipped" });
    vi.mocked(isPlunkConfigured).mockReturnValue(true);
    vi.mocked(cancellationRescheduleUrl).mockReturnValue(null);
    expect(
      await cancelAndNotify("test", { notifyCustomer: true }),
    ).toMatchObject({ notice: "skipped" });
    expect(sendCustomerCancellation).not.toHaveBeenCalled();
  });
});
