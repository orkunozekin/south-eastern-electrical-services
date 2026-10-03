"use server";

import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { requireAdmin } from "@/lib/auth/session";
import {
  generateDaySlots,
  isBookingWithinAvailability,
  isBookingAffectedByOverride,
  isValidDateString,
  isValidTime,
  type AvailabilityOverride,
  type Booking,
  type BookingSettings,
  type WeeklyHours,
} from "@/lib/booking";
import {
  BookingError,
  deleteAvailabilityOverride,
  findConflictingBookings,
  getAvailabilityOverride,
  getAvailabilityOverrideSnapshot,
  getBookingSettings,
  listAvailabilityOverrides,
  listBookings,
  saveAvailabilityOverride,
  saveSettingsWithConflicts,
} from "@/lib/booking/server";
import {
  cancelAndNotify,
  type CancellationResult,
} from "@/lib/booking/cancellation";
import {
  validateSettings,
  validateWeeklyHours,
  type SettingsInput,
} from "@/lib/booking/settings-validation";
import { maskedBootstrapRecipients } from "@/lib/plunk";
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
  outsideHours: boolean;
  cancelNotice: "sent" | "failed" | "skipped" | null;
  cancelNoticeReason: string | null;
};
type Failure = { ok: false; error: string; conflicts?: AdminBookingDto[] };
export type ConflictResolution = "keep" | "cancel" | "cancel-and-notify";
export type OverrideInput = {
  date: string;
  closed: boolean;
  blockedSlots: string[];
};
export type OverrideCancellationResult =
  | {
      id: string;
      name: string;
      phoneDisplay: string;
      ok: true;
      result: CancellationResult;
    }
  | {
      id: string;
      name: string;
      phoneDisplay: string;
      ok: false;
      error: string;
    };

function toActionError(error: unknown): string {
  if (error instanceof BookingError && !/firebase|\.env/i.test(error.message))
    return error.message;
  console.error("[admin]", error);
  return "Something went wrong. Please try again.";
}
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : phone;
}
function dto(
  booking: Booking,
  settings: BookingSettings,
  outsideHours = false,
): AdminBookingDto {
  return {
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
    outsideHours,
    cancelNotice: booking.cancelNotice ?? null,
    cancelNoticeReason: booking.cancelNoticeReason ?? null,
  };
}
function revalidateAdmin() {
  for (const path of [
    "/admin",
    "/admin/settings",
    "/admin/availability",
    "/book",
  ])
    revalidatePath(path);
}
function validateMessage(message?: string): string | null {
  return message !== undefined &&
    (typeof message !== "string" || message.length > 500)
    ? "Keep the customer message under 500 characters."
    : null;
}

export async function getAdminBookingsAction(): Promise<
  { ok: true; bookings: AdminBookingDto[] } | Failure
> {
  await requireAdmin();
  try {
    const settings = await getBookingSettings();
    const [bookings, overrides] = await Promise.all([
      listBookings({ from: new Date(Date.now() - 7 * 86400000) }),
      listAvailabilityOverrides(),
    ]);
    const byDate = new Map(overrides.map((o) => [o.date, o]));
    return {
      ok: true,
      bookings: bookings.map((b) =>
        dto(
          b,
          settings,
          b.status === "confirmed" &&
            b.startsAt > new Date() &&
            !isBookingWithinAvailability(b, settings, byDate),
        ),
      ),
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function cancelBookingAction(
  id: string,
  options: { notifyCustomer: boolean; message?: string },
): Promise<({ ok: true } & CancellationResult) | Failure> {
  await requireAdmin();
  if (!options || typeof options.notifyCustomer !== "boolean")
    return { ok: false, error: "Choose whether to email the customer." };
  const invalid = validateMessage(options.message);
  if (invalid) return { ok: false, error: invalid };
  try {
    const result = await cancelAndNotify(id, options);
    revalidateAdmin();
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function getAdminSettingsAction(): Promise<
  | {
      ok: true;
      settings: BookingSettings;
      bootstrapRecipients: string[];
      upcomingBookings: number;
    }
  | Failure
> {
  await requireAdmin();
  try {
    const [settings, upcoming] = await Promise.all([
      getBookingSettings(),
      listBookings({ from: new Date(), status: "confirmed" }),
    ]);
    return {
      ok: true,
      settings,
      bootstrapRecipients: settings.notifyEmails.length
        ? []
        : maskedBootstrapRecipients(),
      upcomingBookings: upcoming.length,
    };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function previewSettingsAction(
  input: SettingsInput,
): Promise<{ ok: true; conflicts: AdminBookingDto[] } | Failure> {
  await requireAdmin();
  const invalid = validateSettings(input);
  if (invalid) return { ok: false, error: invalid };
  try {
    const settings = {
      ...(await getBookingSettings()),
      ...input,
      timezone: input.timezone.trim(),
    };
    const conflicts = await findConflictingBookings({
      settings,
      overrides: new Map(),
    });
    return { ok: true, conflicts: conflicts.map((b) => dto(b, settings)) };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveAdminSettingsAction(
  input: SettingsInput,
  options?: { keepConflicts: boolean },
): Promise<{ ok: true } | Failure> {
  await requireAdmin();
  const invalid = validateSettings(input);
  if (invalid) return { ok: false, error: invalid };
  try {
    const { settings, conflicts, saved } = await saveSettingsWithConflicts(
      {
        timezone: input.timezone.trim(),
        slotDurationMinutes: input.slotDurationMinutes,
        minNoticeMinutes: input.minNoticeMinutes,
        bookingWindowDays: input.bookingWindowDays,
        notifyEmails: [
          ...new Set(input.notifyEmails.map((e) => e.trim().toLowerCase())),
        ],
      },
      options?.keepConflicts === true,
    );
    if (!saved)
      return {
        ok: false,
        error:
          "Some bookings are outside the proposed hours. Review them before saving.",
        conflicts: conflicts.map((b) => dto(b, settings)),
      };
    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function getAdminAvailabilityAction(): Promise<
  | { ok: true; settings: BookingSettings; overrides: AvailabilityOverride[] }
  | Failure
> {
  await requireAdmin();
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

async function proposedOverride(
  input: OverrideInput,
  settings: BookingSettings,
  savedOverride?: AvailabilityOverride | null,
): Promise<AvailabilityOverride> {
  if (!input || !isValidDateString(input.date))
    throw new BookingError("Invalid date.", "INVALID_DATE");
  if (typeof input.closed !== "boolean" || !Array.isArray(input.blockedSlots))
    throw new BookingError("Invalid override.", "VALIDATION");
  const saved =
    savedOverride === undefined
      ? await getAvailabilityOverride(input.date)
      : savedOverride;
  const proposal = {
    ...saved,
    date: input.date,
    closed: input.closed,
    blockedSlots: input.closed ? [] : [...new Set(input.blockedSlots)],
  };
  if (!input.closed) {
    const valid = generateDaySlots(input.date, settings, {
      ...proposal,
      closed: false,
      blockedSlots: [],
    }).map((s) => formatInTimeZone(s.startsAt, settings.timezone, "HH:mm"));
    for (const slot of input.blockedSlots) {
      if (typeof slot !== "string" || !isValidTime(slot))
        throw new BookingError(
          "Blocked slots must use HH:mm times.",
          "VALIDATION",
        );
      if (!valid.includes(slot))
        throw new BookingError(
          `${slot} isn't a slot start time on ${input.date}. Available start times: ${valid.join(", ") || "none"}.`,
          "VALIDATION",
        );
    }
  }
  return proposal;
}
async function overrideConflicts(
  override: AvailabilityOverride,
  settings: BookingSettings,
  previous: AvailabilityOverride | null,
) {
  const nextDate = addDays(new Date(`${override.date}T12:00:00Z`), 1)
    .toISOString()
    .slice(0, 10);
  const conflicts = await findConflictingBookings({
    settings,
    overrides: new Map([[override.date, override]]),
    from: new Date(
      Math.max(
        Date.now(),
        +fromZonedTime(`${override.date}T00:00:00`, settings.timezone),
      ),
    ),
    to: fromZonedTime(`${nextDate}T00:00:00`, settings.timezone),
  });
  return conflicts.filter((booking) =>
    isBookingAffectedByOverride(booking, settings, previous, override),
  );
}

export async function previewOverrideAction(
  input: OverrideInput,
): Promise<{ ok: true; conflicts: AdminBookingDto[] } | Failure> {
  await requireAdmin();
  try {
    const settings = await getBookingSettings();
    const previous = await getAvailabilityOverride(input.date);
    const proposal = await proposedOverride(input, settings);
    const conflicts = await overrideConflicts(proposal, settings, previous);
    return { ok: true, conflicts: conflicts.map((b) => dto(b, settings)) };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveOverrideAction(
  input: OverrideInput & {
    conflictResolution: ConflictResolution;
    message?: string;
  },
): Promise<
  | {
      ok: true;
      results: OverrideCancellationResult[];
      keptConflicts: AdminBookingDto[];
    }
  | Failure
> {
  await requireAdmin();
  if (
    !["keep", "cancel", "cancel-and-notify"].includes(input?.conflictResolution)
  )
    return { ok: false, error: "Choose how to handle affected bookings." };
  const invalid = validateMessage(input.message);
  if (invalid) return { ok: false, error: invalid };
  let saved = false;
  try {
    const settings = await getBookingSettings();
    const snapshot = await getAvailabilityOverrideSnapshot(input.date);
    const previous = snapshot.override;
    const proposal = await proposedOverride(input, settings, previous);
    const version = await saveAvailabilityOverride(proposal, {
      version: snapshot.version,
    });
    saved = true;
    // Recompute after the override is saved: bookings committed before this save
    // are included, while in-flight booking transactions re-read the override.
    const conflicts = await overrideConflicts(proposal, settings, previous);
    const results: OverrideCancellationResult[] = [];
    if (input.conflictResolution !== "keep") {
      for (const booking of conflicts) {
        const row = {
          id: booking.id,
          name: booking.name,
          phoneDisplay: formatPhone(booking.phone),
        };
        try {
          results.push({
            ...row,
            ok: true,
            result: await cancelAndNotify(booking.id, {
              notifyCustomer: input.conflictResolution === "cancel-and-notify",
              message: input.message,
              overrideGuard: { date: proposal.date, version },
            }),
          });
        } catch (error) {
          results.push({ ...row, ok: false, error: toActionError(error) });
        }
      }
    }
    revalidateAdmin();
    return {
      ok: true,
      results,
      keptConflicts:
        input.conflictResolution === "keep"
          ? conflicts.map((b) => dto(b, settings, true))
          : [],
    };
  } catch (error) {
    return {
      ok: false,
      error: saved
        ? "Override saved, but affected bookings could not all be checked. Review the Bookings page before trying again."
        : toActionError(error),
    };
  }
}

export async function deleteOverrideAction(
  date: string,
): Promise<{ ok: true } | Failure> {
  await requireAdmin();
  try {
    await deleteAvailabilityOverride(date);
    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function previewWeeklyHoursAction(
  weeklyHours: WeeklyHours,
): Promise<{ ok: true; conflicts: AdminBookingDto[] } | Failure> {
  await requireAdmin();
  const invalid = validateWeeklyHours(weeklyHours);
  if (invalid) return { ok: false, error: invalid };
  try {
    const settings = { ...(await getBookingSettings()), weeklyHours };
    const conflicts = await findConflictingBookings({
      settings,
      overrides: new Map(),
    });
    return { ok: true, conflicts: conflicts.map((b) => dto(b, settings)) };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}

export async function saveWeeklyHoursAction(
  weeklyHours: WeeklyHours,
  options?: { keepConflicts: boolean },
): Promise<{ ok: true } | Failure> {
  await requireAdmin();
  const invalid = validateWeeklyHours(weeklyHours);
  if (invalid) return { ok: false, error: invalid };
  try {
    const { settings, conflicts, saved } = await saveSettingsWithConflicts(
      { weeklyHours },
      options?.keepConflicts === true,
    );
    if (!saved)
      return {
        ok: false,
        error:
          "Some bookings are outside the proposed hours. Review them before saving.",
        conflicts: conflicts.map((b) => dto(b, settings)),
      };
    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toActionError(error) };
  }
}
