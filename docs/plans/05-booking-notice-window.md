# 05 — Minimum booking notice and booking window

**Type:** Feature · **Size:** Small · **Depends on:** [01](./01-public-calendar-dates.md)
(the calendar must read live settings for the window to take effect)

## Problem

- **No minimum notice:** `getAvailableSlots` only hides slots that have already
  started (`slot.startsAt <= now`). A customer can book a call starting in a
  minute, which the business may not see in time.
- **Fixed 14-day window:** `getBookableDateStrings(settings, daysAhead = 14)`
  is hard-coded. The client can't open bookings further ahead, or limit them
  to the next few days.

## Goals

- The admin can set a **minimum notice** (e.g. "at least 2 hours ahead").
- The admin can set **how many days ahead** customers can book.
- Both are enforced on the server, not only hidden in the UI.

## Design

### Settings

Add two fields to `BookingSettings` (`lib/booking/types.ts`) and defaults
(`lib/booking/defaults.ts`):

| Field               | Default | Allowed                |
| ------------------- | ------- | ---------------------- |
| `minNoticeMinutes`  | `60`    | 0–10080 (up to 7 days) |
| `bookingWindowDays` | `14`    | 1–90                   |

`mergeSettings` in the repository must fall back to the defaults when the
fields are missing from existing Firestore docs.

Defaulting `minNoticeMinutes` to 60 changes live behaviour on deploy (it's 0
today). Confirm with the client. Use `0` if they'd rather keep the current
behaviour until they choose.

### Enforcement

- `getAvailableSlots`: filter
  `slot.startsAt <= addMinutes(now, settings.minNoticeMinutes)`.
- `getBookableDateStrings(settings, settings.bookingWindowDays, now)`: pass the
  setting through from plan 01's `fetchBookingCalendarAction`.
- `createBooking` already re-checks via `listAvailableSlots`, so the notice is
  enforced server-side automatically. Add a window check there too (reject
  dates beyond `bookingWindowDays`), because `fetchSlotsAction` accepts any
  valid date string.

### Admin UI

In `components/admin-settings-form.tsx` and `saveAdminSettingsAction`:

- **Minimum notice:** a select with friendly options (No minimum, 30 minutes,
  1 hour, 2 hours, 4 hours, Next day / 24 hours) rather than a raw minutes box.
- **Booking window:** a number input in days (1–90).
- Validate both in the action, like `slotDurationMinutes`.

## Implementation steps

- [ ] Types, defaults, `mergeSettings`, `saveBookingSettings`
- [ ] `getAvailableSlots` notice filter
- [ ] Window from settings in `fetchBookingCalendarAction` (plan 01)
- [ ] Window check in `createBooking`
- [ ] Settings form fields and action validation
- [ ] Unit tests: notice boundary, window length
- [ ] Update `docs/admin-guide.md`: new §6 subsections; §9 "customers can book
      up to about 2 weeks ahead" and "no minimum notice"; §8 vacation recipe;
      remove "changing the booking window" from §11

## Testing

- [ ] Notice set to 2 hours: slots within 2 hours of now aren't offered, and
      submitting one directly is rejected
- [ ] Window set to 30 days: `/book` shows 30 days of dates, and day 31 is
      rejected by `fetchSlotsAction` / `createBooking`
- [ ] Existing settings doc without the new fields loads with defaults
