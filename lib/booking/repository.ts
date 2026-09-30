import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { formatInTimeZone } from "date-fns-tz";

import { getAdminDb } from "@/lib/firebase/admin";

import {
  COLLECTIONS,
  DEFAULT_BOOKING_SETTINGS,
  SETTINGS_BOOKING_DOC,
} from "./defaults";
import { getAvailableSlots, slotIdForStart } from "./slots";
import type {
  AvailabilityOverride,
  Booking,
  BookingSettings,
  BookingStatus,
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

function mergeSettings(data: DocumentData | undefined): BookingSettings {
  if (!data) return { ...DEFAULT_BOOKING_SETTINGS };

  return {
    timezone:
      typeof data.timezone === "string"
        ? data.timezone
        : DEFAULT_BOOKING_SETTINGS.timezone,
    slotDurationMinutes:
      typeof data.slotDurationMinutes === "number" &&
        data.slotDurationMinutes > 0
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

function bookingFromDoc(doc: QueryDocumentSnapshot): Booking {
  const data = doc.data();
  return {
    id: doc.id,
    name: String(data.name),
    phone: String(data.phone),
    ...(typeof data.email === "string" && data.email
      ? { email: data.email }
      : {}),
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
    status: data.status as BookingStatus,
    createdAt: toDate(data.createdAt),
    slotId: String(data.slotId),
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
): Promise<void> {
  await getAdminDb()
    .collection(COLLECTIONS.settings)
    .doc(SETTINGS_BOOKING_DOC)
    .set(
      {
        timezone: settings.timezone,
        slotDurationMinutes: settings.slotDurationMinutes,
        weeklyHours: settings.weeklyHours,
        notifyEmails: settings.notifyEmails,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
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
): Promise<void> {
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

  await getAdminDb()
    .collection(COLLECTIONS.availabilityOverrides)
    .doc(override.date)
    .set(payload, { merge: true });
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

async function getTakenSlotIdsForDate(date: string): Promise<Set<string>> {
  const prefix = `${date}_`;
  const snap = await getAdminDb()
    .collection(COLLECTIONS.slots)
    .where("__name__", ">=", prefix)
    .where("__name__", "<", `${prefix}\uf8ff`)
    .get();

  const taken = new Set<string>();
  for (const doc of snap.docs) {
    if (doc.data().booked) {
      taken.add(doc.id);
    }
  }
  return taken;
}

export async function listAvailableSlots(date: string): Promise<Slot[]> {
  if (!isValidDateString(date)) {
    throw new BookingError(`Invalid date: ${date}`, "INVALID_DATE");
  }

  const [settings, override, takenSlotIds] = await Promise.all([
    getBookingSettings(),
    getAvailabilityOverride(date),
    getTakenSlotIdsForDate(date),
  ]);

  return getAvailableSlots({
    date,
    settings,
    override,
    takenSlotIds,
  });
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

/**
 * Creates a confirmed booking in a transaction.
 * Locks the slot doc so concurrent requests cannot double-book.
 */
export async function createBooking(
  input: CreateBookingInput,
): Promise<Booking> {
  const fields = validateBookingFields(input.name, input.phone, input.email);
  if (!fields.ok) {
    throw new BookingError(fields.error, "VALIDATION");
  }

  if (
    !(input.startsAt instanceof Date) ||
    Number.isNaN(input.startsAt.getTime())
  ) {
    throw new BookingError("Invalid appointment time.", "VALIDATION");
  }

  const settings = await getBookingSettings();
  const date = formatInTimeZone(
    input.startsAt,
    settings.timezone,
    "yyyy-MM-dd",
  );
  const slotId = slotIdForStart(input.startsAt, settings.timezone);

  const available = await listAvailableSlots(date);
  const match = available.find((slot) => slot.slotId === slotId);
  if (!match) {
    throw new BookingError(
      "That time slot is no longer available.",
      "SLOT_UNAVAILABLE",
    );
  }

  const db = getAdminDb();
  const bookingRef = db.collection(COLLECTIONS.bookings).doc();
  const slotRef = db.collection(COLLECTIONS.slots).doc(slotId);

  await db.runTransaction(async (tx) => {
    const slotSnap = await tx.get(slotRef);
    if (slotSnap.exists && slotSnap.data()?.booked) {
      throw new BookingError(
        "That time slot is no longer available.",
        "SLOT_UNAVAILABLE",
      );
    }

    const now = Timestamp.now();
    tx.set(slotRef, {
      booked: true,
      bookingId: bookingRef.id,
      startsAt: Timestamp.fromDate(match.startsAt),
      endsAt: Timestamp.fromDate(match.endsAt),
    });
    tx.set(bookingRef, {
      name: fields.value.name,
      phone: fields.value.phone,
      ...(fields.value.email ? { email: fields.value.email } : {}),
      startsAt: Timestamp.fromDate(match.startsAt),
      endsAt: Timestamp.fromDate(match.endsAt),
      status: "confirmed" satisfies BookingStatus,
      createdAt: now,
      slotId,
    });
  });

  const created = await getBooking(bookingRef.id);
  if (!created) {
    throw new Error("Booking write succeeded but document was not found.");
  }
  return created;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const db = getAdminDb();
  const bookingRef = db.collection(COLLECTIONS.bookings).doc(id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists) {
      throw new BookingError("Booking not found.", "NOT_FOUND");
    }

    const data = snap.data()!;
    if (data.status === "cancelled") {
      return;
    }

    const slotId = String(data.slotId);
    tx.update(bookingRef, {
      status: "cancelled" satisfies BookingStatus,
      cancelledAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      db.collection(COLLECTIONS.slots).doc(slotId),
      { booked: false, bookingId: null },
      { merge: true },
    );
  });

  const updated = await getBooking(id);
  if (!updated) {
    throw new BookingError("Booking not found.", "NOT_FOUND");
  }
  return updated;
}
