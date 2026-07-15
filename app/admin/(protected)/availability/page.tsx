import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Availability",
  robots: { index: false, follow: false },
};

export default function AdminAvailabilityPage() {
  return (
    <>
      <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
        Availability
      </h1>
      <p className="text-slate mt-3">
        Weekly hours and blackout controls will live here.
      </p>
    </>
  );
}
