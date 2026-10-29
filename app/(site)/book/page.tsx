import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Book or get an estimate",
  description:
    "Tell Southeastern Electrical Services what you need and coordinate the next step by text.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const cancelled = (await searchParams).ref === "cancelled";

  return (
    <section className="bg-navy min-h-[75svh] px-5 pt-28 pb-20 md:px-8 md:pt-36 md:pb-28">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
          Book or get an estimate
        </h1>
        <p className="text-mist/85 mt-4 max-w-lg text-lg leading-relaxed">
          {cancelled
            ? "Sorry we had to cancel. Tell us what you need and we’ll help coordinate a new time."
            : "Tell us about your project. We can follow up by text and help coordinate the next step."}
        </p>

        <div className="border-amber mt-12 max-w-2xl border-l-4 bg-white/5 p-6 md:p-8">
          <p className="font-display text-amber text-sm font-semibold tracking-[0.16em] uppercase">
            Start here
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white uppercase md:text-4xl">
            Open the request form
          </h2>
          <p className="text-mist/85 mt-4 text-lg leading-relaxed">
            Use the <strong>Book or get an estimate</strong> button in the
            lower-right corner. Share your name and mobile number, choose what
            you need, and opt in if you want us to text you about your request.
          </p>
          <p className="text-mist/70 mt-4 text-base leading-relaxed">
            No account is required. Standard message and data rates may apply,
            and you can reply STOP to opt out.
          </p>
          <p className="text-mist/70 mt-6 border-t border-white/10 pt-6 text-sm leading-relaxed">
            If the request button does not appear, you can still{" "}
            <Link
              href={
                cancelled ? "/book/callback?ref=cancelled" : "/book/callback"
              }
              className="text-amber hover:text-amber-hot font-semibold underline underline-offset-4"
            >
              book a callback directly
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
