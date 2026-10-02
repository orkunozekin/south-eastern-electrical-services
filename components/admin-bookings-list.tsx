"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelBookingAction, type AdminBookingDto } from "@/app/actions/admin";
import { cancellationNoticeLabel } from "@/lib/booking/notice-label";
import type { CancellationResult } from "@/lib/booking/cancellation";
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
  result: CancellationResult,
): CancelResult {
  const call =
    result.notice === "failed" || result.notice === "skipped"
      ? ` Call ${booking.name} at ${booking.phoneDisplay}.`
      : "";
  return {
    tone: result.notice === "sent" && result.recorded ? "ok" : "warn",
    text: `Cancelled. ${cancellationNoticeLabel(result)}${call}`,
  };
}

function noticeLabel(booking: AdminBookingDto): string | null {
  if (booking.status !== "cancelled") return null;
  if (!booking.cancelNotice)
    return "notification pending: check before contacting the customer";
  if (booking.cancelNotice === "sent") return "customer emailed";
  if (booking.cancelNotice === "failed") return "email failed";
  return booking.cancelNoticeReason
    ? `not emailed: ${booking.cancelNoticeReason.toLowerCase()}`
    : "not emailed";
}

function matchesSearch(
  booking: AdminBookingDto,
  terms: string[],
  viewerTimezone: string,
): boolean {
  const text = [
    booking.name,
    booking.email ?? "",
    booking.phoneDisplay,
    booking.status,
    bookingWhenLabel(booking.startsAt, viewerTimezone),
    formatWithShortZone(booking.startsAt, viewerTimezone, "EEEE, MMMM d, yyyy"),
  ]
    .join(" ")
    .toLowerCase();
  const phoneDigits = booking.phone.replace(/\D/g, "");

  return terms.every((term) => {
    if (text.includes(term)) return true;
    const digits = term.replace(/[().+-]/g, "");
    return /^\d{3,}$/.test(digits) && phoneDigits.includes(digits);
  });
}

export function AdminBookingsList({ bookings }: AdminBookingsListProps) {
  const router = useRouter();
  const viewerTimezone = useViewerTimezone("America/New_York");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CancelResult | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  const visible = searching
    ? bookings.filter((b) => matchesSearch(b, terms, viewerTimezone))
    : bookings;

  const upcoming = visible.filter(
    (b) => b.status === "confirmed" && new Date(b.startsAt) >= new Date(),
  );
  const pastOrCancelled = visible.filter(
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
      setResult(describeCancelResult(booking, response));
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      {bookings.length > 0 && (
        <div>
          <label
            htmlFor="booking-search"
            className="text-navy block text-sm font-semibold"
          >
            Search bookings
          </label>
          <div className="relative mt-2 max-w-md">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-slate pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="booking-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Name, phone, email, or date"
              autoComplete="off"
              className="border-navy/20 text-navy placeholder:text-slate/70 focus:border-amber w-full border bg-white py-2.5 pr-3 pl-9 text-base outline-none"
            />
          </div>
          {searching && (
            <p className="text-slate mt-2 text-sm" aria-live="polite">
              {visible.length} of {bookings.length}{" "}
              {bookings.length === 1 ? "booking" : "bookings"} match.{" "}
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-navy decoration-amber font-medium underline decoration-2 underline-offset-4"
              >
                Clear search
              </button>
            </p>
          )}
        </div>
      )}

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
          <p className="text-slate mt-3">
            {searching
              ? "No upcoming callbacks match your search."
              : "No upcoming callbacks."}
          </p>
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
          <p className="text-slate mt-3">
            {searching
              ? "No recent or cancelled bookings match your search."
              : "No recent bookings yet."}
          </p>
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
