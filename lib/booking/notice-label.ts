import type { CancellationResult } from "./cancellation";

export function cancellationNoticeLabel(result: CancellationResult): string {
  let label =
    result.notice === "sent"
      ? (result.noticeReason ??
        "Customer emailed with a calendar cancellation. Their calendar app may ask them to accept it.")
      : (result.noticeReason ??
        (result.notice === "failed"
          ? "Email failed. Please call the customer."
          : result.notice === "pending"
            ? "Notification result pending. Check before contacting the customer."
            : "Customer not emailed. Please call the customer."));
  if (!result.recorded)
    label +=
      " The notification result could not be saved. Make a note of this result.";
  return label;
}
