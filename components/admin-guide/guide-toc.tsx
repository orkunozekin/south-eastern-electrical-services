"use client";

import { useEffect, useRef, useState } from "react";

import type { GuideHeading } from "@/lib/admin-guide";

export type GuideTocSection = GuideHeading & { subheadings: GuideHeading[] };

type GuideTocProps = {
  sections: GuideTocSection[];
};

function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const firstVisible = ids.find((id) => visible.has(id));
        if (firstVisible) setActive(firstVisible);
      },
      { rootMargin: "0px 0px -65% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

function SectionNumber({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span className="font-display w-6 shrink-0 text-sm font-semibold tabular-nums opacity-70">
      {value.padStart(2, "0")}
    </span>
  );
}

function TocList({
  sections,
  activeId,
  onNavigate,
}: GuideTocProps & { activeId: string | null; onNavigate?: () => void }) {
  const activeSection =
    sections.find(
      (s) => s.id === activeId || s.subheadings.some((h) => h.id === activeId),
    )?.id ?? null;

  return (
    <ol className="space-y-0.5">
      {sections.map((section) => {
        const isActiveSection = section.id === activeSection;
        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={onNavigate}
              aria-current={isActiveSection ? "location" : undefined}
              className={`flex items-baseline gap-2 border-l-2 py-1.5 pr-2 pl-3 text-[0.95rem] leading-snug transition ${
                isActiveSection
                  ? "border-amber text-navy bg-amber/10 font-semibold"
                  : "text-slate hover:border-navy/30 hover:text-navy border-transparent"
              }`}
            >
              <SectionNumber value={section.number} />
              <span>{section.title}</span>
            </a>
            {isActiveSection && section.subheadings.length > 0 && (
              <ol className="border-navy/10 my-1 ml-3 space-y-0.5 border-l pl-3">
                {section.subheadings.map((sub) => (
                  <li key={sub.id}>
                    <a
                      href={`#${sub.id}`}
                      onClick={onNavigate}
                      className={`block py-1 pl-6 text-sm leading-snug transition ${
                        sub.id === activeId
                          ? "text-navy font-semibold"
                          : "text-slate hover:text-navy"
                      }`}
                    >
                      {sub.number ? `${sub.number} ` : ""}
                      {sub.title}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function GuideToc({ sections }: GuideTocProps) {
  const [ids] = useState(() =>
    sections.flatMap((s) => [s.id, ...s.subheadings.map((h) => h.id)]),
  );
  const activeId = useActiveHeading(ids);
  const mobileRef = useRef<HTMLDetailsElement>(null);

  return (
    <>
      <details
        ref={mobileRef}
        className="group border-navy/10 bg-white lg:hidden print:hidden"
      >
        <summary className="text-navy flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
          On this page
          <span
            aria-hidden
            className="text-amber transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <nav
          aria-label="Guide sections"
          className="border-navy/10 border-t px-2 py-3"
        >
          <TocList
            sections={sections}
            activeId={activeId}
            onNavigate={() => mobileRef.current?.removeAttribute("open")}
          />
        </nav>
      </details>

      <nav
        aria-label="Guide sections"
        className="sticky top-6 hidden max-h-[calc(100vh-3rem)] overflow-y-auto pb-6 lg:block print:hidden"
      >
        <p className="font-display text-slate mb-3 pl-3 text-xs font-semibold tracking-[0.16em] uppercase">
          On this page
        </p>
        <TocList sections={sections} activeId={activeId} />
      </nav>
    </>
  );
}
