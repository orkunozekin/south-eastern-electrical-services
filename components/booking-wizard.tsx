"use client";

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import {
  fetchSlotsAction,
  submitBookingAction,
  type BookingDto,
  type SlotDto,
} from "@/app/actions/booking";

type BookingWizardProps = {
  dates: string[];
  timezone: string;
  configured: boolean;
};

function formatDateChip(
  date: string,
  timezone: string,
): { weekday: string; day: string } {
  const noon = fromZonedTime(`${date}T12:00:00`, timezone);
  return {
    weekday: formatInTimeZone(noon, timezone, "EEE"),
    day: formatInTimeZone(noon, timezone, "MMM d"),
  };
}

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function BookingWizard({
  dates,
  timezone,
  configured,
}: BookingWizardProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    dates[0] ?? null,
  );
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingDto | null>(null);
  const [pendingSlots, startSlots] = useTransition();
  const [pendingSubmit, startSubmit] = useTransition();

  useEffect(() => {
    if (!selectedDate) return;

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
  }, [selectedDate]);

  function selectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlotsError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlot) return;

    setFormError(null);
    startSubmit(async () => {
      const result = await submitBookingAction({
        name,
        phone,
        startsAt: selectedSlot.startsAt,
      });

      if (!result.ok) {
        setFormError(result.error);
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
          <span className="text-white">{confirmation.label}</span>.
        </p>
        <p className="text-mist/70 mt-2 text-base">
          Phone on file: {formatPhoneDisplay(confirmation.phone)}
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmation(null);
            setSelectedSlot(null);
            setName("");
            setPhone("");
            setFormError(null);
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
          Booking is temporarily unavailable. Please try again later or call
          us.
        </p>
      )}

      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-white uppercase">
          1. Choose a day
        </h2>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {dates.map((date) => {
            const chip = formatDateChip(date, timezone);
            const active = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
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
        <p className="text-mist/60 mt-1 text-sm">Times shown in {timezone}</p>

        {pendingSlots && (
          <p className="text-mist/70 mt-4 text-sm">Loading available times…</p>
        )}

        {!pendingSlots && slotsError && (
          <p className="text-amber mt-4 text-sm">{slotsError}</p>
        )}

        {!pendingSlots && !slotsError && slots.length === 0 && selectedDate && (
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
                onClick={() => setSelectedSlot(slot)}
                className={`cursor-pointer px-3 py-3 text-sm font-semibold tracking-wide transition ${
                  active
                    ? "bg-amber text-navy-deep scale-[1.03] shadow-[0_0_0_2px_color-mix(in_srgb,var(--amber-hot)_80%,transparent)]"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {slot.label}
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
            Selected: {selectedSlot.label}. We’ll call this number.
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
          </div>

          {formError && <p className="text-amber text-sm">{formError}</p>}

          <button
            type="submit"
            disabled={pendingSubmit}
            className="bg-amber text-navy-deep hover:bg-amber-hot cursor-pointer px-6 py-3 text-base font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingSubmit ? "Booking…" : "Confirm callback"}
          </button>
        </form>
      )}
    </div>
  );
}
