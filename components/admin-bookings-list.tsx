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

export function AdminBookingsList({ bookings }: AdminBookingsListProps) {
  const router = useRouter();
  const viewerTimezone = useViewerTimezone("America/New_York");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && new Date(b.startsAt) >= new Date(),
  );
  const pastOrCancelled = bookings.filter(
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
      {error && <p className="text-sm text-red-700">{error}</p>}

      <section>
        <h2 className="font-display text-navy text-xl font-semibold tracking-tight uppercase">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-slate mt-3">No upcoming callbacks.</p>
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
          <p className="text-slate mt-3">No recent bookings yet.</p>
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
