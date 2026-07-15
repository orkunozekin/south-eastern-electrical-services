import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return (
    <>
      <h1 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
        Settings
      </h1>
      <p className="text-slate mt-3">
        Notify email, slot duration, and timezone settings will live here.
      </p>
    </>
  );
}
