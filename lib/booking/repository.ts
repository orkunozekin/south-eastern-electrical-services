import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { inviteIdentity } from "./invite-identity";
import { getAdminDb } from "@/lib/firebase/admin";

import {
  COLLECTIONS,
  DEFAULT_BOOKING_SETTINGS,
  SETTINGS_BOOKING_DOC,
} from "./defaults";
import {
  getAvailableSlots,
  generateDaySlots,
  bookingLockDates,
  MAX_SLOT_MINUTES,
  rangesOverlap,
  isBookingWithinAvailability,
  isDateWithinBookingWindow,
} from "./slots";
import type {
  AvailabilityOverride,
  Booking,
  BookingSettings,
  BookingStatus,
  CancelNotice,
  CreateBookingInput,
  Slot,
  TimeRange,
  WeeklyHours,
} from "./types";
import { isValidDateString, validateBookingFields } from "./validation";

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code:
      "VALIDATION" | "SLOT_UNAVAILABLE" | "NOT_FOUND" | "INVALID_DATE",
  ) {
    super(message);
    this.name = "BookingError";
  }
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item) => typeof item === "string")) return undefined;
  return value;
}

function asTimeRanges(value: unknown): TimeRange[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ranges: TimeRange[] = [];
  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as TimeRange).start !== "string" ||
      typeof (item as TimeRange).end !== "string"
    ) {
      return undefined;
    }
    ranges.push({
      start: (item as TimeRange).start,
      end: (item as TimeRange).end,
    });
  }
  return ranges;
}

function parseWeeklyHours(value: unknown): WeeklyHours | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result: WeeklyHours = {};
  for (const [key, ranges] of Object.entries(value)) {
    const day = Number(key);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    const parsed = asTimeRanges(ranges);
    if (parsed) {
      result[day as keyof WeeklyHours] = parsed;
    }
  }
  return result;
}

export function mergeSettings(data: DocumentData | undefined): BookingSettings {
  if (!data) return { ...DEFAULT_BOOKING_SETTINGS };

  return {
    minNoticeMinutes:
      Number.isInteger(data.minNoticeMinutes) &&
      data.minNoticeMinutes >= 0 &&
      data.minNoticeMinutes <= 10080
        ? data.minNoticeMinutes
        : DEFAULT_BOOKING_SETTINGS.minNoticeMinutes,
    bookingWindowDays:
      Number.isInteger(data.bookingWindowDays) &&
      data.bookingWindowDays >= 1 &&
      data.bookingWindowDays <= 90
        ? data.bookingWindowDays
        : DEFAULT_BOOKING_SETTINGS.bookingWindowDays,
    timezone:
      typeof data.timezone === "string"
        ? data.timezone
        : DEFAULT_BOOKING_SETTINGS.timezone,
    slotDurationMinutes:
      Number.isInteger(data.slotDurationMinutes) &&
      data.slotDurationMinutes >= 15 &&
      data.slotDurationMinutes <= MAX_SLOT_MINUTES
        ? data.slotDurationMinutes
        : DEFAULT_BOOKING_SETTINGS.slotDurationMinutes,
    weeklyHours:
      parseWeeklyHours(data.weeklyHours) ??
      DEFAULT_BOOKING_SETTINGS.weeklyHours,
    notifyEmails:
      asStringArray(data.notifyEmails) ?? DEFAULT_BOOKING_SETTINGS.notifyEmails,
  };
}

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  throw new Error("Expected Firestore Timestamp");
}

function optionalString(key: string, value: unknown) {
  return typeof value === "string" && value ? { [key]: value } : {};
}

function asCancelNotice(value: unknown): CancelNotice | undefined {
  return value === "sent" || value === "failed" || value === "skipped"
    ? value
    : undefined;
}

function bookingFromDoc(doc: QueryDocumentSnapshot): Booking {
  const data = doc.data();
  const cancelNotice = asCancelNotice(data.cancelNotice);
  return {
    id: doc.id,
    name: String(data.name),
    phone: String(data.phone),
    ...optionalString("email", data.email),
    ...optionalString("customerTimezone", data.customerTimezone),
    ...optionalString("inviteUid", data.inviteUid),
    ...optionalString("inviteOrganizerEmail", data.inviteOrganizerEmail),
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
    status: data.status as BookingStatus,
    createdAt: toDate(data.createdAt),
    slotId: String(data.slotId),
    ...(data.cancelledAt instanceof Timestamp
      ? { cancelledAt: data.cancelledAt.toDate() }
      : {}),
    ...(cancelNotice ? { cancelNotice } : {}),
    ...optionalString("cancelNoticeReason", data.cancelNoticeReason),
  };
}

function overrideFromData(
  date: string,
  data: DocumentData | undefined,
): AvailabilityOverride | null {
  if (!data) return null;
  return {
    date,
    closed: Boolean(data.closed),
    hours: asTimeRanges(data.hours),
    blockedSlots: asStringArray(data.blockedSlots),
  };
}

export async function getBookingSettings(): Promise<BookingSettings> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.settings)
    .doc(SETTINGS_BOOKING_DOC)
    .get();

  return mergeSettings(snap.data());
}

export async function saveBookingSettings(
  settings: BookingSettings,
  fields?: (keyof BookingSettings)[],
): Promise<void> {
  await getAdminDb()
    .collection(COLLECTIONS.settings)
    .doc(SETTINGS_BOOKING_DOC)
    .set(
      {
        ...Object.fromEntries(
          Object.entries({
            timezone: settings.timezone,
            slotDurationMinutes: settings.slotDurationMinutes,
            weeklyHours: settings.weeklyHours,
            notifyEmails: settings.notifyEmails,
            minNoticeMinutes: settings.minNoticeMinutes,
            bookingWindowDays: settings.bookingWindowDays,
          }).filter(
            ([key]) => !fields || fields.includes(key as keyof BookingSettings),
          ),
        ),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/** Validate and save against the same snapshot used by booking transactions. */
export async function saveSettingsWithConflicts(
  changes: Partial<BookingSettings>,
  keepConflicts = false,
): Promise<{
  settings: BookingSettings;
  conflicts: Booking[];
  saved: boolean;
}> {
  const db = getAdminDb();
  const settingsRef = db
    .collection(COLLECTIONS.settings)
    .doc(SETTINGS_BOOKING_DOC);
  return db.runTransaction(async (tx) => {
    const current = await tx.get(settingsRef);
    const settings = { ...mergeSettings(current.data()), ...changes };
    const snap = await tx.get(
      db
        .collection(COLLECTIONS.bookings)
        .where("startsAt", ">=", Timestamp.now())
        .orderBy("startsAt"),
    );
    const bookings = snap.docs
      .map(bookingFromDoc)
      .filter((b) => b.status === "confirmed");
    const overrides = new Map<string, AvailabilityOverride | null>();
    for (const booking of bookings) {
      const date = formatInTimeZone(
        booking.startsAt,
        settings.timezone,
        "yyyy-MM-dd",
      );
      if (!overrides.has(date)) {
        const override = await tx.get(
          db.collection(COLLECTIONS.availabilityOverrides).doc(date),
        );
        overrides.set(date, overrideFromData(date, override.data()));
      }
    }
    const conflicts = bookings.filter(
      (b) =>
        !isBookingWithinAvailability(
          b,
          settings,
          overrides.get(
            formatInTimeZone(b.startsAt, settings.timezone, "yyyy-MM-dd"),
          ) ?? null,
        ),
    );
    const saved = keepConflicts || conflicts.length === 0;
    if (saved)
      tx.set(
        settingsRef,
        { ...changes, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    return { settings, conflicts, saved };
  });
}

export async function getAvailabilityOverride(
  date: string,
): Promise<AvailabilityOverride | null> {
  if (!isValidDateString(date)) {
    throw new BookingError(`Invalid date: ${date}`, "INVALID_DATE");
  }

  const snap = await getAdminDb()
    .collection(COLLECTIONS.availabilityOverrides)
    .doc(date)
    .get();

  return overrideFromData(date, snap.data());
}

export async function saveAvailabilityOverride(
  override: AvailabilityOverride,
): Promise<Timestamp> {
  if (!isValidDateString(override.date)) {
    throw new BookingError(`Invalid date: ${override.date}`, "INVALID_DATE");
  }

  const payload: DocumentData = {
    closed: Boolean(override.closed),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (override.hours !== undefined) {
    payload.hours = override.hours;
  }
  if (override.blockedSlots !== undefined) {
    payload.blockedSlots = override.blockedSlots;
  }

  const result = await getAdminDb()
    .collection(COLLECTIONS.availabilityOverrides)
    .doc(override.date)
    .set(payload, { merge: true });
  return result.writeTime;
}

export async function deleteAvailabilityOverride(date: string): Promise<void> {
  if (!isValidDateString(date)) {
    throw new BookingError(`Invalid date: ${date}`, "INVALID_DATE");
  }

  await getAdminDb()
    .collection(COLLECTIONS.availabilityOverrides)
    .doc(date)
    .delete();
}

/** `from` and `to` are inclusive `YYYY-MM-DD` bounds on the override date. */
export async function listAvailabilityOverrides(range?: {
  from?: string;
  to?: string;
}): Promise<AvailabilityOverride[]> {
  let q: Query = getAdminDb()
    .collection(COLLECTIONS.availabilityOverrides)
    .orderBy("__name__", "asc");

  if (range?.from) {
    q = q.where("__name__", ">=", range.from);
  }
  if (range?.to) {
    q = q.where("__name__", "<=", range.to);
  }

  const snap = await q.get();

  return snap.docs
    .map((doc) => overrideFromData(doc.id, doc.data()))
    .filter((item): item is AvailabilityOverride => item !== null);
}

async function getBookedRangesForDate(
  date: string,
  timezone: string,
): Promise<Booking[]> {
  const dayStart = fromZonedTime(`${date}T00:00:00`, timezone);
  const nextDate = addDays(new Date(`${date}T12:00:00Z`), 1)
    .toISOString()
    .slice(0, 10);
  const dayEnd = fromZonedTime(`${nextDate}T00:00:00`, timezone);

  const snap = await getAdminDb()
    .collection(COLLECTIONS.bookings)
    .where("status", "==", "confirmed")
    .where("endsAt", ">", Timestamp.fromDate(dayStart))
    .where("startsAt", "<", Timestamp.fromDate(dayEnd))
    .orderBy("endsAt")
    .orderBy("startsAt")
    .get();
  return snap.docs
    .map(bookingFromDoc)
    .filter(
      (booking) => booking.status === "confirmed" && booking.startsAt < dayEnd,
    );
}

export async function listAvailableSlots(date: string): Promise<Slot[]> {
  if (!isValidDateString(date))
    throw new BookingError(`Invalid date: ${date}`, "INVALID_DATE");
  const settings = await getBookingSettings();
  if (!isDateWithinBookingWindow(date, settings)) return [];
  const [override, bookedRanges] = await Promise.all([
    getAvailabilityOverride(date),
    getBookedRangesForDate(date, settings.timezone),
  ]);
  return getAvailableSlots({ date, settings, override, bookedRanges });
}

export async function findConflictingBookings(input: {
  settings: BookingSettings;
  overrides: Map<string, AvailabilityOverride | null>;
  from?: Date;
  to?: Date;
}): Promise<Booking[]> {
  const bookings = await listBookings({
    from: input.from ?? new Date(),
    to: input.to,
    status: "confirmed",
  });
  const overrides = new Map(input.overrides);
  const dates = [
    ...new Set(
      bookings.map((b) =>
        formatInTimeZone(b.startsAt, input.settings.timezone, "yyyy-MM-dd"),
      ),
    ),
  ];
  await Promise.all(
    dates
      .filter((date) => !overrides.has(date))
      .map(async (date) => {
        overrides.set(date, await getAvailabilityOverride(date));
      }),
  );
  return bookings.filter(
    (b) =>
      !isBookingWithinAvailability(
        b,
        input.settings,
        overrides.get(
          formatInTimeZone(b.startsAt, input.settings.timezone, "yyyy-MM-dd"),
        ) ?? null,
      ),
  );
}

export async function listBookings(options?: {
  from?: Date;
  to?: Date;
  status?: BookingStatus;
}): Promise<Booking[]> {
  let q: Query = getAdminDb()
    .collection(COLLECTIONS.bookings)
    .orderBy("startsAt", "asc");

  if (options?.from) {
    q = q.where("startsAt", ">=", Timestamp.fromDate(options.from));
  }
  if (options?.to) {
    q = q.where("startsAt", "<", Timestamp.fromDate(options.to));
  }

  const snap = await q.get();
  let bookings = snap.docs.map((doc) => bookingFromDoc(doc));

  if (options?.status) {
    bookings = bookings.filter((booking) => booking.status === options.status);
  }

  return bookings;
}

export async function getBooking(id: string): Promise<Booking | null> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.bookings)
    .doc(id)
    .get();
  if (!snap.exists) return null;
  return bookingFromDoc(snap as QueryDocumentSnapshot);
}

/** Settings, overrides, notice and overlaps are rechecked inside the transaction. */
export async function createBooking(
  input: CreateBookingInput,
): Promise<Booking> {
  const fields = validateBookingFields(input.name, input.phone, input.email);
  if (!fields.ok) throw new BookingError(fields.error, "VALIDATION");
  if (!(input.startsAt instanceof Date) || Number.isNaN(+input.startsAt)) {
    throw new BookingError("Invalid appointment time.", "VALIDATION");
  }
  const db = getAdminDb();
  const bookingRef = db.collection(COLLECTIONS.bookings).doc();
  return db.runTransaction(async (tx) => {
    const settingsSnap = await tx.get(
      db.collection(COLLECTIONS.settings).doc(SETTINGS_BOOKING_DOC),
    );
    const settings = mergeSettings(settingsSnap.data());
    const date = formatInTimeZone(
      input.startsAt,
      settings.timezone,
      "yyyy-MM-dd",
    );
    const overrideSnap = await tx.get(
      db.collection(COLLECTIONS.availabilityOverrides).doc(date),
    );
    const override = overrideFromData(date, overrideSnap.data());
    const match = generateDaySlots(date, settings, override).find(
      (slot) => +slot.startsAt === +input.startsAt,
    );
    if (!match || match.startsAt <= new Date())
      throw new BookingError(
        "That time slot is no longer available.",
        "SLOT_UNAVAILABLE",
      );
    const lockRefs = bookingLockDates(match.startsAt, match.endsAt).map((day) =>
      db.collection(COLLECTIONS.bookingDays).doc(day),
    );
    // Explicit shared reads AND writes force concurrent overlapping requests to retry.
    for (const ref of lockRefs) await tx.get(ref);
    const candidates = await tx.get(
      db
        .collection(COLLECTIONS.bookings)
        .where("status", "==", "confirmed")
        .where("endsAt", ">", Timestamp.fromDate(match.startsAt))
        .where("startsAt", "<", Timestamp.fromDate(match.endsAt))
        .orderBy("endsAt")
        .orderBy("startsAt"),
    );
    const bookedRanges = candidates.docs
      .map(bookingFromDoc)
      .filter((b) => b.status === "confirmed" && rangesOverlap(b, match));
    const available = getAvailableSlots({
      date,
      settings,
      override,
      bookedRanges,
    });
    if (!available.some((slot) => +slot.startsAt === +match.startsAt)) {
      throw new BookingError(
        "That time slot is no longer available.",
        "SLOT_UNAVAILABLE",
      );
    }
    const now = Timestamp.now();
    const identity = fields.value.email ? inviteIdentity(bookingRef.id) : {};
    const booking: Booking = {
      id: bookingRef.id,
      ...fields.value,
      ...identity,
      ...(input.timezone ? { customerTimezone: input.timezone } : {}),
      startsAt: match.startsAt,
      endsAt: match.endsAt,
      slotId: match.slotId,
      status: "confirmed",
      createdAt: now.toDate(),
    };
    const { id: _id, ...data } = booking;
    void _id;
    // Settings saves read this document, so a booking committed during their
    // conflict check forces a retry with the newly committed booking included.
    tx.set(
      db.collection(COLLECTIONS.settings).doc(SETTINGS_BOOKING_DOC),
      { bookingRevision: FieldValue.increment(1) },
      { merge: true },
    );
    tx.set(bookingRef, {
      ...data,
      startsAt: Timestamp.fromDate(match.startsAt),
      endsAt: Timestamp.fromDate(match.endsAt),
      createdAt: now,
    });
    for (const ref of lockRefs)
      tx.set(
        ref,
        { lastBookingAt: now, count: FieldValue.increment(1) },
        { merge: true },
      );
    return booking;
  });
}

export type OverrideCancellationGuard = { date: string; version: Timestamp };

export async function cancelBooking(
  id: string,
  overrideGuard?: OverrideCancellationGuard,
): Promise<{ booking: Booking; changed: boolean }> {
  const ref = getAdminDb().collection(COLLECTIONS.bookings).doc(id);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new BookingError("Booking not found.", "NOT_FOUND");
    const booking = bookingFromDoc(snap as QueryDocumentSnapshot);
    if (booking.status === "cancelled") return { booking, changed: false };
    if (overrideGuard) {
      const override = await tx.get(
        getAdminDb()
          .collection(COLLECTIONS.availabilityOverrides)
          .doc(overrideGuard.date),
      );
      if (!override.updateTime?.isEqual(overrideGuard.version))
        throw new BookingError(
          "Availability changed while cancelling. Refresh and review the affected bookings.",
          "VALIDATION",
        );
    }
    const cancelledAt = Timestamp.now();
    tx.update(ref, {
      status: "cancelled",
      cancelledAt,
      cancelNotice: null,
      cancelNoticeReason:
        "Notification result pending. Check before contacting the customer.",
    });
    return {
      booking: {
        ...booking,
        status: "cancelled",
        cancelledAt: cancelledAt.toDate(),
      },
      changed: true,
    };
  });
}

export async function recordCancelNotice(
  id: string,
  notice: CancelNotice,
  reason?: string,
): Promise<void> {
  await getAdminDb()
    .collection(COLLECTIONS.bookings)
    .doc(id)
    .update({
      cancelNotice: notice,
      cancelNoticeAt: FieldValue.serverTimestamp(),
      cancelNoticeReason: reason ?? null,
    });
}
