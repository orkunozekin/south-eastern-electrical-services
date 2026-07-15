import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin-logout-button";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await requireAdmin();

  return (
    <div className="bg-paper flex min-h-full flex-col">
      <header className="border-navy/10 bg-navy border-b text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-display text-amber text-sm font-semibold tracking-[0.14em] uppercase"
            >
              Admin
            </Link>
            <nav className="text-mist/80 hidden gap-4 text-sm sm:flex">
              <Link href="/admin" className="hover:text-white">
                Bookings
              </Link>
              <Link href="/admin/availability" className="hover:text-white">
                Availability
              </Link>
              <Link href="/admin/settings" className="hover:text-white">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {admin.email && (
              <span className="text-mist/60 hidden text-xs sm:inline">
                {admin.email}
              </span>
            )}
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 md:px-8">
        {children}
      </div>
    </div>
  );
}
