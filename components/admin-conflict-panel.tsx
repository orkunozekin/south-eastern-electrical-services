import Link from "next/link";
import type { AdminBookingDto } from "@/app/actions/admin";

export function AdminConflictPanel({
  bookings,
  children,
}: {
  bookings: AdminBookingDto[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-amber bg-amber/10 space-y-3 border-l-4 p-4"
      role="status"
    >
      <p className="text-navy font-semibold">
        {bookings.length}{" "}
        {bookings.length === 1 ? "booking is" : "bookings are"} affected
      </p>
      <ul className="text-slate space-y-1 text-sm">
        {bookings.map((b) => (
          <li key={b.id}>
            {b.name} · {b.label} · {b.phoneDisplay}
            {!b.email && " · No email on file"}
          </li>
        ))}
      </ul>
      <p className="text-slate text-sm">
        These callbacks fall outside the proposed availability. Existing
        bookings keep their original time and length.
      </p>
      <Link
        href="/admin"
        className="text-navy decoration-amber text-sm underline underline-offset-4"
      >
        View bookings
      </Link>
      {children}
    </div>
  );
}
