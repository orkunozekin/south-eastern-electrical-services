"use server";

import {
  validateSettings,
  type SettingsInput,
} from "@/lib/booking/settings-validation";
import { revalidatePath } from "next/cache";

import { getVerifiedAdmin, requireAdmin } from "@/lib/auth/session";
import {
  isValidDateString,
  isValidTime,
  type AvailabilityOverride,
  type BookingSettings,
  type CancelNotice,
  type WeeklyHours,
} from "@/lib/booking";
import {
  BookingError,
  deleteAvailabilityOverride,
  getBookingSettings,
  listAvailabilityOverrides,
  listBookings,
  saveAvailabilityOverride,
  saveBookingSettings,
} from "@/lib/booking/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";
import { maskedBootstrapRecipients } from "@/lib/plunk";
import {
  cancelAndNotify,
  type CancellationResult,
} from "@/lib/booking/cancellation";
import { formatWithShortZone } from "@/lib/timezone";

export type AdminBookingDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled";
  label: string;
  phoneDisplay: string;
  cancelNotice: CancelNotice | null;
  cancelNoticeReason: string | null;
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
        email: booking.email ?? null,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        status: booking.status,
        label: formatWithShortZone(
          booking.startsAt,
          settings.timezone,
          "EEE, MMM d · h:mm a",
        ),
        cancelNotice: booking.cancelNotice ?? null,
        cancelNoticeReason: booking.cancelNoticeReason ?? null,
      })),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function cancelBookingAction(
  id: string,
  options: { notifyCustomer: boolean; message?: string },
): Promise<({ ok: true } & CancellationResult) | { ok: false; error: string }> {
  await requireAdmin();
  if (!options || typeof options.notifyCustomer !== "boolean")
    return { ok: false, error: "Choose whether to email the customer." };
  const invalid =
    options.message !== undefined &&
    (typeof options.message !== "string" || options.message.length > 500)
      ? "Keep the customer message under 500 characters."
      : null;
  if (invalid) return { ok: false, error: invalid };
  try {
    const result = await cancelAndNotify(id, options);
    revalidatePath("/admin");
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function getAdminSettingsAction(): Promise<
  | { ok: true; settings: BookingSettings; bootstrapRecipients: string[] }
  | { ok: false; error: string }
> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  try {
    const settings = await getBookingSettings();
    return {
      ok: true,
      settings,
      bootstrapRecipients: settings.notifyEmails.length
        ? []
        : maskedBootstrapRecipients(),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveAdminSettingsAction(
  input: SettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;
  const invalid = validateSettings(input);
  if (invalid) return { ok: false, error: invalid };
  try {
    const current = await getBookingSettings();
    await saveBookingSettings(
      {
        ...current,
        timezone: input.timezone.trim(),
        slotDurationMinutes: input.slotDurationMinutes,
        minNoticeMinutes: input.minNoticeMinutes,
        bookingWindowDays: input.bookingWindowDays,
        notifyEmails: [
          ...new Set(input.notifyEmails.map((e) => e.trim().toLowerCase())),
        ],
      },
      [
        "timezone",
        "slotDurationMinutes",
        "notifyEmails",
        "minNoticeMinutes",
        "bookingWindowDays",
      ],
    );
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
    await saveBookingSettings({ ...current, weeklyHours }, ["weeklyHours"]);
    revalidatePath("/admin/availability");
    revalidatePath("/book");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
