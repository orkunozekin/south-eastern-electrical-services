"use server";

import {
  validateSettings,
  type SettingsInput,
} from "@/lib/booking/settings-validation";
import { revalidatePath } from "next/cache";

import { getVerifiedAdmin } from "@/lib/auth/session";
import {
  isValidDateString,
  isValidTime,
  type AvailabilityOverride,
  type Booking,
  type BookingSettings,
  type CancelNotice,
  type WeeklyHours,
} from "@/lib/booking";
import {
  BookingError,
  cancelBooking,
  deleteAvailabilityOverride,
  getBookingSettings,
  listAvailabilityOverrides,
  listBookings,
  recordCancelNotice,
  saveAvailabilityOverride,
  saveBookingSettings,
} from "@/lib/booking/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";
import {
  maskedBootstrapRecipients,
  resolveRecipients,
  sendCustomerCancellation,
} from "@/lib/plunk";
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

const CANCEL_MESSAGE_MAX = 500;

function siteUrl(): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3333";
}

async function notifyCustomerOfCancel(
  booking: Booking,
  options: { notifyCustomer: boolean; message?: string },
): Promise<{ notice: CancelNotice; reason: string | null }> {
  if (!booking.email) {
    return { notice: "skipped", reason: "No email on file" };
  }
  if (!options.notifyCustomer) {
    return { notice: "skipped", reason: "Admin chose not to notify" };
  }
  if (booking.startsAt.getTime() <= Date.now()) {
    return { notice: "skipped", reason: "Booking time has passed" };
  }

  try {
    const settings = await getBookingSettings();
    const result = await sendCustomerCancellation({
      booking,
      whenLabel: formatWithShortZone(
        booking.startsAt,
        booking.customerTimezone ?? settings.timezone,
        "EEEE, MMM d · h:mm a",
      ),
      message: options.message,
      rescheduleUrl: `${siteUrl()}/book?ref=cancelled`,
      businessPhone: process.env.BUSINESS_PHONE?.trim() || undefined,
      replyTo: resolveRecipients(settings.notifyEmails)[0],
    });
    return result === "sent"
      ? { notice: "sent", reason: null }
      : { notice: "skipped", reason: "Email not configured" };
  } catch (error) {
    console.error("[plunk] Failed to send customer cancellation:", error);
    return { notice: "failed", reason: "Email could not be sent" };
  }
}

export async function cancelBookingAction(
  bookingId: string,
  options: { notifyCustomer: boolean; message?: string },
): Promise<
  | { ok: true; notice: CancelNotice; noticeReason?: string }
  | { ok: false; error: string }
> {
  const auth = await assertAdmin();
  if (!auth.ok) return auth;

  const message = options.message?.trim().slice(0, CANCEL_MESSAGE_MAX);

  let cancelled: Awaited<ReturnType<typeof cancelBooking>>;
  try {
    cancelled = await cancelBooking(bookingId);
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }

  const { booking, changed } = cancelled;
  if (!changed) {
    revalidatePath("/admin");
    return {
      ok: true,
      notice: booking.cancelNotice ?? "skipped",
      noticeReason: booking.cancelNoticeReason ?? "Already cancelled",
    };
  }

  const { notice, reason } = await notifyCustomerOfCancel(booking, {
    notifyCustomer: options.notifyCustomer,
    message: message || undefined,
  });

  try {
    await recordCancelNotice(booking.id, notice, reason);
  } catch (error) {
    console.error("[booking] Failed to record cancel notice:", error);
  }

  revalidatePath("/admin");
  return { ok: true, notice, ...(reason ? { noticeReason: reason } : {}) };
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
