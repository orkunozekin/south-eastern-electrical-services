export type CalendarInviteInput = {
  uid: string;
  method?: "REQUEST" | "CANCEL";
  sequence?: number;
  startsAt: Date;
  endsAt: Date;
  summary: string;
  description: string;
  location: string;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
};

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
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    `SEQUENCE:${input.sequence ?? (method === "CANCEL" ? 1 : 0)}`,
    "TRANSP:OPAQUE",
    ...(method === "REQUEST"
      ? [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          "DESCRIPTION:Southeastern Electrical callback",
          "TRIGGER:-PT15M",
          "END:VALARM",
        ]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
