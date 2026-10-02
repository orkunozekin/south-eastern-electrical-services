import { GuideModal } from "@/components/admin-guide/guide-modal";
import { AdminGuideView } from "@/components/admin-guide/admin-guide-view";
import { loadAdminGuide } from "@/lib/admin-guide";
import { type GuideSectionKey } from "@/lib/admin-guide-links";

type AdminHelpLinkProps = {
  section: GuideSectionKey;
  children: React.ReactNode;
};

export async function AdminHelpLink({ section, children }: AdminHelpLinkProps) {
  const guide = await loadAdminGuide();
  return (
    <GuideModal
      section={section}
      guide={<AdminGuideView guide={guide} showPrintButton={false} />}
    >
      <span
        aria-hidden
        className="border-amber text-navy flex h-5 w-5 items-center justify-center rounded-full border-2 text-[0.7rem] font-bold"
      >
        ?
      </span>
      <span className="decoration-amber underline decoration-2 underline-offset-4">
        {children}
      </span>
      <span
        aria-hidden
        className="text-amber transition group-hover:translate-x-0.5"
      >
        →
      </span>
    </GuideModal>
  );
}
