"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

const links = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link
          href="/"
          onClick={close}
          className="font-display hover:text-amber relative z-40 text-sm font-semibold tracking-[0.14em] text-white/90 uppercase transition"
        >
          SEE
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium tracking-wide text-white/80 transition hover:text-white"
            >
              {link.label}
              <span className="bg-amber absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
          <Link
            href="/book"
            className="bg-amber text-navy-deep hover:bg-amber-hot px-4 py-2 text-sm font-semibold tracking-wide transition"
          >
            Book a call
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          className="relative z-40 flex h-11 w-11 items-center justify-center md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className="relative block h-3.5 w-6" aria-hidden>
            <span
              className={`absolute left-0 block h-0.5 w-6 origin-center bg-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "top-1.5 rotate-45" : "top-0 rotate-0"
              }`}
            />
            <span
              className={`absolute top-1.5 left-0 block h-0.5 w-6 bg-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-6 origin-center bg-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "top-1.5 -rotate-45" : "top-3 rotate-0"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile panel backdrop */}
      <div
        className={`bg-navy-deep/60 fixed inset-0 z-20 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={close}
      />

      {/* Mobile panel */}
      <div
        id={menuId}
        className={`bg-navy-deep/95 absolute inset-x-0 top-0 z-30 origin-top overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <nav className="flex flex-col gap-1 px-5 pt-20 pb-8">
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              style={{ transitionDelay: open ? `${80 + index * 40}ms` : "0ms" }}
              className={`hover:text-amber border-b border-white/10 py-4 text-lg font-medium tracking-wide text-white/90 transition-all duration-300 ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/book"
            onClick={close}
            style={{ transitionDelay: open ? "200ms" : "0ms" }}
            className={`bg-amber text-navy-deep hover:bg-amber-hot mt-5 inline-flex w-full items-center justify-center px-4 py-3 text-base font-semibold tracking-wide transition-all duration-300 ${
              open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            Book a call
          </Link>
        </nav>
      </div>
    </header>
  );
}
