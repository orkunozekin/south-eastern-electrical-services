import type { Metadata } from "next";

import { getAdminAvailabilityAction } from "@/app/actions/admin";
import { AdminAvailabilityForm } from "@/components/admin-availability-form";
import { AdminHelpLink } from "@/components/admin-help-link";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

export const metadata: Metadata = {
  title: "Availability",
  robots: { index: false, follow: false },
};

export default async function AdminAvailabilityPage() {
  if (!isFirebaseAdminConfigured()) {
    return (
      <>
        <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
          Availability
        </h1>
        <p className="text-slate mt-3">
          Booking is temporarily unavailable. Please try again later.
        </p>
      </>
    );
  }

  const result = await getAdminAvailabilityAction();

  return (
    <>
      <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
        Availability
      </h1>
      <p className="text-slate mt-3 max-w-xl">
        Set weekly open hours and close or block specific dates.
      </p>
      <AdminHelpLink section="availability">
        How hours, closed days, and blocked times work
      </AdminHelpLink>
      <div className="mt-8">
        {result.ok ? (
          <AdminAvailabilityForm
            settings={result.settings}
            overrides={result.overrides}
          />
        ) : (
          <p className="text-red-700">{result.error}</p>
        )}
      </div>
    </>
  );
}
