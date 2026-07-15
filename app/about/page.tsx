import type { Metadata } from "next";
import Image from "next/image";

import { BookCta } from "@/components/book-cta";

export const metadata: Metadata = {
  title: "About",
  description:
    "About South Eastern Electrical Services — licensed electricians serving the Southeast.",
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
            South Eastern Electrical Services is built on clear communication
            and workmanship you can trust.
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
          <div>
            <h2 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase">
              How we work
            </h2>
            <p className="text-slate mt-4 text-lg leading-relaxed">
              Every job starts with a scheduled phone call. We learn what you
              need, answer questions, and outline next steps before we set foot
              on site.
            </p>
            <p className="text-slate mt-4 text-lg leading-relaxed">
              Whether it’s a repair, remodel, or a commercial upgrade, we keep
              the process straightforward — so you know what to expect and when.
            </p>
          </div>
        </div>
      </section>

      <BookCta heading="Let’s talk through your project" />
    </>
  );
}
