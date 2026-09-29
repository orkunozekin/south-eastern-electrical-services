import type { Booking } from "@/lib/booking";
import { buildCalendarInvite } from "@/lib/calendar-invite";

const PLUNK_SEND_URL = "https://next-api.useplunk.com/v1/send";
const SENDER_NAME = "Southeastern Electrical Services";

type PlunkAttachment = {
  filename: string;
  content: string;
  contentType: string;
};

async function sendViaPlunk(options: {
  apiKey: string;
  fromEmail: string;
  to: string | string[];
  subject: string;
  body: string;
  idempotencyKey: string;
  attachments?: PlunkAttachment[];
}): Promise<void> {
  const response = await fetch(PLUNK_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey,
    },
    body: JSON.stringify({
      to: options.to,
      subject: options.subject,
      body: options.body,
      subscribed: false,
      from: { name: SENDER_NAME, email: options.fromEmail },
      ...(options.attachments ? { attachments: options.attachments } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Plunk send failed (${response.status}): ${detail || response.statusText}`,
    );
  }
}

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
    `Email:   ${booking.email ?? "(not provided)"}`,
    `When:    ${whenLabel}`,
    `ID:      ${booking.id}`,
    "====================================================",
    "",
  ];
  process.stderr.write(`${lines.join("\n")}\n`);
}

export type BookingNotificationInput = {
  booking: Booking;
  /** Human-readable time already formatted for the business timezone. */
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
    ${booking.email ? `<p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>` : ""}
    <p><strong>When:</strong> ${escapeHtml(whenLabel)}</p>
    <p><strong>Booking ID:</strong> ${escapeHtml(booking.id)}</p>
  `;

  await sendViaPlunk({
    apiKey,
    fromEmail: fromEmail!,
    to: recipients.length === 1 ? recipients[0]! : recipients,
    subject,
    body,
    idempotencyKey: `booking-${booking.id}`,
  });

  return logToConsole ? "logged" : "sent";
}

export type BookingConfirmationInput = {
  booking: Booking;
  /** Human-readable time formatted for the customer's timezone. */
  whenLabel: string;
};

/**
 * Emails the customer a confirmation with an `.ics` calendar invite attached.
 * No-op when the booking has no email.
 */
export async function sendBookingConfirmation(
  input: BookingConfirmationInput,
): Promise<BookingNotificationResult> {
  const { booking, whenLabel } = input;
  if (!booking.email) return "skipped";

  const apiKey = process.env.PLUNK_API_KEY;
  const fromEmail = process.env.PLUNK_FROM_EMAIL?.trim();
  const subject = `Your callback is booked · ${whenLabel}`;
  const phone = formatPhone(booking.phone);

  const logToConsole = shouldLogToConsole();
  if (logToConsole) {
    process.stderr.write(
      [
        "",
        "========== Booking confirmation (console) ==========",
        `To:      ${booking.email}`,
        `Subject: ${subject}`,
        `When:    ${whenLabel}`,
        "Attachment: invite.ics",
        "====================================================",
        "",
      ].join("\n") + "\n",
    );
  }

  if (!apiKey || !fromEmail) {
    if (!logToConsole) {
      console.warn(
        "[plunk] Skipping booking confirmation. Need PLUNK_API_KEY and PLUNK_FROM_EMAIL (verified domain).",
      );
    }
    return "skipped";
  }

  const invite = buildCalendarInvite({
    uid: `booking-${booking.id}@${fromEmail.split("@")[1]}`,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    summary: "Callback from Southeastern Electrical Services",
    description: `Southeastern Electrical Services will call you at ${phone}.`,
    location: `Phone call to ${phone}`,
    organizer: { name: SENDER_NAME, email: fromEmail },
    attendee: { name: booking.name, email: booking.email },
  });

  const body = `
    <h2>Your callback is booked</h2>
    <p>Thanks, ${escapeHtml(booking.name)}. We'll call you at <strong>${escapeHtml(phone)}</strong> on <strong>${escapeHtml(whenLabel)}</strong>.</p>
    <p>A calendar invite is attached. Open it to add the call to your calendar.</p>
    <p>— Southeastern Electrical Services</p>
  `;

  await sendViaPlunk({
    apiKey,
    fromEmail,
    to: booking.email,
    subject,
    body,
    idempotencyKey: `booking-confirmation-${booking.id}`,
    attachments: [
      {
        filename: "invite.ics",
        content: Buffer.from(invite, "utf8").toString("base64"),
        contentType: "text/calendar",
      },
    ],
  });

  return logToConsole ? "logged" : "sent";
}
