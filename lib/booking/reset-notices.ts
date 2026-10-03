import type { Booking } from "./types";

/** Check all cancelled records, including those left by an earlier reset attempt. */
export function assertResetNoticesResolved(bookings: Booking[]): void {
  const unresolved = bookings.filter(
    (booking) =>
      booking.status === "cancelled" &&
      (!booking.cancelNotice ||
        booking.cancelNotice === "failed" ||
        (booking.email && booking.cancelNotice !== "sent")),
  );
  if (unresolved.length)
    throw new Error(
      `Reset stopped before deletion. Review unresolved cancellation notices: ${unresolved.map((booking) => booking.id).join(", ")}.`,
    );
}
