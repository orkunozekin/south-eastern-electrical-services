import { AdminBackToTop } from "@/components/admin-back-to-top";
import { AdminHeader } from "@/components/admin-header";
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
      <AdminHeader email={admin.email} />
      <div
        id="admin-main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 outline-none md:px-8"
      >
        {children}
      </div>
      <AdminBackToTop focusTargetId="admin-main" />
    </div>
  );
}
