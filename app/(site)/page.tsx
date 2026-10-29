import Image from "next/image";
import Link from "next/link";

import { BookCta } from "@/components/book-cta";
import { FEATURED_SERVICES, VALUES } from "@/lib/content";

const HERO_IMAGE = "/home-hero-electrician.jpg";

export default function HomePage() {
  return (
    <>
      <section className="bg-navy-deep relative flex min-h-[100svh] items-end overflow-hidden">
        <Image
          src={HERO_IMAGE}
          alt="Electrician inspecting a residential circuit panel"
          fill
          priority
          className="animate-hero-zoom object-cover object-center"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="from-navy-deep via-navy-deep/75 to-navy/40 absolute inset-0 bg-gradient-to-t"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--amber)_18%,transparent),transparent_55%)]"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-32 pb-16 md:px-8 md:pb-24">
          <p className="animate-hero-rise font-display text-5xl leading-[0.95] font-bold tracking-tight text-white uppercase sm:text-6xl md:text-7xl lg:text-8xl">
            Southeastern
            <br />
            Electrical
            <br />
            <span className="text-amber">Services</span>
          </p>
          <p className="animate-hero-rise-delay text-mist/90 mt-6 max-w-md text-lg leading-relaxed md:text-xl">
            Safe, reliable, and affordable electrical work. Start with a quick
            conversation.
          </p>
          <div className="animate-hero-rise-delay-2 mt-8 flex flex-wrap gap-4">
            <Link
              href="/book"
              className="bg-amber text-navy-deep hover:bg-amber-hot px-6 py-3 text-base font-semibold tracking-wide transition"
            >
              Book or get an estimate
            </Link>
            <Link
              href="/services"
              className="hover:border-amber hover:text-amber border border-white/35 px-6 py-3 text-base font-semibold tracking-wide text-white transition"
            >
              View services
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-paper px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
            What we do
          </h2>
          <p className="text-slate mt-3 max-w-xl text-lg">
            From panel upgrades to generators: clear work, done safely.
          </p>
          <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {FEATURED_SERVICES.map((service) => (
              <li key={service.title}>
                <h3 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase">
                  {service.title}
                </h3>
                <p className="text-slate mt-3 text-base leading-relaxed">
                  {service.copy}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/services"
            className="text-navy decoration-amber hover:text-charcoal mt-10 inline-block text-base font-semibold tracking-wide underline decoration-2 underline-offset-4 md:text-lg"
          >
            Explore all services
          </Link>
        </div>
      </section>

      <section className="bg-mist px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <h2 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
              Built on trust
            </h2>
            <p className="text-slate mt-4 text-lg leading-relaxed">
              We start with a conversation so we understand the job before
              anyone shows up. Service, safety, and integrity guide every
              project.
            </p>
          </div>
          <div className="border-amber border-l-4 pl-6 md:pl-8">
            <p className="font-display text-navy text-xl font-semibold tracking-tight uppercase md:text-2xl">
              {VALUES.slice(0, 3).join(" · ")}
            </p>
            <p className="text-slate mt-3 text-base leading-relaxed">
              {VALUES.slice(3).join(" · ")}
            </p>
          </div>
        </div>
      </section>

      <BookCta />
    </>
  );
}
