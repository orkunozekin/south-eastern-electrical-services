import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getVerifiedAdmin } from "@/lib/auth/session";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getVerifiedAdmin();
  if (admin) {
    redirect("/admin");
  }

  return (
    <div className="bg-navy flex min-h-full flex-1 flex-col px-5 py-16 md:px-8">
      <div className="mx-auto w-full max-w-md">
        <p className="font-display text-amber text-sm font-semibold tracking-[0.16em] uppercase">
          South Eastern Electrical
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-white uppercase">
          Admin sign in
        </h1>
        <p className="text-mist/75 mt-3">
          Sign in with your staff Firebase account to manage bookings.
        </p>

        {!isFirebaseAdminConfigured() && (
          <p className="border-amber/70 text-mist/80 mt-6 border-l-4 bg-white/5 px-4 py-3 text-sm">
            Firebase Admin is not configured. Add credentials to{" "}
            <code className="text-amber">.env.local</code> before signing in.
          </p>
        )}

        <Suspense
          fallback={
            <p className="text-mist/70 mt-10 text-sm">Loading sign-in…</p>
          }
        >
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
