"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelBookingAction, type AdminBookingDto } from "@/app/actions/admin";
import { cancellationNoticeLabel } from "@/lib/booking/notice-label";
import { formatWithShortZone } from "@/lib/timezone";
import { useViewerTimezone } from "@/lib/use-viewer-timezone";

type AdminBookingsListProps = {
  bookings: AdminBookingDto[];
};

function bookingWhenLabel(startsAt: string, viewerTimezone: string): string {
  return formatWithShortZone(startsAt, viewerTimezone, "EEE, MMM d · h:mm a");
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [cancelMessage, setCancelMessage] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  function handleCancel(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await cancelBookingAction(id, {
        notifyCustomer,
        message: cancelMessage,
      });
      setPendingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmId(null);
      setResultMessage(`Cancelled. ${cancellationNoticeLabel(result)}`);
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

      {resultMessage && (
        <p role="status" className="text-navy text-sm">
          {resultMessage}
        </p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

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
            {upcoming.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-navy font-semibold">{booking.name}</p>
                  {booking.outsideHours && (
                    <p className="text-sm font-semibold text-red-700">
                      Outside your hours
                    </p>
                  )}
                  <p className="text-slate text-sm">
                    {bookingWhenLabel(booking.startsAt, viewerTimezone)}
                  </p>
                  <p className="text-slate text-sm">{booking.phoneDisplay}</p>
                  {booking.email && (
                    <p className="text-slate text-sm">{booking.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmId(booking.id);
                    setNotifyCustomer(!!booking.email);
                    setCancelMessage("");
                    setResultMessage(null);
                  }}
                  disabled={pending || confirmId === booking.id}
                  className="border-navy/20 text-navy hover:border-amber hover:bg-amber/10 self-start border px-3 py-2 text-sm font-medium transition disabled:opacity-60"
                >
                  {pending && pendingId === booking.id
                    ? "Cancelling…"
                    : "Cancel"}
                </button>
                {confirmId === booking.id && (
                  <div className="border-amber bg-amber/10 w-full space-y-3 border-l-4 p-4 sm:max-w-md">
                    <p className="text-navy text-sm font-semibold">
                      Cancel {booking.name}’s callback on{" "}
                      {bookingWhenLabel(booking.startsAt, viewerTimezone)}?
                    </p>
                    <label className="text-slate flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={notifyCustomer}
                        disabled={pending || !booking.email}
                        onChange={(e) => setNotifyCustomer(e.target.checked)}
                      />
                      Email the customer asking them to reschedule
                    </label>
                    {!booking.email && (
                      <p className="text-slate text-sm">
                        No email on file. Please call {booking.phoneDisplay}.
                      </p>
                    )}
                    {notifyCustomer && (
                      <label className="text-slate block text-sm">
                        Optional message
                        <textarea
                          rows={3}
                          maxLength={1000}
                          disabled={pending}
                          value={cancelMessage}
                          onChange={(e) => setCancelMessage(e.target.value)}
                          className="border-navy/20 mt-2 w-full border bg-white p-2"
                        />
                      </label>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleCancel(booking.id)}
                        className="bg-navy px-3 py-2 text-sm text-white"
                      >
                        {pending ? "Cancelling…" : "Cancel booking"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmId(null)}
                        className="text-navy border px-3 py-2 text-sm"
                      >
                        Keep booking
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
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
            {pastOrCancelled.map((booking) => (
              <li key={booking.id} className="py-4">
                <p className="text-navy font-semibold">
                  {booking.name}{" "}
                  <span className="text-slate text-sm font-normal">
                    · {booking.status}
                  </span>
                </p>
                <p className="text-slate text-sm">
                  {bookingWhenLabel(booking.startsAt, viewerTimezone)}
                </p>
                <p className="text-slate text-sm">{booking.phoneDisplay}</p>
                {booking.status === "cancelled" && (
                  <p className="text-slate mt-1 text-sm">
                    {booking.cancelNotice === "sent"
                      ? "Customer emailed"
                      : booking.cancelNotice === "failed"
                        ? "Email failed; please call the customer"
                        : booking.cancelNotice === "skipped"
                          ? "Not emailed"
                          : "Notification result unavailable; check before contacting the customer"}
                    {booking.cancelNoticeReason &&
                      ` · ${booking.cancelNoticeReason}`}
                  </p>
                )}
                {booking.email && (
                  <p className="text-slate text-sm">{booking.email}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
