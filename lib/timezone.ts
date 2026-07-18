import { formatInTimeZone } from "date-fns-tz";

/** Common US zones offered in admin settings. */
export const TIMEZONE_OPTIONS = [
  {
    value: "America/New_York",
    abbrev: "ET",
    name: "Eastern Time",
  },
  {
    value: "America/Chicago",
    abbrev: "CT",
    name: "Central Time",
  },
  {
    value: "America/Denver",
    abbrev: "MT",
    name: "Mountain Time",
  },
  {
    value: "America/Phoenix",
    abbrev: "AZ",
    name: "Arizona Time",
  },
  {
    value: "America/Los_Angeles",
    abbrev: "PT",
    name: "Pacific Time",
  },
] as const;

const ABBREV_BY_ZONE: Record<string, string> = {
  "America/New_York": "ET",
  "America/Detroit": "ET",
  "America/Kentucky/Louisville": "ET",
  "America/Indiana/Indianapolis": "ET",
  "America/Toronto": "ET",
  "US/Eastern": "ET",
  "America/Chicago": "CT",
  "America/Menominee": "CT",
  "America/Winnipeg": "CT",
  "US/Central": "CT",
  "America/Denver": "MT",
  "America/Boise": "MT",
  "America/Edmonton": "MT",
  "US/Mountain": "MT",
  "America/Phoenix": "AZ",
  "America/Los_Angeles": "PT",
  "America/Vancouver": "PT",
  "US/Pacific": "PT",
  "America/Anchorage": "AKT",
  "US/Alaska": "AKT",
  "Pacific/Honolulu": "HT",
  "US/Hawaii": "HT",
};

/** Short label like ET, CT, MT, PT. Falls back to a compact zone token. */
export function shortTimezoneAbbrev(timeZone: string): string {
  if (ABBREV_BY_ZONE[timeZone]) return ABBREV_BY_ZONE[timeZone];

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    // EDT/EST → ET, CDT/CST → CT, AKDT → AKT, etc.
    const collapsed = raw.replace(/[DS](?=T$)/i, "").toUpperCase();
    if (/^[A-Z]{2,5}$/.test(collapsed)) return collapsed;
  } catch {
    // ignore invalid zones
  }

  const city = timeZone.split("/").pop()?.replace(/_/g, " ");
  return city ?? timeZone;
}

/** e.g. "Eastern Time (ET)" */
export function friendlyTimezoneLabel(timeZone: string): string {
  const known = TIMEZONE_OPTIONS.find((opt) => opt.value === timeZone);
  if (known) return `${known.name} (${known.abbrev})`;
  return `${timeZone} (${shortTimezoneAbbrev(timeZone)})`;
}

export function getViewerTimezone(fallback = "America/New_York"): string {
  if (typeof Intl === "undefined") return fallback;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function formatInZone(
  date: Date | string | number,
  timeZone: string,
  pattern: string,
): string {
  const value =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return formatInTimeZone(value, timeZone, pattern);
}

/** Formats a time and appends a short zone abbrev (ET, CT, …). */
export function formatWithShortZone(
  date: Date | string | number,
  timeZone: string,
  pattern: string,
): string {
  return `${formatInZone(date, timeZone, pattern)} ${shortTimezoneAbbrev(timeZone)}`;
}
