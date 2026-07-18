import type { Metadata } from "next";

import { getAdminBookingsAction } from "@/app/actions/admin";
import { AdminBookingsList } from "@/components/admin-bookings-list";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  if (!isFirebaseAdminConfigured()) {
    return (
      <>
        <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
          Bookings
        </h1>
        <p className="text-slate mt-3">
          Booking is temporarily unavailable. Please try again later.
        </p>
      </>
    );
  }

  const result = await getAdminBookingsAction();

  return (
    <>
      <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
        Bookings
      </h1>
      <p className="text-slate mt-3 max-w-xl">
        Upcoming phone callbacks. Cancel a slot to free it on the public
        calendar.
      </p>
      <div className="mt-8">
        {result.ok ? (
          <AdminBookingsList bookings={result.bookings} />
        ) : (
          <p className="text-red-700">{result.error}</p>
        )}
      </div>
    </>
  );
}
