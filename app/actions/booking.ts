"use server";

import { formatInTimeZone } from "date-fns-tz";

import {
  DEFAULT_BOOKING_SETTINGS,
  getBookableDateStrings,
  isValidDateString,
} from "@/lib/booking";
import {
  BookingError,
  createBooking,
  getBookingSettings,
  listAvailableSlots,
} from "@/lib/booking/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";
import { sendBookingNotification } from "@/lib/plunk";

export type SlotDto = {
  slotId: string;
  startsAt: string;
  endsAt: string;
  label: string;
};

export type BookingDto = {
  id: string;
  name: string;
  phone: string;
  startsAt: string;
  endsAt: string;
  label: string;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof BookingError) return error.message;
  if (error instanceof Error && error.message.includes("Firebase Admin")) {
    return "Booking is temporarily unavailable. Please try again later.";
  }
  console.error(error);
  return "Something went wrong. Please try again.";
}

export async function fetchSlotsAction(
  date: string,
): Promise<{ ok: true; slots: SlotDto[] } | { ok: false; error: string }> {
  if (!isValidDateString(date)) {
    return { ok: false, error: "Invalid date." };
  }

  if (!isFirebaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "Booking is not connected yet. Add Firebase credentials to .env.local.",
    };
  }

  try {
    const [settings, slots] = await Promise.all([
      getBookingSettings(),
      listAvailableSlots(date),
    ]);

    return {
      ok: true,
      slots: slots.map((slot) => ({
        slotId: slot.slotId,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        label: formatInTimeZone(slot.startsAt, settings.timezone, "h:mm a"),
      })),
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function submitBookingAction(input: {
  name: string;
  phone: string;
  startsAt: string;
}): Promise<{ ok: true; booking: BookingDto } | { ok: false; error: string }> {
  if (!isFirebaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "Booking is not connected yet. Add Firebase credentials to .env.local.",
    };
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Invalid appointment time." };
  }

  try {
    const settings = await getBookingSettings();
    const booking = await createBooking({
      name: input.name,
      phone: input.phone,
      startsAt,
    });

    const label = formatInTimeZone(
      booking.startsAt,
      settings.timezone,
      "EEEE, MMM d · h:mm a zzz",
    );

    try {
      await sendBookingNotification({
        booking,
        whenLabel: label,
        notifyEmails: settings.notifyEmails,
      });
    } catch (notifyError) {
      // Booking is already confirmed; don't fail the customer flow.
      console.error(
        "[plunk] Failed to send booking notification:",
        notifyError,
      );
    }

    return {
      ok: true,
      booking: {
        id: booking.id,
        name: booking.name,
        phone: booking.phone,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        label,
      },
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function getBookingPageData(): Promise<{
  timezone: string;
  dates: string[];
  configured: boolean;
}> {
  const configured = isFirebaseAdminConfigured();

  if (!configured) {
    return {
      timezone: DEFAULT_BOOKING_SETTINGS.timezone,
      dates: getBookableDateStrings(DEFAULT_BOOKING_SETTINGS),
      configured: false,
    };
  }

  try {
    const settings = await getBookingSettings();
    return {
      timezone: settings.timezone,
      dates: getBookableDateStrings(settings),
      configured: true,
    };
  } catch {
    return {
      timezone: DEFAULT_BOOKING_SETTINGS.timezone,
      dates: getBookableDateStrings(DEFAULT_BOOKING_SETTINGS),
      configured: false,
    };
  }
}
