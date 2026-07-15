import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact South Eastern Electrical Services or book a phone callback.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-navy px-5 pt-28 pb-16 md:px-8 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
            Contact
          </h1>
          <p className="text-mist/85 mt-4 max-w-xl text-lg">
            Prefer a call on your schedule? Book a callback and we’ll reach out
            at the time you pick.
          </p>
        </div>
      </section>

      <section className="bg-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase">
            Book a phone call
          </h2>
          <p className="text-slate mt-4 max-w-lg text-lg leading-relaxed">
            Choose a time slot, leave your name and number, and we’ll call you.
            No account needed.
          </p>
          <Link
            href="/book"
            className="bg-navy hover:bg-charcoal mt-8 inline-flex px-6 py-3 text-base font-semibold tracking-wide text-white transition"
          >
            Open the calendar
          </Link>
        </div>
      </section>
    </>
  );
}
