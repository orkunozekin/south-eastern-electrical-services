"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelBookingAction, type AdminBookingDto } from "@/app/actions/admin";
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
    if (!confirm("Cancel this callback booking?")) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await cancelBookingAction(id);
      setPendingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
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
                  onClick={() => handleCancel(booking.id)}
                  disabled={pending && pendingId === booking.id}
                  className="border-navy/20 text-navy hover:border-amber hover:bg-amber/10 self-start border px-3 py-2 text-sm font-medium transition disabled:opacity-60"
                >
                  {pending && pendingId === booking.id
                    ? "Cancelling…"
                    : "Cancel"}
                </button>
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
