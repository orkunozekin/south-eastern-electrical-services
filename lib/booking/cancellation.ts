import {
  cancelBooking,
  getBookingSettings,
  recordCancelNotice,
} from "./repository";
import {
  cancellationRescheduleUrl,
  isPlunkConfigured,
  sendCustomerCancellation,
} from "@/lib/plunk";
import { formatWithShortZone } from "@/lib/timezone";

export type CancellationResult = {
  notice: "sent" | "failed" | "skipped" | "pending";
  noticeReason?: string;
  changed: boolean;
  recorded: boolean;
};

/** Shared by authenticated actions and the explicitly opted-in reset script. */
export async function cancelAndNotify(
  id: string,
  options: { notifyCustomer: boolean; message?: string },
): Promise<CancellationResult> {
  const { booking, changed } = await cancelBooking(id);
  if (!changed)
    return {
      changed,
      recorded: true,
      notice: booking.cancelNotice ?? "pending",
      noticeReason:
        booking.cancelNoticeReason ??
        "Notification result pending. Check before contacting the customer.",
    };
  let notice: "sent" | "failed" | "skipped" = "skipped";
  let noticeReason: string | undefined;
  const rescheduleUrl = cancellationRescheduleUrl();
  if (!options.notifyCustomer)
    noticeReason = "Admin chose not to notify. Please call the customer.";
  else if (!booking.email)
    noticeReason = "No email on file. Please call the customer.";
  else if (booking.startsAt <= new Date())
    noticeReason = "Booking time has passed.";
  else if (!isPlunkConfigured())
    noticeReason = "Email is not configured. Please call the customer.";
  else if (!rescheduleUrl)
    noticeReason =
      "Reschedule link is not configured. Please call the customer.";
  else {
    try {
      const settings = await getBookingSettings();
      notice = await sendCustomerCancellation({
        booking,
        whenLabel: formatWithShortZone(
          booking.startsAt,
          booking.customerTimezone ?? settings.timezone,
          "EEEE, MMM d · h:mm a",
        ),
        message: options.message?.trim(),
        rescheduleUrl,
        businessPhone: process.env.BUSINESS_PHONE,
        replyTo: settings.notifyEmails[0],
      });
      if (notice === "skipped")
        noticeReason = "Email is not configured. Please call the customer.";
      else if (!booking.inviteUid)
        noticeReason =
          "Customer emailed. No original invite identifier is available; ask them to remove the old calendar event.";
    } catch (error) {
      console.error("[booking] Cancellation email failed:", error);
      notice = "failed";
      noticeReason = "Email failed. Please call the customer.";
    }
  }
  // A confirmed cancellation must never appear to have failed because of email
  // or a follow-up metadata write. Tell the admin if the result couldn't be saved.
  let recorded = true;
  try {
    await recordCancelNotice(id, notice, noticeReason);
  } catch (error) {
    console.error("[booking] Could not record cancellation notice:", error);
    recorded = false;
  }
  return { changed, notice, noticeReason, recorded };
}
