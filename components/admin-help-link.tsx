import Link from "next/link";

import { guideHref, type GuideSectionKey } from "@/lib/admin-guide-links";

type AdminHelpLinkProps = {
  section: GuideSectionKey;
  children: React.ReactNode;
};

export function AdminHelpLink({ section, children }: AdminHelpLinkProps) {
  return (
    <Link
      href={guideHref(section)}
      className="text-navy hover:bg-amber/15 group mt-4 inline-flex items-center gap-2 text-sm font-medium"
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
    </Link>
  );
}
