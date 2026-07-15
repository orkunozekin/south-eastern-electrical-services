import type { Booking } from "@/lib/booking";

const PLUNK_SEND_URL = "https://next-api.useplunk.com/v1/send";

export function isPlunkConfigured(): boolean {
  return Boolean(
    process.env.PLUNK_API_KEY &&
    process.env.BOOKING_NOTIFY_EMAIL &&
    process.env.PLUNK_FROM_EMAIL,
  );
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

export type BookingNotificationInput = {
  booking: Booking;
  /** Human-readable time already formatted in business timezone. */
  whenLabel: string;
  notifyEmails?: string[];
};

/**
 * Notifies the business inbox of a new callback booking.
 * Throws on API failure so callers can log — returns skipped if not configured.
 */
export async function sendBookingNotification(
  input: BookingNotificationInput,
): Promise<"sent" | "skipped"> {
  const apiKey = process.env.PLUNK_API_KEY;
  const fromEmail = process.env.PLUNK_FROM_EMAIL;
  const recipients = resolveRecipients(input.notifyEmails);

  if (!apiKey || !fromEmail || recipients.length === 0) {
    console.warn(
      "[plunk] Skipping booking notification — set PLUNK_API_KEY, PLUNK_FROM_EMAIL, and BOOKING_NOTIFY_EMAIL.",
    );
    return "skipped";
  }

  const { booking, whenLabel } = input;
  const subject = `New callback booking — ${booking.name} — ${whenLabel}`;
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
        name: "South Eastern Electrical Services",
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

  return "sent";
}
