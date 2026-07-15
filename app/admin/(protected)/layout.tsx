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
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 md:px-8">
        {children}
      </div>
    </div>
  );
}
