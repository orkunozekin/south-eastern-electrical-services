import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Southeastern Electrical Services collects, uses, and protects information submitted through its website.",
};

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-navy px-5 pt-28 pb-16 md:px-8 md:pt-36 md:pb-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white uppercase md:text-6xl">
            Privacy policy
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
              Information we collect
            </h2>
            <p className="mt-4">
              When you contact us or request service, we may collect your name,
              phone number, email address, service address, appointment
              preferences, and details about the electrical work you need. We
              may also collect basic technical information such as your browser,
              device, IP address, referring page, and pages visited.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              How we use information
            </h2>
            <p className="mt-4">
              We use information to respond to requests, coordinate and confirm
              appointments, provide estimates and services, send service-related
              communications, maintain our records, protect the website, and
              improve our customer experience.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Text messages
            </h2>
            <p className="mt-4">
              If you choose to receive text messages, we may send appointment
              reminders and messages about your service request. Message
              frequency varies. Message and data rates may apply. Reply STOP to
              opt out or HELP for help. Consent to receive texts is not a
              condition of purchasing services. Marketing messages require a
              separate optional consent.
            </p>
            <p className="mt-4">
              We do not sell or share mobile numbers or text-message opt-in data
              with third parties for their own marketing or promotional use.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Service providers
            </h2>
            <p className="mt-4">
              We use service providers to operate the website, manage customer
              requests and appointments, and deliver communications. These may
              include UpSmith, ServiceTitan, Firebase, Plunk, and our website
              hosting provider. They may process information only as needed to
              provide services to us or as required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Retention and security
            </h2>
            <p className="mt-4">
              We retain information for as long as reasonably necessary to
              provide services, maintain business and legal records, resolve
              disputes, and enforce agreements. We use reasonable safeguards,
              but no online service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Your choices
            </h2>
            <p className="mt-4">
              You may ask us to correct or delete information you provided,
              subject to legal and operational requirements. You can unsubscribe
              from emails using the instructions in the message and opt out of
              texts by replying STOP.
            </p>
          </section>

          <section>
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Children and policy updates
            </h2>
            <p className="mt-4">
              This website is not directed to children under 13. We may update
              this policy from time to time and will post the revised date on
              this page.
            </p>
          </section>

          <section className="border-amber border-l-4 pl-5">
            <h2 className="font-display text-navy text-2xl font-semibold tracking-tight uppercase md:text-3xl">
              Contact us
            </h2>
            <p className="mt-4">
              Questions or privacy requests can be submitted through our{" "}
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
