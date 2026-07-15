"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  deleteOverrideAction,
  saveOverrideAction,
  saveWeeklyHoursAction,
} from "@/app/actions/admin";
import {
  dayLabel,
  draftToWeeklyHours,
  weeklyHoursToDraft,
  type AvailabilityOverride,
  type BookingSettings,
  type DayHoursDraft,
} from "@/lib/booking";

type AdminAvailabilityFormProps = {
  settings: BookingSettings;
  overrides: AvailabilityOverride[];
};

export function AdminAvailabilityForm({
  settings,
  overrides,
}: AdminAvailabilityFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<DayHoursDraft[]>(
    weeklyHoursToDraft(settings.weeklyHours),
  );
  const [date, setDate] = useState("");
  const [closed, setClosed] = useState(true);
  const [blockedSlots, setBlockedSlots] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateDay(index: number, patch: Partial<DayHoursDraft>) {
    setDraft((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function saveHours(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveWeeklyHoursAction(draftToWeeklyHours(draft));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Weekly hours saved.");
      router.refresh();
    });
  }

  function saveOverride(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const slots = blockedSlots
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await saveOverrideAction({
        date,
        closed,
        blockedSlots: slots,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Override saved.");
      setDate("");
      setBlockedSlots("");
      setClosed(true);
      router.refresh();
    });
  }

  function removeOverride(overrideDate: string) {
    if (!confirm(`Remove override for ${overrideDate}?`)) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await deleteOverrideAction(overrideDate);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Override removed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-12">
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-navy text-sm">{message}</p>}

      <form onSubmit={saveHours} className="space-y-4">
        <h2 className="font-display text-navy text-xl font-semibold tracking-tight uppercase">
          Weekly hours
        </h2>
        <p className="text-slate text-sm">
          Times are local to {settings.timezone}.
        </p>
        <ul className="space-y-3">
          {draft.map((row, index) => (
            <li
              key={row.day}
              className="grid grid-cols-[7rem_auto_1fr_1fr] items-center gap-3"
            >
              <label className="text-navy flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) =>
                    updateDay(index, { enabled: e.target.checked })
                  }
                />
                {dayLabel(row.day)}
              </label>
              <span className="text-slate text-xs">from</span>
              <input
                type="time"
                disabled={!row.enabled}
                value={row.start}
                onChange={(e) => updateDay(index, { start: e.target.value })}
                className="border-navy/20 border bg-white px-2 py-2 disabled:opacity-40"
              />
              <input
                type="time"
                disabled={!row.enabled}
                value={row.end}
                onChange={(e) => updateDay(index, { end: e.target.value })}
                className="border-navy/20 border bg-white px-2 py-2 disabled:opacity-40"
              />
            </li>
          ))}
        </ul>
        <button
          type="submit"
          disabled={pending}
          className="bg-navy hover:bg-charcoal px-6 py-3 text-sm font-semibold tracking-wide text-white transition disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save weekly hours"}
        </button>
      </form>

      <form onSubmit={saveOverride} className="max-w-xl space-y-4">
        <h2 className="font-display text-navy text-xl font-semibold tracking-tight uppercase">
          Date override
        </h2>
        <p className="text-slate text-sm">
          Close a day entirely, or block specific slot starts (HH:mm).
        </p>
        <label className="block">
          <span className="text-navy text-sm font-medium">Date</span>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none"
          />
        </label>
        <label className="text-navy flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => setClosed(e.target.checked)}
          />
          Closed all day
        </label>
        <label className="block">
          <span className="text-navy text-sm font-medium">
            Blocked slots (optional, e.g. 09:00 10:30)
          </span>
          <input
            value={blockedSlots}
            onChange={(e) => setBlockedSlots(e.target.value)}
            disabled={closed}
            placeholder="09:00, 14:00"
            className="border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none disabled:opacity-40"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="bg-navy hover:bg-charcoal px-6 py-3 text-sm font-semibold tracking-wide text-white transition disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save override"}
        </button>
      </form>

      <section>
        <h2 className="font-display text-navy text-xl font-semibold tracking-tight uppercase">
          Current overrides
        </h2>
        {overrides.length === 0 ? (
          <p className="text-slate mt-3">No overrides set.</p>
        ) : (
          <ul className="divide-navy/10 border-navy/10 mt-4 divide-y border-y">
            {overrides.map((override) => (
              <li
                key={override.date}
                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-navy font-semibold">{override.date}</p>
                  <p className="text-slate text-sm">
                    {override.closed
                      ? "Closed"
                      : `Blocked: ${(override.blockedSlots ?? []).join(", ") || "none"}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeOverride(override.date)}
                  disabled={pending}
                  className="border-navy/20 text-navy hover:border-amber hover:bg-amber/10 self-start border px-3 py-2 text-sm font-medium transition disabled:opacity-60"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
