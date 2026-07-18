"use server";

import { formatInTimeZone } from "date-fns-tz";
import { revalidatePath } from "next/cache";

import { getVerifiedAdmin } from "@/lib/auth/session";
import {
  isValidDateString,
  isValidTime,
  type AvailabilityOverride,
  type BookingSettings,
  type WeeklyHours,
} from "@/lib/booking";
import {
  BookingError,
  cancelBooking,
  deleteAvailabilityOverride,
  getBookingSettings,
  listAvailabilityOverrides,
  listBookings,
  saveAvailabilityOverride,
  saveBookingSettings,
} from "@/lib/booking/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

export type AdminBookingDto = {
  id: string;
  name: string;
  phone: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  label: string;
  phoneDisplay: string;
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

async function assertAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!isFirebaseAdminConfigured()) {
    return { ok: false, error: "Booking backend is not configured." };
  }
  const admin = await getVerifiedAdmin();
  if (!admin) {
    return { ok: false, error: "Unauthorized." };
  }
  return { ok: true };
}

function toActionError(error: unknown): string {
  if (error instanceof BookingError) {
    if (/firebase|\.env/i.test(error.message)) {
      return "Something went wrong. Please try again.";
    }
    return error.message;
  }
  if (error instanceof Error && /firebase/i.test(error.message)) {
    return "Something went wrong. Please try again.";
  }
  console.error(error);
  return "Something went wrong. Please try again.";
}

export async function getAdminBookingsAction(): Promise<
  { ok: true; bookings: AdminBookingDto[] } | { ok: false; error: string }
> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const settings = await getBookingSettings();
    const bookings = await listBookings({
      from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    });

    return {
      ok: true,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        name: booking.name,
        phone: booking.phone,
        phoneDisplay: formatPhone(booking.phone),
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        status: booking.status,
        label: formatInTimeZone(
          booking.startsAt,
          settings.timezone,
          "EEE, MMM d · h:mm a",
        ),
      })),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function cancelBookingAction(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    await cancelBooking(bookingId);
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function getAdminSettingsAction(): Promise<
  { ok: true; settings: BookingSettings } | { ok: false; error: string }
> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const settings = await getBookingSettings();
    return { ok: true, settings };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveAdminSettingsAction(input: {
  timezone: string;
  slotDurationMinutes: number;
  notifyEmails: string[];
  weeklyHours: WeeklyHours;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  if (!input.timezone.trim()) {
    return { ok: false, error: "Timezone is required." };
  }
  if (
    !Number.isInteger(input.slotDurationMinutes) ||
    input.slotDurationMinutes < 15 ||
    input.slotDurationMinutes > 120
  ) {
    return {
      ok: false,
      error: "Slot duration must be between 15 and 120 minutes.",
    };
  }

  for (const email of input.notifyEmails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: `Invalid email: ${email}` };
    }
  }

  for (const ranges of Object.values(input.weeklyHours)) {
    if (!ranges) continue;
    for (const range of ranges) {
      if (!isValidTime(range.start) || !isValidTime(range.end)) {
        return { ok: false, error: "Weekly hours must use HH:mm times." };
      }
      if (range.start >= range.end) {
        return { ok: false, error: "Each day’s end time must be after start." };
      }
    }
  }

  try {
    const current = await getBookingSettings();
    await saveBookingSettings({
      ...current,
      timezone: input.timezone.trim(),
      slotDurationMinutes: input.slotDurationMinutes,
      notifyEmails: input.notifyEmails,
      weeklyHours: input.weeklyHours,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/availability");
    revalidatePath("/book");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function getAdminAvailabilityAction(): Promise<
  | {
      ok: true;
      settings: BookingSettings;
      overrides: AvailabilityOverride[];
    }
  | { ok: false; error: string }
> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const [settings, overrides] = await Promise.all([
      getBookingSettings(),
      listAvailabilityOverrides(),
    ]);
    return { ok: true, settings, overrides };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveOverrideAction(input: {
  date: string;
  closed: boolean;
  blockedSlots: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  if (!isValidDateString(input.date)) {
    return { ok: false, error: "Invalid date." };
  }

  for (const slot of input.blockedSlots) {
    if (!isValidTime(slot)) {
      return {
        ok: false,
        error: `Blocked slots must be HH:mm (invalid: ${slot}).`,
      };
    }
  }

  try {
    await saveAvailabilityOverride({
      date: input.date,
      closed: input.closed,
      blockedSlots: input.blockedSlots,
    });
    revalidatePath("/admin/availability");
    revalidatePath("/book");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function deleteOverrideAction(
  date: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    await deleteAvailabilityOverride(date);
    revalidatePath("/admin/availability");
    revalidatePath("/book");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveWeeklyHoursAction(
  weeklyHours: WeeklyHours,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  for (const ranges of Object.values(weeklyHours)) {
    if (!ranges) continue;
    for (const range of ranges) {
      if (!isValidTime(range.start) || !isValidTime(range.end)) {
        return { ok: false, error: "Weekly hours must use HH:mm times." };
      }
      if (range.start >= range.end) {
        return { ok: false, error: "Each day’s end time must be after start." };
      }
    }
  }

  try {
    const current = await getBookingSettings();
    await saveBookingSettings({ ...current, weeklyHours });
    revalidatePath("/admin/availability");
    revalidatePath("/book");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
