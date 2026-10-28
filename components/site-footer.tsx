import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-mist border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight text-white uppercase md:text-3xl">
            Southeastern
            <br />
            Electrical Services
          </p>
          <p className="text-mist/70 mt-3 max-w-sm text-sm leading-relaxed">
            A trusted partner for safe, reliable, and affordable electrical
            work. Tell us about your project to get started.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm md:items-end">
          <Link
            href="/book"
            className="text-amber hover:text-amber-hot font-semibold"
          >
            Book or get an estimate
          </Link>
          <Link href="/services" className="text-mist/70 hover:text-white">
            Services
          </Link>
          <Link href="/about" className="text-mist/70 hover:text-white">
            About
          </Link>
          <Link href="/contact" className="text-mist/70 hover:text-white">
            Contact
          </Link>
          <div className="text-mist/55 flex gap-4 text-xs">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
      <div className="text-mist/50 border-t border-white/10 px-5 py-4 text-center text-xs md:px-8">
        © {new Date().getFullYear()} Southeastern Electrical Services. All
        rights reserved.
      </div>
    </footer>
  );
}
