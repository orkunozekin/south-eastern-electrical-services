import type { Metadata } from "next";

import { getBookingPageData } from "@/app/(site)/book/data";
import { BookingWizard } from "@/components/booking-wizard";

export const metadata: Metadata = {
  title: "Book a callback",
  description: "Schedule a phone call with Southeastern Electrical Services.",
};

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const { ref } = await searchParams;
  const rescheduling = ref === "cancelled";
  const { dates, timezone, configured } = getBookingPageData();

  return (
    <section className="bg-navy px-5 pt-28 pb-20 md:px-8 md:pt-36 md:pb-28">
      <div className="mx-auto max-w-6xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
          {rescheduling ? "Pick a new time" : "Book a callback"}
        </h1>
        <p className="text-mist/85 mt-4 max-w-lg text-lg leading-relaxed">
          {rescheduling
            ? "Sorry we had to cancel. Pick a new time below and we’ll call you then."
            : "Pick a day and time. Leave your name and number. We’ll call you."}
        </p>

        <div className="mt-12 max-w-3xl">
          <BookingWizard
            dates={dates}
            timezone={timezone}
            configured={configured}
          />
        </div>
      </div>
    </section>
  );
}
