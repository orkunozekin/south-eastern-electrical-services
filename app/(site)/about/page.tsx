import type { Metadata } from "next";
import Image from "next/image";

import { BookCta } from "@/components/book-cta";
import { MISSION, VALUES, VISION } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Mission, vision, and values of South Eastern Electrical Services.",
};

const ABOUT_IMAGE =
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1600&q=80";

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy px-5 pt-28 pb-16 md:px-8 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
            About us
          </h1>
          <p className="text-mist/85 mt-4 max-w-xl text-lg">
            A trusted partner for safe, reliable, and affordable electrical
            work.
          </p>
        </div>
      </section>

      <section className="bg-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <div className="bg-charcoal relative aspect-[4/3] overflow-hidden">
            <Image
              src={ABOUT_IMAGE}
              alt="Electrical conduit and industrial lighting"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="space-y-10">
            <div>
              <h2 className="font-display text-amber text-sm font-semibold tracking-[0.16em] uppercase">
                Mission
              </h2>
              <p className="text-navy mt-3 text-lg leading-relaxed">
                {MISSION}
              </p>
            </div>
            <div>
              <h2 className="font-display text-amber text-sm font-semibold tracking-[0.16em] uppercase">
                Vision
              </h2>
              <p className="text-navy mt-3 text-lg leading-relaxed">{VISION}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-mist px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase md:text-4xl">
            Values
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {VALUES.map((value) => (
              <li
                key={value}
                className="border-amber text-navy border-l-4 pl-4 text-lg font-semibold tracking-tight"
              >
                {value}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paper px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase">
            How we work
          </h2>
          <p className="text-slate mt-4 max-w-2xl text-lg leading-relaxed">
            Every job starts with a scheduled phone call. We learn what you
            need, answer questions, and outline next steps before we set foot on
            site, so you know what to expect.
          </p>
        </div>
      </section>

      <BookCta heading="Let’s talk through your project" />
    </>
  );
}
