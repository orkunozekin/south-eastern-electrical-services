import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "Terms for using the Southeastern Electrical Services website and requesting electrical services.",
};

export default function TermsPage() {
  return (
    <>
      <section className="bg-navy px-5 pt-28 pb-16 md:px-8 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
            Terms and conditions
          </h1>
          <p className="text-mist/80 mt-4 text-base">
            Last updated October 28, 2026
          </p>
        </div>
      </section>

      <section className="bg-paper px-5 py-16 md:px-8 md:py-24">
        <div className="text-slate mx-auto max-w-4xl space-y-10 text-base leading-relaxed md:text-lg">
          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Website use
            </h2>
            <p className="mt-4">
              This website provides general information about Southeastern
              Electrical Services and a way to request service. You agree to use
              the website lawfully and not to interfere with its operation or
              submit false, misleading, or unauthorized information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Service requests and appointments
            </h2>
            <p className="mt-4">
              A website submission, automated response, or requested time does
              not by itself create a service contract or guarantee that an
              appointment is available. Appointments and the scope of work are
              final only when confirmed by Southeastern Electrical Services.
              Please call emergency services or the appropriate utility for an
              immediate threat to life, fire, or an active utility emergency.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Estimates and payment
            </h2>
            <p className="mt-4">
              Website content is not a binding estimate. Pricing, schedules,
              materials, and payment terms will be provided or confirmed for the
              specific work. Conditions discovered after work begins may require
              a revised scope or price with your approval.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Text-message terms
            </h2>
            <p className="mt-4">
              If you opt in, Southeastern Electrical Services and its service
              providers may send texts about your request, appointment, and
              related customer care. Message frequency varies. Message and data
              rates may apply. Reply STOP to opt out or HELP for help. Consent
              is not a condition of purchase. Marketing texts require a separate
              optional consent.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Third-party services
            </h2>
            <p className="mt-4">
              The website may rely on or link to third-party services. Their
              availability and practices are governed by their own terms and
              policies. We are not responsible for third-party websites that we
              do not control.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Disclaimers and limitation
            </h2>
            <p className="mt-4">
              The website is provided on an “as available” basis. To the fullest
              extent allowed by law, Southeastern Electrical Services disclaims
              warranties relating to the website and is not liable for indirect,
              incidental, special, or consequential damages arising from website
              use. Nothing in these terms limits rights or liabilities that
              cannot legally be limited.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Changes to these terms
            </h2>
            <p className="mt-4">
              We may update these terms from time to time. The revised terms
              take effect when posted with a new last-updated date. Continued
              use of the website after an update means you accept the revised
              terms.
            </p>
          </section>

          <section className="border-amber border-l-4 pl-5">
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Contact us
            </h2>
            <p className="mt-4">
              Questions about these terms can be submitted through our{" "}
              <Link
                href="/contact"
                className="text-navy decoration-amber font-semibold underline decoration-2 underline-offset-4"
              >
                contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </section>
    </>
  );
}
