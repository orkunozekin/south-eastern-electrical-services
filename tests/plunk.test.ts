import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCalendarInvite } from "../lib/calendar-invite";
import { inviteIdentity } from "../lib/booking/invite-identity";
import {
  cancellationRescheduleUrl,
  isPlunkConfigured,
  maskedBootstrapRecipients,
  resolveRecipients,
  sendBookingConfirmation,
  sendBookingNotification,
  sendCustomerCancellation,
} from "../lib/plunk";
import type { Booking } from "../lib/booking/types";
const booking: Booking = {
  id: "test",
  name: "Jane <script>",
  phone: "5551234567",
  email: "jane@example.com",
  startsAt: new Date("2099-10-05T14:00Z"),
  endsAt: new Date("2099-10-05T14:30Z"),
  status: "confirmed",
  createdAt: new Date(),
  slotId: "test",
  inviteUid: "booking-test@old.example",
  inviteOrganizerEmail: "hello@old.example",
};
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubEnv("PLUNK_API_KEY", "test-only-key");
  vi.stubEnv("PLUNK_FROM_EMAIL", "hello@new.example");
  vi.stubEnv("BOOKING_NOTIFY_EMAIL", "developer@example.com");
  vi.stubEnv("BOOKING_NOTIFY_CONSOLE", "false");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function payload() {
  return JSON.parse(fetchMock.mock.calls[0][1].body);
}
function attachment() {
  return Buffer.from(payload().attachments[0].content, "base64").toString(
    "utf8",
  );
}
describe("customer calendar cancellation", () => {
  it("keeps the original UID and organizer after the sending domain changes", async () => {
    await sendCustomerCancellation({
      booking,
      whenLabel: "Monday 9 AM CT",
      message: '<script>alert("x")</script>',
      rescheduleUrl: "https://example.com/book?ref=cancelled",
      replyTo: "owner@example.com",
    });
    expect(attachment()).toContain("UID:booking-test@old.example");
    expect(attachment()).toContain("mailto:hello@old.example");
    expect(attachment()).toContain("METHOD:CANCEL");
    expect(attachment()).toContain("STATUS:CANCELLED");
    expect(attachment()).toContain("SEQUENCE:1");
    expect(attachment()).not.toContain("VALARM");
    expect(payload().reply).toBe("owner@example.com");
    expect(payload().body).not.toContain("<script>");
    expect(payload().body).toContain("&lt;script&gt;");
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
      "booking-cancel-test",
    );
  });
  it("uses stored UID in confirmation", async () => {
    await sendBookingConfirmation({ booking, whenLabel: "Monday 9 AM CT" });
    expect(attachment()).toContain("UID:booking-test@old.example");
    expect(attachment()).toContain("METHOD:REQUEST");
  });
  it("does not fabricate a cancellation attachment for a legacy record without a UID", async () => {
    await sendCustomerCancellation({
      booking: { ...booking, inviteUid: undefined },
      whenLabel: "Monday",
      rescheduleUrl: "https://example.com/book",
    });
    expect(payload().attachments).toBeUndefined();
    expect(payload().body).toContain("please remove the old event");
  });
  it("creates invite identity without sending and excludes it from bookings without email", () =>
    expect(inviteIdentity("abc", "hello@old.example")).toEqual({
      inviteUid: "booking-abc@old.example",
      inviteOrganizerEmail: "hello@old.example",
    }));
  it("rejects unsafe reschedule schemes", () => {
    vi.stubEnv("SITE_URL", "javascript:alert(1)");
    expect(cancellationRescheduleUrl()).toBeNull();
    vi.stubEnv("SITE_URL", "https://example.com/some/path");
    expect(cancellationRescheduleUrl()).toBe(
      "https://example.com/book?ref=cancelled",
    );
  });
  it("falls back to the Vercel production hostname when SITE_URL is empty", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "production.example.com");
    expect(cancellationRescheduleUrl()).toBe(
      "https://production.example.com/book?ref=cancelled",
    );
    vi.stubEnv("SITE_URL", "javascript:alert(1)");
    expect(cancellationRescheduleUrl()).toBeNull();
  });
  it("keeps request alarms and removes cancel alarms", () => {
    const input = {
      uid: "test",
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      summary: "Callback",
      description: "Call",
      location: "Phone",
      organizer: { name: "Business", email: "hello@example.com" },
      attendee: { name: "Jane", email: "jane@example.com" },
    };
    expect(buildCalendarInvite(input)).toContain("VALARM");
    expect(buildCalendarInvite({ ...input, method: "CANCEL" })).not.toContain(
      "VALARM",
    );
  });
});
describe("client owns notification recipients", () => {
  it("sends only to settings recipients once supplied", async () => {
    expect(resolveRecipients(["owner@example.com"])).toEqual([
      "owner@example.com",
    ]);
    await sendBookingNotification({
      booking,
      whenLabel: "Monday",
      notifyEmails: ["owner@example.com"],
    });
    expect(payload().to).toBe("owner@example.com");
  });
  it("uses bootstrap only for empty settings and masks it for the UI", () => {
    expect(resolveRecipients([])).toEqual(["developer@example.com"]);
    expect(maskedBootstrapRecipients()).toEqual(["d•••@example.com"]);
  });
  it("does not require the bootstrap env address to configure email", () => {
    vi.stubEnv("BOOKING_NOTIFY_EMAIL", "");
    expect(isPlunkConfigured()).toBe(true);
  });
  it("skips delivery if no recipients exist", async () => {
    vi.stubEnv("BOOKING_NOTIFY_EMAIL", "");
    expect(
      await sendBookingNotification({
        booking,
        whenLabel: "Monday",
        notifyEmails: [],
      }),
    ).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
