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
  minNoticeMinutes: number;
  bookingWindowDays: number;
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
  /** Optional address for confirmation and cancellation notices. */
  email?: string;
  customerTimezone?: string;
  inviteUid?: string;
  inviteOrganizerEmail?: string;
  cancelledAt?: Date;
  cancelNotice?: "sent" | "failed" | "skipped" | null;
  cancelNoticeAt?: Date;
  cancelNoticeReason?: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  createdAt: Date;
  slotId: string;
};

export type Slot = {
  /** Readable local-time label; availability uses real time ranges. */
  slotId: string;
  startsAt: Date;
  endsAt: Date;
};

export type CreateBookingInput = {
  name: string;
  phone: string;
  email?: string;
  customerTimezone?: string;
  /** Slot start instant (UTC Date). Must match a generated available slot. */
  startsAt: Date;
};
