import type { Metadata } from "next";

import { getAdminSettingsAction } from "@/app/actions/admin";
import { AdminHelpLink } from "@/components/admin-help-link";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  if (!isFirebaseAdminConfigured()) {
    return (
      <>
        <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
          Settings
        </h1>
        <p className="text-slate mt-3">
          Booking is temporarily unavailable. Please try again later.
        </p>
      </>
    );
  }

  const result = await getAdminSettingsAction();

  return (
    <>
      <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
        Settings
      </h1>
      <p className="text-slate mt-3 max-w-xl">
        Timezone, slot length, and who gets booking notification emails.
      </p>
      <AdminHelpLink section="settings">
        What each setting does (read before changing)
      </AdminHelpLink>
      <div className="mt-8">
        {result.ok ? (
          <AdminSettingsForm
            settings={result.settings}
            bootstrapRecipients={result.bootstrapRecipients}
          />
        ) : (
          <p className="text-red-700">{result.error}</p>
        )}
      </div>
    </>
  );
}
