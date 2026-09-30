export type CalendarInviteInput = {
  uid: string;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description: string;
  location: string;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
  /** `CANCEL` removes the event with the same `uid` from the calendar. */
  method?: "REQUEST" | "CANCEL";
  /** Must be higher than the original invite's for a `CANCEL` to apply. */
  sequence?: number;
};

const FALLBACK_UID_DOMAIN = "southeastern-electrical.invalid";

/**
 * Only call this when a booking is created. Later emails must reuse the
 * stored UID, because the sender domain can change after booking.
 */
export function buildInviteUid(
  bookingId: string,
  senderEmail: string | undefined,
): string {
  const domain = senderEmail?.trim().split("@")[1] || FALLBACK_UID_DOMAIN;
  return `booking-${bookingId}@${domain}`;
}

/** `20260928T150000Z` — RFC 5545 UTC date-time. */
function formatUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

function escapeParam(value: string): string {
  return `"${value.replace(/[\r\n]/g, " ").replaceAll('"', "'")}"`;
}

/** RFC 5545 caps content lines at 75 octets; continuations start with a space. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = chunks.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  chunks.push(current);

  return chunks.join("\r\n ");
}

export function buildCalendarInvite(input: CalendarInviteInput): string {
  const { organizer, attendee } = input;
  const method = input.method ?? "REQUEST";
  const cancel = method === "CANCEL";
  const sequence = input.sequence ?? (cancel ? 1 : 0);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Southeastern Electrical Services//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(input.startsAt)}`,
    `DTEND:${formatUtc(input.endsAt)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    `LOCATION:${escapeText(input.location)}`,
    `ORGANIZER;CN=${escapeParam(organizer.name)}:mailto:${organizer.email}`,
    `ATTENDEE;CN=${escapeParam(attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${attendee.email}`,
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`,
    `SEQUENCE:${sequence}`,
    "TRANSP:OPAQUE",
    ...(cancel
      ? []
      : [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          "DESCRIPTION:Southeastern Electrical callback",
          "TRIGGER:-PT15M",
          "END:VALARM",
        ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
