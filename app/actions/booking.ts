"use server";

import { isValidDateString } from "@/lib/booking";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";
import { sendBookingNotification } from "@/lib/plunk";
import { formatWithShortZone } from "@/lib/timezone";

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
  if (
    error instanceof Error &&
    (error.name === "BookingError" || error.message.includes("Firebase"))
  ) {
    if (error.name === "BookingError") return error.message;
    return "Booking is temporarily unavailable. Please try again later.";
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
    return {
      ok: false,
      error:
        "Booking is not connected yet. Add Firebase credentials to .env.local.",
    };
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
          // Client reformats into the viewer's timezone; business TZ is fallback.
          label: formatWithShortZone(
            slot.startsAt,
            settings.timezone,
            "h:mm a",
          ),
        })),
      };
    } catch (error) {
      if (error instanceof BookingError) {
        return { ok: false, error: error.message };
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
    const { BookingError, createBooking, getBookingSettings } =
      await loadBookingServer();

    try {
      const settings = await getBookingSettings();
      const booking = await createBooking({
        name: input.name,
        phone: input.phone,
        startsAt,
      });

      // Business notification stays in the configured business timezone.
      const businessLabel = formatWithShortZone(
        booking.startsAt,
        settings.timezone,
        "EEEE, MMM d · h:mm a",
      );

      try {
        await sendBookingNotification({
          booking,
          whenLabel: businessLabel,
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
          // Client shows this in the guest's timezone; business TZ is fallback.
          label: businessLabel,
        },
      };
    } catch (error) {
      if (error instanceof BookingError) {
        return { ok: false, error: error.message };
      }
      throw error;
    }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
