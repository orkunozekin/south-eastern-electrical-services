import Link from "next/link";

import { GuidePrintButton } from "./guide-actions";
import { GuideMarkdown } from "./guide-markdown";
import { GuideSearch } from "./guide-search";
import { GuideToc } from "./guide-toc";
import {
  GUIDE_SECTION_IDS,
  type GuideSectionKey,
} from "@/lib/admin-guide-links";
import type { AdminGuide } from "@/lib/admin-guide";

const QUICK_LINKS: { key: GuideSectionKey; title: string; blurb: string }[] = [
  {
    key: "bookings",
    title: "Bookings",
    blurb: "See who's booked a callback, and cancel if you need to.",
  },
  {
    key: "availability",
    title: "Availability",
    blurb: "Set your weekly hours, close a day, or block off times.",
  },
  {
    key: "settings",
    title: "Settings",
    blurb: "Timezone, slot length, and who gets booking emails.",
  },
  {
    key: "tasks",
    title: "Common tasks",
    blurb: "Step-by-step: days off, rescheduling, booking for a customer.",
  },
  {
    key: "troubleshooting",
    title: "Troubleshooting",
    blurb: "What an error message means and how to fix it.",
  },
  {
    key: "quickReference",
    title: "Quick reference",
    blurb: "Every admin task on one page.",
  },
];

type AdminGuideViewProps = {
  guide: AdminGuide;
  showPrintButton?: boolean;
};

export function AdminGuideView({
  guide,
  showPrintButton = true,
}: AdminGuideViewProps) {
  const numbers = new Map(guide.sections.map((s) => [s.id, s.number]));
  const quickLinks = QUICK_LINKS.filter((link) =>
    numbers.has(GUIDE_SECTION_IDS[link.key]),
  );

  return (
    <div className="print:text-black">
      <header className="bg-navy relative overflow-hidden px-6 py-10 text-white md:px-12 md:py-14 print:bg-white print:p-0 print:text-black">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] print:hidden"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          aria-hidden
          className="bg-amber absolute top-0 left-0 h-1 w-24 print:hidden"
        />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="animate-hero-rise max-w-2xl">
            <p className="font-display text-amber text-sm font-semibold tracking-[0.16em] uppercase print:text-black">
              Southeastern Electrical · Admin
            </p>
            <h1 className="font-display mt-3 text-4xl font-bold tracking-tight uppercase md:text-5xl">
              {guide.title}
            </h1>
            <div className="text-mist/85 mt-4 space-y-3 text-lg leading-relaxed print:text-black">
              {guide.intro
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " "))
                .map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
            </div>
          </div>
          {showPrintButton && (
            <div className="animate-hero-rise-delay shrink-0">
              <GuidePrintButton />
            </div>
          )}
        </div>

        <GuideSearch
          sections={guide.sections.map(({ id, title }) => ({ id, title }))}
        />

        {quickLinks.length > 0 && (
          <ul className="animate-hero-rise-delay-2 relative mt-10 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
            {quickLinks.map((link) => {
              const id = GUIDE_SECTION_IDS[link.key];
              return (
                <li key={link.key}>
                  <Link
                    href={`#${id}`}
                    className="group bg-navy hover:bg-charcoal flex h-full flex-col gap-2 p-5 transition"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-amber text-sm font-semibold tabular-nums">
                        {numbers.get(id)?.padStart(2, "0")}
                      </span>
                      <span className="font-display text-xl font-semibold tracking-tight uppercase">
                        {link.title}
                      </span>
                      <span
                        aria-hidden
                        className="text-amber ml-auto -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
                      >
                        →
                      </span>
                    </span>
                    <span className="text-mist/70 text-sm leading-relaxed">
                      {link.blurb}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </header>

      <div className="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:order-none">
          <GuideToc sections={guide.sections} />
        </aside>

        <div className="min-w-0 space-y-8">
          {guide.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="border-navy/10 scroll-mt-6 border bg-white p-6 shadow-[0_1px_2px_rgba(12,26,46,0.04)] md:p-10 print:break-before-auto print:border-0 print:p-0 print:shadow-none"
            >
              <header className="border-navy/10 flex items-center gap-4 border-b pb-6">
                {section.number && (
                  <span className="bg-navy font-display text-amber flex h-12 w-12 shrink-0 items-center justify-center text-xl font-bold tabular-nums print:border print:bg-white print:text-black">
                    {section.number.padStart(2, "0")}
                  </span>
                )}
                <h2
                  id={`${section.id}-title`}
                  className="font-display text-navy text-3xl leading-none font-semibold tracking-tight uppercase md:text-[2.125rem]"
                >
                  {section.title}
                </h2>
              </header>
              <div className="mt-8">
                <GuideMarkdown
                  markdown={section.markdown}
                  headingIds={section.headingIds}
                />
              </div>
            </section>
          ))}

          <p className="text-slate pb-4 text-center text-sm">
            Something missing or unclear?{" "}
            <Link
              href={`#${GUIDE_SECTION_IDS.contact}`}
              className="text-navy decoration-amber font-medium underline decoration-2 underline-offset-4"
            >
              Contact your developer
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
