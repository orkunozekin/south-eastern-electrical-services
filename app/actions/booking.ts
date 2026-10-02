"use server";

import { getBookableDateStrings, isValidDateString } from "@/lib/booking";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";
import { sendBookingConfirmation, sendBookingNotification } from "@/lib/plunk";
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
  email: string | null;
  startsAt: string;
  endsAt: string;
  label: string;
  /** `null` when no email was given. */
  calendarInvite: "sent" | "failed" | null;
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

function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

async function loadBookingServer() {
  return import("@/lib/booking/server");
}

export async function fetchBookingCalendarAction(): Promise<
  | { ok: true; timezone: string; dates: string[]; bookingWindowDays: number }
  | { ok: false; error: string }
> {
  if (!isFirebaseAdminConfigured()) {
    return { ok: false, error: UNAVAILABLE };
  }

  try {
    const { getBookingSettings, listAvailabilityOverrides } =
      await loadBookingServer();

    const settings = await getBookingSettings();
    const candidates = getBookableDateStrings(settings);
    if (candidates.length === 0) {
      return {
        ok: true,
        timezone: settings.timezone,
        dates: [],
        bookingWindowDays: settings.bookingWindowDays,
      };
    }

    const overrides = await listAvailabilityOverrides({
      from: candidates[0],
      to: candidates[candidates.length - 1],
    });
    const closed = new Set(
      overrides.filter((item) => item.closed).map((item) => item.date),
    );

    return {
      ok: true,
      timezone: settings.timezone,
      bookingWindowDays: settings.bookingWindowDays,
      dates: candidates.filter((date) => !closed.has(date)),
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
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
  email?: string;
  startsAt: string;
  /** Visitor's IANA timezone, used for the time shown in their invite email. */
  timezone?: string;
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
        email: input.email,
        startsAt,
        customerTimezone: isValidTimezone(input.timezone)
          ? input.timezone
          : settings.timezone,
      });

      // Business notification stays in the configured business timezone.
      const businessLabel = formatWithShortZone(
        booking.startsAt,
        settings.timezone,
        "EEEE, MMM d · h:mm a",
      );
      const customerLabel = formatWithShortZone(
        booking.startsAt,
        isValidTimezone(input.timezone) ? input.timezone : settings.timezone,
        "EEEE, MMM d · h:mm a",
      );

      // Booking is already confirmed; email failures don't fail the customer flow.
      const [notifyResult, confirmResult] = await Promise.allSettled([
        sendBookingNotification({
          booking,
          whenLabel: businessLabel,
          notifyEmails: settings.notifyEmails,
        }),
        sendBookingConfirmation({ booking, whenLabel: customerLabel }),
      ]);

      if (notifyResult.status === "rejected") {
        console.error(
          "[plunk] Failed to send booking notification:",
          notifyResult.reason,
        );
      }
      if (confirmResult.status === "rejected") {
        console.error(
          "[plunk] Failed to send booking confirmation:",
          confirmResult.reason,
        );
      }

      let calendarInvite: BookingDto["calendarInvite"] = null;
      if (booking.email) {
        calendarInvite =
          confirmResult.status === "fulfilled" &&
          confirmResult.value !== "skipped"
            ? "sent"
            : "failed";
      }

      return {
        ok: true,
        booking: {
          id: booking.id,
          name: booking.name,
          phone: booking.phone,
          email: booking.email ?? null,
          startsAt: booking.startsAt.toISOString(),
          endsAt: booking.endsAt.toISOString(),
          // Client shows this in the guest's timezone; business TZ is fallback.
          label: businessLabel,
          calendarInvite,
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
