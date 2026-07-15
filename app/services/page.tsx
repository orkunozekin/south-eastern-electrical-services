import type { Metadata } from "next";

import { BookCta } from "@/components/book-cta";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Residential and commercial electrical services from South Eastern Electrical Services.",
};

const services = [
  {
    title: "Panel upgrades & service changes",
    copy: "Modern capacity for today’s loads — EV chargers, HVAC, shops, and growing households.",
  },
  {
    title: "Lighting & outlets",
    copy: "New circuits, dedicated outlets, LED upgrades, and fixtures that fit how you live or work.",
  },
  {
    title: "Troubleshooting & repairs",
    copy: "Breakers tripping, flickering lights, dead outlets — we find the cause and fix it properly.",
  },
  {
    title: "Commercial & light industrial",
    copy: "Tenant build-outs, warehouse power, and upkeep that keeps your business running.",
  },
  {
    title: "Safety & code updates",
    copy: "GFCI/AFCI protection, grounding, and renovations brought up to current standards.",
  },
  {
    title: "EV chargers & specialty installs",
    copy: "Level 2 chargers and dedicated circuits planned for your panel and driveway.",
  },
] as const;

export default function ServicesPage() {
  return (
    <>
      <section className="bg-navy px-5 pt-28 pb-16 md:px-8 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
            Services
          </h1>
          <p className="text-mist/85 mt-4 max-w-xl text-lg">
            Electrical work for homes and businesses — scoped clearly after a
            phone conversation.
          </p>
        </div>
      </section>

      <section className="bg-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          {services.map((service) => (
            <article key={service.title}>
              <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase">
                {service.title}
              </h2>
              <p className="text-slate mt-3 text-base leading-relaxed">
                {service.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <BookCta heading="Not sure which service you need?" />
    </>
  );
}
