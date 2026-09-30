import type { Metadata } from "next";

import { AdminGuideView } from "@/components/admin-guide/admin-guide-view";
import { loadAdminGuide } from "@/lib/admin-guide";

export const metadata: Metadata = {
  title: "Admin guide",
  robots: { index: false, follow: false },
};

export default async function AdminGuidePage() {
  const guide = await loadAdminGuide();
  return <AdminGuideView guide={guide} />;
}
