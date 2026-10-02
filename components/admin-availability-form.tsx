"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  deleteOverrideAction,
  previewOverrideAction,
  previewWeeklyHoursAction,
  type AdminBookingDto,
  type ConflictResolution,
  type OverrideCancellationResult,
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
import { AdminConflictPanel } from "@/components/admin-conflict-panel";
import { cancellationNoticeLabel } from "@/lib/booking/notice-label";
import { friendlyTimezoneLabel } from "@/lib/timezone";

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
  const [hoursConflicts, setHoursConflicts] = useState<
    AdminBookingDto[] | null
  >(null);
  const [overrideConflicts, setOverrideConflicts] = useState<
    AdminBookingDto[] | null
  >(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelResults, setCancelResults] = useState<
    OverrideCancellationResult[]
  >([]);
  const [pending, startTransition] = useTransition();

  function updateDay(index: number, patch: Partial<DayHoursDraft>) {
    setHoursConflicts(null);
    setDraft((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function commitHours(keepConflicts = false) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const hours = draftToWeeklyHours(draft);
      if (!keepConflicts) {
        const preview = await previewWeeklyHoursAction(hours);
        if (!preview.ok) {
          setError(preview.error);
          return;
        }
        if (preview.conflicts.length) {
          setHoursConflicts(preview.conflicts);
          return;
        }
      }
      const result = await saveWeeklyHoursAction(hours, { keepConflicts });
      if (!result.ok) {
        setError(result.error);
        if (result.conflicts) setHoursConflicts(result.conflicts);
        return;
      }
      setHoursConflicts(null);
      setMessage("Weekly hours saved.");
      router.refresh();
    });
  }
  function saveHours(event: FormEvent) {
    event.preventDefault();
    commitHours();
  }

  function commitOverride(resolution?: ConflictResolution) {
    setMessage(null);
    setError(null);
    setCancelResults([]);
    const input = {
      date,
      closed,
      blockedSlots: closed
        ? []
        : blockedSlots
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean),
    };
    startTransition(async () => {
      if (!resolution) {
        const preview = await previewOverrideAction(input);
        if (!preview.ok) {
          setError(preview.error);
          return;
        }
        if (preview.conflicts.length) {
          setOverrideConflicts(preview.conflicts);
          return;
        }
      }
      const result = await saveOverrideAction({
        ...input,
        conflictResolution: resolution ?? "keep",
        message: cancelMessage,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const cancelled = result.results.filter((r) => r.ok).length;
      const emailed = result.results.filter(
        (r) => r.ok && r.result.notice === "sent",
      ).length;
      setMessage(
        `Override saved. ${cancelled} bookings cancelled; ${emailed} customers emailed.${result.keptConflicts.length ? ` ${result.keptConflicts.length} affected bookings were kept. Review them on the Bookings page.` : ""}`,
      );
      setCancelResults(result.results);
      setOverrideConflicts(null);
      setDate("");
      setBlockedSlots("");
      setClosed(true);
      setCancelMessage("");
      router.refresh();
    });
  }
  function saveOverride(event: FormEvent) {
    event.preventDefault();
    commitOverride();
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

      {cancelResults.length > 0 && (
        <ul className="text-slate space-y-2 text-sm" role="status">
          {cancelResults.map((row) => (
            <li key={row.id}>
              {row.name} · {row.phoneDisplay}:{" "}
              {row.ok
                ? `Cancelled. ${cancellationNoticeLabel(row.result)}`
                : `Could not cancel. ${row.error} Review this booking.`}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={saveHours} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">
          <h2 className="font-display text-navy text-xl font-semibold tracking-tight uppercase">
            Weekly hours
          </h2>
          <p className="text-slate text-sm">
            Times are local to {friendlyTimezoneLabel(settings.timezone)}.
          </p>
          <ul className="space-y-3">
            {draft.map((row, index) => (
              <li
                key={row.day}
                className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[7rem_auto_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <label className="text-navy col-span-3 flex items-center gap-2 text-sm font-medium sm:col-span-1">
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
                  aria-label={`${dayLabel(row.day)} start time`}
                  value={row.start}
                  onChange={(e) => updateDay(index, { start: e.target.value })}
                  className="border-navy/20 w-full min-w-0 border bg-white px-2 py-2 disabled:opacity-40"
                />
                <input
                  type="time"
                  disabled={!row.enabled}
                  aria-label={`${dayLabel(row.day)} end time`}
                  value={row.end}
                  onChange={(e) => updateDay(index, { end: e.target.value })}
                  className="border-navy/20 w-full min-w-0 border bg-white px-2 py-2 disabled:opacity-40"
                />
              </li>
            ))}
          </ul>
        </fieldset>
        {hoursConflicts && (
          <AdminConflictPanel bookings={hoursConflicts}>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => commitHours(true)}
                className="bg-navy px-4 py-2 text-sm text-white"
              >
                Save anyway
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setHoursConflicts(null)}
                className="text-navy border px-4 py-2 text-sm"
              >
                Go back
              </button>
            </div>
          </AdminConflictPanel>
        )}
        <button
          type="submit"
          disabled={pending || !!hoursConflicts}
          className="bg-navy hover:bg-charcoal px-6 py-3 text-sm font-semibold tracking-wide text-white transition disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save weekly hours"}
        </button>
      </form>

      <form onSubmit={saveOverride} className="max-w-xl space-y-4">
        <fieldset disabled={pending} className="space-y-4">
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
              onChange={(e) => {
                setDate(e.target.value);
                setOverrideConflicts(null);
              }}
              className="border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none"
            />
          </label>
          <label className="text-navy flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={closed}
              onChange={(e) => {
                setClosed(e.target.checked);
                setOverrideConflicts(null);
              }}
            />
            Closed all day
          </label>
          <label className="block">
            <span className="text-navy text-sm font-medium">
              Blocked slots (optional, e.g. 09:00 10:30)
            </span>
            <input
              value={blockedSlots}
              onChange={(e) => {
                setBlockedSlots(e.target.value);
                setOverrideConflicts(null);
              }}
              disabled={closed}
              placeholder="09:00, 14:00"
              className="border-navy/20 focus:border-amber mt-2 w-full border bg-white px-4 py-3 outline-none disabled:opacity-40"
            />
          </label>
        </fieldset>
        {overrideConflicts && (
          <AdminConflictPanel bookings={overrideConflicts}>
            <label className="text-navy block text-sm">
              Optional message to customers
              <textarea
                maxLength={500}
                rows={3}
                value={cancelMessage}
                disabled={pending}
                onChange={(e) => setCancelMessage(e.target.value)}
                className="border-navy/20 mt-2 w-full border bg-white p-3"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => commitOverride("cancel-and-notify")}
                className="bg-navy px-4 py-2 text-sm text-white"
              >
                Cancel them & email customers
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => commitOverride("cancel")}
                className="text-navy border px-4 py-2 text-sm"
              >
                Cancel them without emailing
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => commitOverride("keep")}
                className="text-navy border px-4 py-2 text-sm"
              >
                Keep the bookings
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOverrideConflicts(null)}
                className="text-navy px-4 py-2 text-sm underline"
              >
                Go back
              </button>
            </div>
          </AdminConflictPanel>
        )}
        <button
          type="submit"
          disabled={pending || !!overrideConflicts}
          className="bg-navy hover:bg-charcoal px-6 py-3 text-sm font-semibold tracking-wide text-white transition disabled:opacity-60"
        >
          {pending ? "Checking and saving…" : "Save override"}
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
