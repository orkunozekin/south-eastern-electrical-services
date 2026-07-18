"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { saveAdminSettingsAction } from "@/app/actions/admin";
import type { BookingSettings } from "@/lib/booking";
import { TIMEZONE_OPTIONS, friendlyTimezoneLabel } from "@/lib/timezone";

type AdminSettingsFormProps = {
  settings: BookingSettings;
};

export function AdminSettingsForm({ settings }: AdminSettingsFormProps) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(settings.timezone);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(
    String(settings.slotDurationMinutes),
  );
  const [notifyEmails, setNotifyEmails] = useState(
    settings.notifyEmails.join("\n"),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const emails = notifyEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await saveAdminSettingsAction({
        timezone,
        slotDurationMinutes: Number(slotDurationMinutes),
        notifyEmails: emails,
        weeklyHours: settings.weeklyHours,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("Settings saved.");
      router.refresh();
    });
  }

  const knownValues = new Set<string>(TIMEZONE_OPTIONS.map((opt) => opt.value));
  const hasCustomTimezone = !knownValues.has(timezone);

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <label className="block">
        <span className="text-navy text-sm font-medium">Business timezone</span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none"
        >
          {hasCustomTimezone && (
            <option value={timezone}>{friendlyTimezoneLabel(timezone)}</option>
          )}
          {TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.name} ({opt.abbrev})
            </option>
          ))}
        </select>
        <span className="text-slate mt-2 block text-sm">
          Availability hours and email notifications use this timezone.
        </span>
      </label>

      <label className="block">
        <span className="text-navy text-sm font-medium">
          Slot duration (minutes)
        </span>
        <input
          type="number"
          min={15}
          max={120}
          step={15}
          value={slotDurationMinutes}
          onChange={(e) => setSlotDurationMinutes(e.target.value)}
          className="border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-navy text-sm font-medium">
          Notify emails (one per line)
        </span>
        <textarea
          rows={4}
          value={notifyEmails}
          onChange={(e) => setNotifyEmails(e.target.value)}
          placeholder="owner@example.com"
          className="border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none"
        />
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-navy text-sm">{message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-navy hover:bg-charcoal px-6 py-3 text-sm font-semibold tracking-wide text-white transition disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
