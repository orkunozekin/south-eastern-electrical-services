import type { Metadata } from "next";

import { BookCta } from "@/components/book-cta";
import { SERVICES } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Panel upgrades, rewires, generators, surge protection, and more from South Eastern Electrical Services.",
};

export default function ServicesPage() {
  return (
    <>
      <section className="bg-navy px-5 pt-28 pb-16 md:px-8 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
            Services
          </h1>
          <p className="text-mist/85 mt-4 max-w-xl text-lg">
            Safe, reliable electrical work for your home — scoped clearly after
            a phone conversation.
          </p>
        </div>
      </section>

      <section className="bg-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          {SERVICES.map((service) => (
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
