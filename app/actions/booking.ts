"use server";

import { formatInTimeZone } from "date-fns-tz";

import { isValidDateString } from "@/lib/booking";
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

const UNAVAILABLE =
  "Booking is temporarily unavailable. Please try again later.";

/** Never surface infra/vendor names (Firebase, env files) to visitors. */
function toUserFacingError(message: string): string {
  if (/firebase|\.env/i.test(message)) return UNAVAILABLE;
  return message;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "BookingError") {
    return toUserFacingError(error.message);
  }
  if (error instanceof Error && /firebase/i.test(error.message)) {
    return UNAVAILABLE;
  }
  console.error("[booking]", error);
  return "Something went wrong. Please try again.";
}

async function loadBookingServer() {
  return import("@/lib/booking/server");
}

export async function fetchSlotsAction(
  date: string,
): Promise<{ ok: true; slots: SlotDto[] } | { ok: false; error: string }> {
  if (!isValidDateString(date)) {
    return { ok: false, error: "Invalid date." };
  }

  if (!isFirebaseAdminConfigured()) {
    return { ok: false, error: UNAVAILABLE };
  }

  try {
    const { BookingError, getBookingSettings, listAvailableSlots } =
      await loadBookingServer();

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
      if (error instanceof BookingError) {
        return { ok: false, error: toUserFacingError(error.message) };
      }
      throw error;
    }
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
    return { ok: false, error: UNAVAILABLE };
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Invalid appointment time." };
  }

  try {
    const { BookingError, createBooking, getBookingSettings } =
      await loadBookingServer();

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
      if (error instanceof BookingError) {
        return { ok: false, error: toUserFacingError(error.message) };
      }
      throw error;
    }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
