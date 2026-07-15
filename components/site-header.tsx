import Link from "next/link";

const links = [
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link
          href="/"
          className="font-display hover:text-amber text-sm font-semibold tracking-[0.14em] text-white/90 uppercase transition"
        >
          SEE
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 md:gap-8">
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
            className="bg-amber text-navy-deep hover:bg-amber-hot px-3 py-2 text-sm font-semibold tracking-wide transition sm:px-4"
          >
            Book a call
          </Link>
        </nav>
      </div>
    </header>
  );
}
