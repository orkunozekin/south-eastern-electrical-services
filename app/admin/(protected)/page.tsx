import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
        Bookings
      </h1>
      <p className="text-slate mt-3 max-w-xl">
        Booking management, availability, and settings arrive in the next step.
        You’re signed in and this area is protected.
      </p>
      <ul className="mt-8 space-y-3 text-sm">
        <li>
          <Link
            href="/admin/availability"
            className="text-navy decoration-amber font-semibold underline decoration-2 underline-offset-4"
          >
            Availability
          </Link>
        </li>
        <li>
          <Link
            href="/admin/settings"
            className="text-navy decoration-amber font-semibold underline decoration-2 underline-offset-4"
          >
            Settings
          </Link>
        </li>
      </ul>
    </>
  );
}
