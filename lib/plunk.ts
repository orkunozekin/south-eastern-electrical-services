import type { Booking } from "@/lib/booking";

const PLUNK_SEND_URL = "https://next-api.useplunk.com/v1/send";

/** Ready to hit Plunk’s API (from address still needed for real delivery). */
export function isPlunkConfigured(): boolean {
  return Boolean(process.env.PLUNK_API_KEY && process.env.BOOKING_NOTIFY_EMAIL);
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveRecipients(notifyEmails?: string[]): string[] {
  const fromSettings = (notifyEmails ?? [])
    .map((e) => e.trim())
    .filter(Boolean);
  const fromEnv = (process.env.BOOKING_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return [...new Set([...fromSettings, ...fromEnv])];
}

function shouldLogToConsole(): boolean {
  if (process.env.BOOKING_NOTIFY_CONSOLE === "true") return true;
  if (process.env.BOOKING_NOTIFY_CONSOLE === "false") return false;
  // next dev / non-production builds
  return process.env.NODE_ENV !== "production";
}

function canSendViaPlunk(
  apiKey: string | undefined,
  fromEmail: string | undefined,
  recipients: string[],
): apiKey is string {
  return Boolean(apiKey && fromEmail && recipients.length > 0);
}

function logBookingNotification(options: {
  to: string[];
  subject: string;
  booking: Booking;
  whenLabel: string;
  reason: string;
}): void {
  const { to, subject, booking, whenLabel, reason } = options;
  // stderr is more reliable than console.log for Next.js server actions
  const lines = [
    "",
    "========== Booking notification (console) ==========",
    `Reason:  ${reason}`,
    `To:      ${to.length ? to.join(", ") : "(none set)"}`,
    `Subject: ${subject}`,
    `Name:    ${booking.name}`,
    `Phone:   ${formatPhone(booking.phone)}`,
    `When:    ${whenLabel}`,
    `ID:      ${booking.id}`,
    "====================================================",
    "",
  ];
  process.stderr.write(`${lines.join("\n")}\n`);
}

export type BookingNotificationInput = {
  booking: Booking;
  /** Human-readable time already formatted in business timezone. */
  whenLabel: string;
  notifyEmails?: string[];
};

export type BookingNotificationResult = "sent" | "skipped" | "logged";

/**
 * Notifies the business inbox of a new callback booking.
 *
 * In development, always prints to the **server** terminal (where `npm run
 * dev` runs), not the browser console. Force with `BOOKING_NOTIFY_CONSOLE=true`.
 */
export async function sendBookingNotification(
  input: BookingNotificationInput,
): Promise<BookingNotificationResult> {
  const apiKey = process.env.PLUNK_API_KEY;
  const fromEmail = process.env.PLUNK_FROM_EMAIL?.trim();
  const recipients = resolveRecipients(input.notifyEmails);
  const { booking, whenLabel } = input;
  const subject = `New callback booking: ${booking.name} · ${whenLabel}`;

  const logToConsole = shouldLogToConsole();
  if (logToConsole) {
    logBookingNotification({
      to: recipients,
      subject,
      booking,
      whenLabel,
      reason:
        process.env.BOOKING_NOTIFY_CONSOLE === "true"
          ? "BOOKING_NOTIFY_CONSOLE=true"
          : "development / non-production (server terminal)",
    });
  }

  if (!canSendViaPlunk(apiKey, fromEmail, recipients)) {
    if (logToConsole) return "logged";

    console.warn(
      "[plunk] Skipping booking notification. Need PLUNK_API_KEY, PLUNK_FROM_EMAIL (verified domain), and BOOKING_NOTIFY_EMAIL.",
    );
    return "skipped";
  }

  const body = `
    <h2>New callback booking</h2>
    <p><strong>Name:</strong> ${escapeHtml(booking.name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(formatPhone(booking.phone))}</p>
    <p><strong>When:</strong> ${escapeHtml(whenLabel)}</p>
    <p><strong>Booking ID:</strong> ${escapeHtml(booking.id)}</p>
  `;

  const response = await fetch(PLUNK_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `booking-${booking.id}`,
    },
    body: JSON.stringify({
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject,
      body,
      subscribed: false,
      from: {
        name: "Southeastern Electrical Services",
        email: fromEmail,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Plunk send failed (${response.status}): ${detail || response.statusText}`,
    );
  }

  return logToConsole ? "logged" : "sent";
}
