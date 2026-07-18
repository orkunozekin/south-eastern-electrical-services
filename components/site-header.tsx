"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

const links = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

function BrandMark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="relative z-40 flex items-center gap-3 transition hover:opacity-90"
    >
      {/* Crop to the bulb + SES letters; hide the tiny company-name text. */}
      <span className="relative block h-12 w-14 overflow-hidden rounded-sm bg-white shadow-sm md:h-14 md:w-16">
        <Image
          src="/southeastern.jpg"
          alt=""
          width={940}
          height={1024}
          priority
          className="absolute top-[-4%] left-1/2 h-[150%] w-auto max-w-none -translate-x-1/2 object-cover"
        />
      </span>
      <span className="font-display leading-tight font-semibold tracking-wide text-white uppercase">
        <span className="block text-base md:text-lg">Southeastern</span>
        <span className="block text-xs font-medium tracking-[0.12em] text-white/75 md:text-sm">
          Electrical Services
        </span>
      </span>
      <span className="sr-only">Southeastern Electrical Services home</span>
    </Link>
  );
}

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
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <BrandMark onNavigate={close} />

        {/* Desktop */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group relative text-sm font-medium tracking-wide text-white/80 transition hover:text-white"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-amber transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
          <Link
            href="/book"
            className="bg-amber px-4 py-2 text-sm font-semibold tracking-wide text-navy-deep transition hover:bg-amber-hot"
          >
            Book a call
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          className="relative z-40 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center md:hidden"
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
        className={`fixed inset-0 z-20 bg-navy-deep/60 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
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
        className={`absolute inset-x-0 top-0 z-30 origin-top overflow-hidden bg-navy-deep/95 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden ${
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
              className={`border-b border-white/10 py-4 text-lg font-medium tracking-wide text-white/90 transition-all duration-300 hover:text-amber ${
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
            className={`mt-5 inline-flex w-full items-center justify-center bg-amber px-4 py-3 text-base font-semibold tracking-wide text-navy-deep transition-all duration-300 hover:bg-amber-hot ${
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
