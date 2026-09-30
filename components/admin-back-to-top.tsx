"use client";

import { useEffect, useRef, useState } from "react";

type AdminBackToTopProps = {
  /** Receives focus when the button hides, so focus never sits on hidden content. */
  focusTargetId: string;
};

function focusElement(id: string) {
  document.getElementById(id)?.focus({ preventScroll: true });
}

export function AdminBackToTop({ focusTargetId }: AdminBackToTopProps) {
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 600;
      if (!next && document.activeElement === buttonRef.current) {
        focusElement(focusTargetId);
      }
      setVisible(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [focusTargetId]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        focusElement(focusTargetId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
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
