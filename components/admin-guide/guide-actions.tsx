"use client";

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
