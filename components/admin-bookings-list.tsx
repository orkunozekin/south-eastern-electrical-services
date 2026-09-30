"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelBookingAction, type AdminBookingDto } from "@/app/actions/admin";
import type { CancelNotice } from "@/lib/booking";
import { formatWithShortZone } from "@/lib/timezone";
import { useViewerTimezone } from "@/lib/use-viewer-timezone";

type AdminBookingsListProps = {
  bookings: AdminBookingDto[];
};

type CancelResult = {
  tone: "ok" | "warn";
  text: string;
};

function bookingWhenLabel(startsAt: string, viewerTimezone: string): string {
  return formatWithShortZone(startsAt, viewerTimezone, "EEE, MMM d · h:mm a");
}

function describeCancelResult(
  booking: AdminBookingDto,
  notice: CancelNotice,
  reason: string | undefined,
): CancelResult {
  const callHint = `please call ${booking.name} at ${booking.phoneDisplay}.`;
  if (notice === "sent") {
    return {
      tone: "ok",
      text: `Cancelled. ${booking.name} was emailed and their calendar invite was cancelled.`,
    };
  }
  if (notice === "failed") {
    return { tone: "warn", text: `Cancelled. Email failed, ${callHint}` };
  }
  switch (reason) {
    case "No email on file":
      return { tone: "warn", text: `Cancelled. No email on file, ${callHint}` };
    case "Admin chose not to notify":
      return {
        tone: "warn",
        text: `Cancelled. The customer wasn’t emailed, ${callHint}`,
      };
    case "Booking time has passed":
      return {
        tone: "warn",
        text: `Cancelled. The booking time had passed, so no email was sent; ${callHint}`,
      };
    case "Email not configured":
      return {
        tone: "warn",
        text: `Cancelled. Customer emails aren’t set up, ${callHint}`,
      };
    default:
      return { tone: "ok", text: "This booking was already cancelled." };
  }
}

function noticeLabel(booking: AdminBookingDto): string | null {
  if (booking.status !== "cancelled" || !booking.cancelNotice) return null;
  if (booking.cancelNotice === "sent") return "customer emailed";
  if (booking.cancelNotice === "failed") return "email failed";
  return booking.cancelNoticeReason
    ? `not emailed: ${booking.cancelNoticeReason.toLowerCase()}`
    : "not emailed";
}

export function AdminBookingsList({ bookings }: AdminBookingsListProps) {
  const router = useRouter();
  const viewerTimezone = useViewerTimezone("America/New_York");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CancelResult | null>(null);
  const [pending, startTransition] = useTransition();

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.startsAt) >= new Date(),
  );
  const pastOrCancelled = bookings.filter(
    (b) => !(b.status === "confirmed" && new Date(b.startsAt) >= new Date()),
  );

  function openConfirm(booking: AdminBookingDto) {
    setError(null);
    setConfirmingId(booking.id);
    setNotifyCustomer(Boolean(booking.email));
    setMessage("");
  }

  function handleCancel(booking: AdminBookingDto) {
    if (pending) return;
    setError(null);
    setResult(null);
    const notify = Boolean(booking.email) && notifyCustomer;
    startTransition(async () => {
      const response = await cancelBookingAction(booking.id, {
        notifyCustomer: notify,
        message: notify ? message : undefined,
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setConfirmingId(null);
      setResult(
        describeCancelResult(booking, response.notice, response.noticeReason),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result && (
        <p
          role="status"
          className={`border-l-4 px-4 py-3 text-sm ${
            result.tone === "ok"
              ? "border-emerald-600 bg-emerald-50 text-emerald-900"
              : "border-amber bg-amber/10 text-navy"
          }`}
        >
          {result.text}
        </p>
      )}

      <section>
        <h2 className="font-display text-navy text-xl font-semibold tracking-tight uppercase">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-slate mt-3">No upcoming callbacks.</p>
        ) : (
          <ul className="divide-navy/10 border-navy/10 mt-4 divide-y border-y">
            {upcoming.map((booking) => {
              const confirming = confirmingId === booking.id;
              const when = bookingWhenLabel(booking.startsAt, viewerTimezone);
              return (
                <li key={booking.id} className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-navy font-semibold">{booking.name}</p>
                      <p className="text-slate text-sm">{when}</p>
                      <p className="text-slate text-sm">
                        {booking.phoneDisplay}
                      </p>
                      {booking.email && (
                        <p className="text-slate text-sm">{booking.email}</p>
                      )}
                    </div>
                    {!confirming && (
                      <button
                        type="button"
                        onClick={() => openConfirm(booking)}
                        disabled={pending}
                        className="border-navy/20 text-navy hover:border-amber hover:bg-amber/10 self-start border px-3 py-2 text-sm font-medium transition disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {confirming && (
                    <div className="border-navy/15 bg-navy/5 mt-4 space-y-4 border p-4">
                      <p className="text-navy font-semibold">
                        Cancel {booking.name}’s callback on {when}?
                      </p>

                      <div>
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(booking.email) && notifyCustomer}
                            disabled={!booking.email || pending}
                            onChange={(e) =>
                              setNotifyCustomer(e.target.checked)
                            }
                            className="mt-0.5"
                          />
                          <span
                            className={
                              booking.email ? "text-navy" : "text-slate/70"
                            }
                          >
                            Email the customer asking them to reschedule
                          </span>
                        </label>
                        {!booking.email && (
                          <p className="text-slate mt-1 pl-6 text-sm">
                            No email on file. Please call {booking.phoneDisplay}
                            .
                          </p>
                        )}
                      </div>

                      {booking.email && notifyCustomer && (
                        <label className="block">
                          <span className="text-navy text-sm font-medium">
                            Message to the customer{" "}
                            <span className="text-slate font-normal">
                              (optional)
                            </span>
                          </span>
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={500}
                            rows={3}
                            disabled={pending}
                            placeholder="e.g. Sorry, I’m out on an emergency job."
                            className="border-navy/20 focus:border-amber mt-1 block w-full border bg-white px-3 py-2 text-sm outline-none"
                          />
                        </label>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleCancel(booking)}
                          disabled={pending}
                          className="bg-navy hover:bg-navy-deep px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                        >
                          {pending ? "Cancelling…" : "Cancel booking"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          disabled={pending}
                          className="border-navy/20 text-navy hover:border-amber border px-4 py-2 text-sm font-medium transition disabled:opacity-60"
                        >
                          Keep booking
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-navy text-xl font-semibold tracking-tight uppercase">
          Recent / cancelled
        </h2>
        {pastOrCancelled.length === 0 ? (
          <p className="text-slate mt-3">No recent bookings yet.</p>
        ) : (
          <ul className="divide-navy/10 border-navy/10 mt-4 divide-y border-y">
            {pastOrCancelled.map((booking) => {
              const notice = noticeLabel(booking);
              return (
                <li key={booking.id} className="py-4">
                  <p className="text-navy font-semibold">
                    {booking.name}{" "}
                    <span className="text-slate text-sm font-normal">
                      · {booking.status}
                      {notice && ` · ${notice}`}
                    </span>
                  </p>
                  <p className="text-slate text-sm">
                    {bookingWhenLabel(booking.startsAt, viewerTimezone)}
                  </p>
                  <p className="text-slate text-sm">{booking.phoneDisplay}</p>
                  {booking.email && (
                    <p className="text-slate text-sm">{booking.email}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
