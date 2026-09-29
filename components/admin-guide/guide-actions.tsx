"use client";

import { useEffect, useState } from "react";

export function GuidePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hover:border-amber hover:text-amber inline-flex items-center gap-2 border border-white/25 px-4 py-2.5 text-sm font-semibold tracking-wide text-white transition print:hidden"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
        <path d="M6 14h12v7H6z" />
      </svg>
      Print or save as PDF
    </button>
  );
}

export function GuideBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={`bg-navy hover:bg-charcoal text-amber fixed right-5 bottom-5 z-20 flex h-12 w-12 items-center justify-center shadow-[0_10px_30px_rgba(7,16,24,0.25)] transition-all duration-300 print:hidden ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
