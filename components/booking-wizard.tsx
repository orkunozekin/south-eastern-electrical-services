"use client";

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import {
  fetchBookingCalendarAction,
  fetchSlotsAction,
  submitBookingAction,
  type BookingDto,
  type SlotDto,
} from "@/app/actions/booking";
import { bookingCalendarWeeks } from "@/lib/booking";
import {
  formatInZone,
  formatWithShortZone,
  shortTimezoneAbbrev,
} from "@/lib/timezone";
import { useViewerTimezone } from "@/lib/use-viewer-timezone";

type BookingWizardProps = {
  dates: string[];
  timezone: string;
  configured: boolean;
};

function formatDateChip(
  date: string,
  businessTimezone: string,
): { weekday: string; day: string } {
  const noon = fromZonedTime(`${date}T12:00:00`, businessTimezone);
  return {
    weekday: formatInTimeZone(noon, businessTimezone, "EEE"),
    day: formatInTimeZone(noon, businessTimezone, "MMM d"),
  };
}

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function slotTimeLabel(startsAt: string, viewerTimezone: string): string {
  return formatInZone(startsAt, viewerTimezone, "h:mm a");
}

function bookingWhenLabel(startsAt: string, viewerTimezone: string): string {
  return formatWithShortZone(startsAt, viewerTimezone, "EEEE, MMM d · h:mm a");
}

export function BookingWizard({
  dates: initialDates,
  timezone: initialTimezone,
  configured,
}: BookingWizardProps) {
  const [calendar, setCalendar] = useState({
    dates: initialDates,
    timezone: initialTimezone,
    bookingWindowDays: 14,
  });
  const [calendarLoaded, setCalendarLoaded] = useState(!configured);
  const { dates, timezone, bookingWindowDays } = calendar;
  const [weekIndex, setWeekIndex] = useState(0);
  const weeks = bookingCalendarWeeks({ timezone, bookingWindowDays });
  const pagedCalendar = bookingWindowDays > 21;
  const visibleDates = pagedCalendar
    ? dates.filter((date) => weeks[weekIndex]?.includes(date))
    : dates;
  const viewerTimezone = useViewerTimezone(timezone);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialDates[0] ?? null,
  );
  const [slotsRequestId, setSlotsRequestId] = useState(0);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingDto | null>(null);
  const [pendingSlots, startSlots] = useTransition();
  const [pendingSubmit, startSubmit] = useTransition();

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;

    fetchBookingCalendarAction().then((result) => {
      if (cancelled) return;

      if (result.ok) {
        setCalendar({
          dates: result.dates,
          timezone: result.timezone,
          bookingWindowDays: result.bookingWindowDays,
        });
        setSelectedDate((current) =>
          current && result.dates.includes(current)
            ? current
            : (result.dates[0] ?? null),
        );
      }
      setCalendarLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  useEffect(() => {
    if (!calendarLoaded || !selectedDate) return;

    let cancelled = false;

    startSlots(async () => {
      const result = await fetchSlotsAction(selectedDate);
      if (cancelled) return;

      if (!result.ok) {
        setSlotsError(result.error);
        setSlots([]);
        return;
      }

      setSlotsError(null);
      setSlots(result.slots);
    });

    return () => {
      cancelled = true;
    };
  }, [calendarLoaded, selectedDate, slotsRequestId]);

  function selectDate(date: string) {
    setSelectedDate(date);
    setSlotsRequestId((id) => id + 1);
    setSelectedSlot(null);
    setSlotsError(null);
    setSlots([]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlot) return;

    setFormError(null);
    startSubmit(async () => {
      const result = await submitBookingAction({
        name,
        phone,
        email: email.trim() || undefined,
        startsAt: selectedSlot.startsAt,
        timezone: viewerTimezone,
      });

      if (!result.ok) {
        setFormError(result.error);
        setSelectedSlot(null);
        setSlotsRequestId((id) => id + 1);
        return;
      }

      setConfirmation(result.booking);
    });
  }

  if (confirmation) {
    return (
      <div className="animate-hero-rise border-amber border-l-4 bg-white/5 p-6 md:p-8">
        <p className="font-display text-amber text-sm font-semibold tracking-[0.16em] uppercase">
          Confirmed
        </p>
        <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white uppercase md:text-4xl">
          We’ll call you
        </h2>
        <p className="text-mist/85 mt-4 text-lg leading-relaxed">
          Thanks, {confirmation.name}. Expect a call at{" "}
          <span className="text-white">
            {bookingWhenLabel(confirmation.startsAt, viewerTimezone)}
          </span>
          .
        </p>
        <p className="text-mist/70 mt-2 text-base">
          Phone on file: {formatPhoneDisplay(confirmation.phone)}
        </p>
        {confirmation.calendarInvite === "sent" && (
          <p className="text-mist/70 mt-2 text-base">
            A calendar invite is on its way to{" "}
            <span className="text-white">{confirmation.email}</span>.
          </p>
        )}
        {confirmation.calendarInvite === "failed" && (
          <p className="text-mist/70 mt-2 text-base">
            Your call is booked, but we couldn’t send the calendar invite to{" "}
            {confirmation.email}. We’ll still call you at the time above.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setConfirmation(null);
            setSelectedSlot(null);
            setName("");
            setPhone("");
            setEmail("");
            setFormError(null);
            setSlotsRequestId((id) => id + 1);
          }}
          className="text-amber hover:text-amber-hot mt-8 cursor-pointer text-sm font-semibold tracking-wide"
        >
          Book another time
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {!configured && (
        <p className="border-amber/70 text-mist/80 border-l-4 bg-white/5 px-4 py-3 text-sm">
          Booking is temporarily unavailable. Please try again later or call us.
        </p>
      )}

      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-white uppercase">
          1. Choose a day
        </h2>
        {!calendarLoaded && (
          <p className="text-mist/70 mt-4 text-sm">Loading days…</p>
        )}
        {calendarLoaded && dates.length === 0 && (
          <p className="text-mist/70 mt-4 text-sm">
            No days are open for booking right now. Please call us instead.
          </p>
        )}
        {calendarLoaded && pagedCalendar && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white">
            <button
              type="button"
              disabled={weekIndex === 0 || pendingSubmit}
              onClick={() => {
                const next = weekIndex - 1;
                setWeekIndex(next);
                const date = dates.find((d) => weeks[next].includes(d));
                setSlots([]);
                setSelectedSlot(null);
                setSelectedDate(null);
                if (date) selectDate(date);
              }}
              className="border border-white/20 px-3 py-2 disabled:opacity-40"
            >
              ← Previous week
            </button>
            <span>
              Week of{" "}
              {weeks[weekIndex]?.[0]
                ? formatDateChip(weeks[weekIndex][0], timezone).day
                : ""}
            </span>
            <button
              type="button"
              disabled={weekIndex >= weeks.length - 1 || pendingSubmit}
              onClick={() => {
                const next = weekIndex + 1;
                setWeekIndex(next);
                const date = dates.find((d) => weeks[next].includes(d));
                setSlots([]);
                setSelectedSlot(null);
                setSelectedDate(null);
                if (date) selectDate(date);
              }}
              className="border border-white/20 px-3 py-2 disabled:opacity-40"
            >
              Next week →
            </button>
            {visibleDates.length === 0 && (
              <p className="text-mist/70">
                No open days this week. Try another week.
              </p>
            )}
          </div>
        )}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {(calendarLoaded ? visibleDates : []).map((date) => {
            const chip = formatDateChip(date, timezone);
            const active = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                disabled={pendingSubmit || !configured}
                aria-pressed={active}
                onClick={() => selectDate(date)}
                className={`min-w-[5.5rem] shrink-0 cursor-pointer px-3 py-3 text-left transition ${
                  active
                    ? "bg-amber text-navy-deep"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                <span className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                  {chip.weekday}
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {chip.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-white uppercase">
          2. Choose a time
        </h2>
        {slots.length > 0 && (
          <p className="text-mist/60 mt-1 text-sm">
            Times shown in {shortTimezoneAbbrev(viewerTimezone)}
          </p>
        )}

        {pendingSlots && (
          <p className="text-mist/70 mt-4 text-sm">Loading available times…</p>
        )}

        {!pendingSlots && slotsError && (
          <p className="text-amber mt-4 text-sm">{slotsError}</p>
        )}

        {calendarLoaded &&
          !pendingSlots &&
          !slotsError &&
          slots.length === 0 &&
          selectedDate && (
            <p className="text-mist/70 mt-4 text-sm">
              No open times on this day. Pick another date.
            </p>
          )}

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {slots.map((slot) => {
            const active = selectedSlot?.slotId === slot.slotId;
            return (
              <button
                key={slot.slotId}
                type="button"
                disabled={pendingSubmit || pendingSlots}
                aria-pressed={active}
                onClick={() => setSelectedSlot(slot)}
                className={`cursor-pointer px-3 py-3 text-sm font-semibold tracking-wide transition ${
                  active
                    ? "bg-amber text-navy-deep scale-[1.03] shadow-[0_0_0_2px_color-mix(in_srgb,var(--amber-hot)_80%,transparent)]"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {slotTimeLabel(slot.startsAt, viewerTimezone)}
              </button>
            );
          })}
        </div>
      </div>

      {selectedSlot && (
        <form
          onSubmit={handleSubmit}
          className="animate-hero-rise space-y-5 border-t border-white/15 pt-8"
        >
          <h2 className="font-display text-xl font-semibold tracking-tight text-white uppercase">
            3. Your details
          </h2>
          <p className="text-mist/70 text-sm">
            Selected:{" "}
            {formatWithShortZone(
              selectedSlot.startsAt,
              viewerTimezone,
              "h:mm a",
            )}
            . We’ll call this number.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-mist/80 text-sm font-medium">Name</span>
              <input
                required
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-navy-deep/50 focus:border-amber mt-2 w-full border border-white/20 px-4 py-3 text-white transition outline-none"
                placeholder="Jane Doe"
              />
            </label>
            <label className="block">
              <span className="text-mist/80 text-sm font-medium">Phone</span>
              <input
                required
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                value={formatPhoneDisplay(phone)}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="bg-navy-deep/50 focus:border-amber mt-2 w-full border border-white/20 px-4 py-3 text-white transition outline-none"
                placeholder="(555) 123-4567"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-mist/80 text-sm font-medium">
                Email <span className="text-mist/50">(optional)</span>
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby="email-hint"
                className="bg-navy-deep/50 focus:border-amber mt-2 w-full border border-white/20 px-4 py-3 text-white transition outline-none"
                placeholder="jane@example.com"
              />
              <span id="email-hint" className="text-mist/60 mt-2 block text-sm">
                Optional. We’ll send a calendar invite, and let you know if we
                need to reschedule. We’ll still call your phone either way.
              </span>
            </label>
          </div>

          {formError && <p className="text-amber text-sm">{formError}</p>}

          <button
            type="submit"
            disabled={pendingSubmit || pendingSlots || !configured}
            className="bg-amber text-navy-deep hover:bg-amber-hot cursor-pointer px-6 py-3 text-base font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingSubmit ? "Booking…" : "Confirm callback"}
          </button>
        </form>
      )}
    </div>
  );
}
