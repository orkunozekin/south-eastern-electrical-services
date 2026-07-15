import Link from "next/link";

type BookCtaProps = {
  heading?: string;
  body?: string;
};

export function BookCta({
  heading = "Ready to talk through your project?",
  body = "Pick a time that works. We’ll call you — no account required.",
}: BookCtaProps) {
  return (
    <section className="bg-navy relative overflow-hidden px-5 py-20 md:px-8 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 80% 20%, color-mix(in srgb, var(--amber) 35%, transparent), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl">
        <h2 className="font-display max-w-xl text-4xl font-semibold tracking-tight text-white uppercase md:text-5xl">
          {heading}
        </h2>
        <p className="text-mist/80 mt-4 max-w-lg text-lg leading-relaxed">
          {body}
        </p>
        <Link
          href="/book"
          className="bg-amber text-navy-deep hover:bg-amber-hot mt-8 inline-flex px-6 py-3 text-base font-semibold tracking-wide transition"
        >
          Book a callback
        </Link>
      </div>
    </section>
  );
}
