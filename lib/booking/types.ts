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

/** Outcome of the customer cancellation email. */
export type CancelNotice = "sent" | "failed" | "skipped";

export type Booking = {
  id: string;
  name: string;
  phone: string;
  /** Only present when the customer asked for a calendar invite. */
  email?: string;
  /** Visitor's IANA timezone at booking time. Missing on older bookings. */
  customerTimezone?: string;
  /**
   * `UID` of the customer's calendar invite. A cancellation must reuse it
   * verbatim, or the original event stays in the customer's calendar.
   */
  inviteUid?: string;
  inviteOrganizerEmail?: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  createdAt: Date;
  slotId: string;
  cancelledAt?: Date;
  cancelNotice?: CancelNotice;
  cancelNoticeReason?: string;
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
  /** Already-validated IANA timezone of the visitor. */
  timezone?: string;
  /** Slot start instant (UTC Date). Must match a generated available slot. */
  startsAt: Date;
};
