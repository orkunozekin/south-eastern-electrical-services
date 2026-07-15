import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a callback",
  description: "Schedule a phone call with South Eastern Electrical Services.",
};

/** Placeholder until the booking calendar UI ships. */
export default function BookPage() {
  return (
    <section className="bg-navy px-5 pt-28 pb-20 md:px-8 md:pt-36 md:pb-28">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
          Book a callback
        </h1>
        <p className="text-mist/85 mt-4 max-w-lg text-lg leading-relaxed">
          The scheduling calendar is next. You’ll pick a time, leave your name
          and phone number, and we’ll call you.
        </p>
      </div>
    </section>
  );
}
