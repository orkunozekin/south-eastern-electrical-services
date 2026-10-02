"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { saveAdminSettingsAction } from "@/app/actions/admin";
import { bookingWindowEnd, type BookingSettings } from "@/lib/booking";
import {
  formatInZone,
  TIMEZONE_OPTIONS,
  friendlyTimezoneLabel,
} from "@/lib/timezone";

const noticeOptions = [
  [0, "No minimum"],
  [30, "30 minutes"],
  [60, "1 hour"],
  [120, "2 hours"],
  [240, "4 hours"],
  [1440, "Next day / 24 hours"],
] as const;
const fieldClass =
  "border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none";
const buttonClass =
  "bg-navy hover:bg-charcoal px-6 py-3 text-sm font-semibold tracking-wide text-white transition disabled:opacity-60";

export function AdminSettingsForm({
  settings,
  bootstrapRecipients = [],
  upcomingBookings = 0,
}: {
  settings: BookingSettings;
  bootstrapRecipients?: string[];
  upcomingBookings?: number;
}) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(settings.timezone);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(
    String(settings.slotDurationMinutes),
  );
  const [minNoticeMinutes, setMinNoticeMinutes] = useState(
    String(settings.minNoticeMinutes),
  );
  const [bookingWindowDays, setBookingWindowDays] = useState(
    String(settings.bookingWindowDays),
  );
  const [notifyEmails, setNotifyEmails] = useState(
    settings.notifyEmails.join("\n"),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = {
    timezone,
    slotDurationMinutes: Number(slotDurationMinutes),
    minNoticeMinutes: Number(minNoticeMinutes),
    bookingWindowDays: Number(bookingWindowDays),
    notifyEmails: notifyEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean),
  };
  const validWindow =
    Number.isInteger(input.bookingWindowDays) &&
    input.bookingWindowDays >= 1 &&
    input.bookingWindowDays <= 90;
  const through = validWindow
    ? formatInZone(
        `${bookingWindowEnd({ ...settings, ...input })}T12:00:00Z`,
        "UTC",
        "EEE, MMM d",
      )
    : null;
  function edit(change: () => void) {
    change();
    setMessage(null);
    setError(null);
  }
  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveAdminSettingsAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Settings saved.");
      router.refresh();
    });
  }
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    save();
  }
  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
        <label className="block">
          <span className="text-navy text-sm font-medium">
            Business timezone
          </span>
          <select
            value={timezone}
            onChange={(e) => edit(() => setTimezone(e.target.value))}
            className={fieldClass}
          >
            {!TIMEZONE_OPTIONS.some((opt) => opt.value === timezone) && (
              <option value={timezone}>
                {friendlyTimezoneLabel(timezone)}
              </option>
            )}
            {TIMEZONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.name} ({opt.abbrev})
              </option>
            ))}
          </select>
          <span className="text-slate mt-2 block text-sm">
            Availability hours and business email notifications use this
            timezone. Existing bookings keep their original appointment times.
          </span>
        </label>
        <label className="block">
          <span className="text-navy text-sm font-medium">
            Slot duration (minutes)
          </span>
          <input
            type="number"
            required
            min={15}
            max={120}
            step={1}
            value={slotDurationMinutes}
            onChange={(e) => edit(() => setSlotDurationMinutes(e.target.value))}
            className={fieldClass}
          />
        </label>
        {upcomingBookings > 0 &&
          Number(slotDurationMinutes) !== settings.slotDurationMinutes && (
            <p className="text-slate text-sm">
              You have {upcomingBookings} upcoming bookings. They’ll keep their
              original length; new bookings use the new slot length.
            </p>
          )}
        <label className="block">
          <span className="text-navy text-sm font-medium">
            Minimum booking notice
          </span>
          <select
            value={minNoticeMinutes}
            onChange={(e) => edit(() => setMinNoticeMinutes(e.target.value))}
            className={fieldClass}
          >
            {!noticeOptions.some(
              ([value]) => value === Number(minNoticeMinutes),
            ) && (
              <option value={minNoticeMinutes}>
                {minNoticeMinutes} minutes
              </option>
            )}
            {noticeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-slate mt-2 block text-sm">
            Only times more than this far ahead are offered. Existing bookings
            are kept.
          </span>
        </label>
        <div>
          <label
            htmlFor="booking-window"
            className="text-navy text-sm font-medium"
          >
            How far ahead customers can book
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              [7, "1 week"],
              [14, "2 weeks"],
              [30, "1 month"],
              [60, "2 months"],
              [90, "3 months"],
            ].map(([days, label]) => (
              <button
                type="button"
                key={days}
                aria-pressed={Number(bookingWindowDays) === days}
                onClick={() => edit(() => setBookingWindowDays(String(days)))}
                className={`border px-3 py-2 text-sm ${Number(bookingWindowDays) === days ? "bg-navy text-white" : "border-navy/20 text-navy"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            id="booking-window"
            aria-label="Custom booking window in days"
            required
            type="number"
            min={1}
            max={90}
            value={bookingWindowDays}
            onChange={(e) => edit(() => setBookingWindowDays(e.target.value))}
            className={fieldClass}
          />
          <p className="text-slate mt-2 text-sm">
            {through
              ? `Customers can book across ${bookingWindowDays} calendar days, including today, through ${through}.`
              : "Choose between 1 and 90 days."}{" "}
            Set holiday and vacation overrides for the entire window.
          </p>
          {Number(bookingWindowDays) < settings.bookingWindowDays && (
            <p className="text-slate mt-2 text-sm">
              Existing bookings after this date are kept.
            </p>
          )}
        </div>
        <label className="block">
          <span className="text-navy text-sm font-medium">
            Notify emails (one per line)
          </span>
          {settings.notifyEmails.length === 0 && (
            <span className="text-slate mt-2 block text-sm">
              {bootstrapRecipients.length
                ? `No addresses yet. Until you add one, booking notifications go to the bootstrap address (${bootstrapRecipients.join(", ")}).`
                : "No notification addresses yet. Add at least one so the business receives booking emails."}
            </span>
          )}
          <textarea
            required
            rows={4}
            value={notifyEmails}
            onChange={(e) => edit(() => setNotifyEmails(e.target.value))}
            placeholder="owner@example.com"
            className={fieldClass}
          />
          <span className="text-slate mt-2 block text-sm">
            After you save an address, only the addresses here receive booking
            notifications. At least one address is required.
          </span>
        </label>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-navy text-sm">
          {message}
        </p>
      )}
      {
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Checking and saving…" : "Save settings"}
        </button>
      }
    </form>
  );
}
