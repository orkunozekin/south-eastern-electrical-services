/** Sunday = 0 … Saturday = 6 (matches Date.getDay / date-fns). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Local wall-clock range in `HH:mm` (24h). */
export type TimeRange = {
  start: string;
  end: string;
};

export type WeeklyHours = Partial<Record<DayOfWeek, TimeRange[]>>;

export type BookingSettings = {
  timezone: string;
  slotDurationMinutes: number;
  weeklyHours: WeeklyHours;
  notifyEmails: string[];
};

export type AvailabilityOverride = {
  date: string;
  closed?: boolean;
  /** Replaces that day's weekly hours when set. */
  hours?: TimeRange[];
  /** Slot start times (`HH:mm`) that are blocked. */
  blockedSlots?: string[];
};

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  id: string;
  name: string;
  phone: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  createdAt: Date;
  slotId: string;
};

export type Slot = {
  /** Idempotent id used as Firestore `slots/{slotId}` doc id. */
  slotId: string;
  startsAt: Date;
  endsAt: Date;
};

export type CreateBookingInput = {
  name: string;
  phone: string;
  /** Slot start instant (UTC Date). Must match a generated available slot. */
  startsAt: Date;
};
