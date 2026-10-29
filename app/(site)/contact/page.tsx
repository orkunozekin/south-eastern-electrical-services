import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Southeastern Electrical Services or request an appointment or estimate.",
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
            Tell us what you need and we’ll help coordinate the next step.
          </p>
        </div>
      </section>

      <section className="bg-paper px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-navy text-3xl font-semibold tracking-tight uppercase">
            Start a request
          </h2>
          <p className="text-slate mt-4 max-w-lg text-lg leading-relaxed">
            Share your name, mobile number, and what you need. We can follow up
            by text and help with an appointment or estimate. No account needed.
          </p>
          <Link
            href="/book"
            className="bg-navy hover:bg-charcoal mt-8 inline-flex px-6 py-3 text-base font-semibold tracking-wide text-white transition"
          >
            Book or get an estimate
          </Link>
          <p className="text-slate mt-5 text-sm leading-relaxed">
            If the request button is unavailable, you can{" "}
            <Link
              href="/book/callback"
              className="text-navy font-semibold underline underline-offset-4"
            >
              book a callback directly
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
