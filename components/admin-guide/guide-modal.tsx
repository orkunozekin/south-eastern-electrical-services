"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import {
  GUIDE_SECTION_IDS,
  guideHref,
  type GuideSectionKey,
} from "@/lib/admin-guide-links";

export function GuideModal({
  section,
  guide,
  children,
}: {
  section: GuideSectionKey;
  guide: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const target = dialog.querySelector<HTMLElement>(
      `#${CSS.escape(GUIDE_SECTION_IDS[section])}`,
    );
    target?.scrollIntoView({ block: "start" });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [open, section]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="text-navy hover:bg-amber/15 group mt-4 inline-flex items-center gap-2 text-left text-sm font-medium"
      >
        {children}
      </button>
      {open && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="bg-paper text-navy fixed inset-0 m-auto h-[90dvh] max-h-none w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-lg border-0 p-0 shadow-xl backdrop:bg-black/60"
        >
          <div className="flex h-full flex-col">
            <div className="border-navy/10 flex shrink-0 items-center justify-between gap-4 border-b bg-white px-5 py-3">
              <h2 id={titleId} className="font-display text-xl font-semibold">
                Admin user guide
              </h2>
              <div className="flex items-center gap-4">
                <a
                  href={guideHref(section)}
                  className="decoration-amber text-sm underline underline-offset-4"
                >
                  Open full page
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="border-navy/20 hover:bg-amber/15 rounded border px-3 py-2 text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6"
              onClickCapture={(event) => {
                const link = (
                  event.target as HTMLElement
                ).closest<HTMLAnchorElement>('a[href^="#"]');
                if (
                  !link ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                const id = decodeURIComponent(link.hash.slice(1));
                const target = dialogRef.current?.querySelector<HTMLElement>(
                  `#${CSS.escape(id)}`,
                );
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ block: "start" });
                target.tabIndex = -1;
                target.focus({ preventScroll: true });
              }}
            >
              {guide}
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
