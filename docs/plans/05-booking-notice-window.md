# 05 — Minimum booking notice and booking window

**Type:** Feature · **Size:** Small–Medium · **Depends on:** [01](./01-public-calendar-dates.md)
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
- The admin can **extend or shrink** how far ahead customers can book (the
  booking window, 14 days today) from Admin → Settings at any time, with no
  developer involvement.
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
- **Window check in `listAvailableSlots`** (`lib/booking/repository.ts`): if
  the date is before today or after the last date in the window (both in the
  business timezone), return `[]`. Both public paths go through this one
  function:
  - `fetchSlotsAction` → `listAvailableSlots`, so an out-of-window date shows
    "No open times on this day" instead of offering slots that would fail on
    submit.
  - `createBooking` → `listAvailableSlots`, so a direct submission for an
    out-of-window time is rejected with the usual "That time slot is no longer
    available."
- The notice filter lives in `getAvailableSlots`, which `listAvailableSlots`
  calls, so it's enforced on both paths the same way.

### Booking window behaviour

- **How it's counted:** the window counts calendar days, starting with today in
  the business timezone. It matches the current logic: `14` means today plus
  the next 13 days. Days with no hours (e.g. weekends off) still count towards
  the window; they just don't appear as date buttons.
- **Extending** (e.g. 14 → 60): the extra dates appear on `/book` straight
  away, once plan 01 is in. Any closed-day overrides the admin needs for those
  further-out dates (holidays, vacations) now matter sooner. The Settings help
  text should say so.
- **Shrinking** (e.g. 14 → 7): dates beyond the new window disappear from
  `/book`, and new bookings for them are rejected. **Existing bookings beyond
  the new window are kept.** They were valid when made, and they still show on
  the Bookings page as normal. There's no cancelling or warning, because the
  business is still available at those times; it just isn't taking _new_
  bookings that far out.
- **Ranges:** 1–90 days to start with. If the client wants to take bookings
  months ahead, raise the cap; nothing else depends on it. Check how the
  public calendar handles it (below) first.

### Public calendar with longer windows

Today the date buttons are one horizontally scrolling row, which is fine for
14 days but awkward for 60 or 90 (up to about 65 weekday buttons). For windows
over about 3 weeks:

- Show one week at a time, with **← Previous week / Next week →** controls and
  a "Week of Oct 5" label.
- Disable "Previous" on the current week and "Next" on the last week inside
  the window.
- Keep the single row as-is when the window is 21 days or less, so nothing
  changes visually at the default.

Slots are still fetched one day at a time, so a longer window adds no loading
cost until a customer clicks a day.

### Admin UI

In `components/admin-settings-form.tsx` and `saveAdminSettingsAction`:

- **Minimum notice:** a select with friendly options (No minimum, 30 minutes,
  1 hour, 2 hours, 4 hours, Next day / 24 hours) rather than a raw minutes box.
- **Booking window ("How far ahead customers can book"):**
  - Quick-pick buttons: **1 week**, **2 weeks**, **1 month (30 days)**,
    **2 months (60 days)**, **3 months (90 days)**.
  - A **custom** number-of-days input (1–90) next to them, kept in sync with
    the quick picks.
  - Live help text that confirms the result in plain terms: "Customers can book
    up to 14 days ahead, through **Mon, Oct 12**."
  - A note when shrinking: "Existing bookings after this date are kept."
- Validate both in the action, like `slotDurationMinutes`. For example,
  "Booking window must be between 1 and 90 days."

## Implementation steps

- [x] Types, defaults, `mergeSettings`, `saveBookingSettings`
- [x] `getAvailableSlots` notice filter
- [x] Window from settings in `fetchBookingCalendarAction` (plan 01)
- [x] Window check in `listAvailableSlots` (covers both `fetchSlotsAction`
      and `createBooking`)
- [x] Settings form fields and action validation
- [x] Booking window control: quick picks, custom days input, "through
      <date>" help text, shrink note
- [x] Public calendar: week-at-a-time navigation when the window is over 21
      days
- [x] Unit tests: notice boundary, window length (1, 14, 90; window spanning a
      daylight-saving change)
- [x] Update `docs/admin-guide.md`: new §6 subsections; §9 "customers can book
      up to about 2 weeks ahead" and "no minimum notice"; §8 vacation recipe;
      remove "changing the booking window" from §11

## Testing

- [ ] Notice set to 2 hours: slots within 2 hours of now aren't offered, and
      submitting one directly is rejected
- [ ] Window set to 30 days: `/book` shows 30 days of dates. Calling
      `fetchSlotsAction` directly for day 31 returns no slots, and submitting
      a day-31 time to `submitBookingAction` is rejected.
- [ ] Extend 14 → 60: new dates appear on `/book` without a redeploy, and the
      week navigation appears
- [ ] Shrink 14 → 7 with a booking on day 10: day 10 disappears from `/book`,
      the existing booking is still on the Bookings page, and cancelling it
      still works
- [ ] Quick picks and custom input stay in sync; 0 and 91 are rejected with a
      clear message
- [ ] Existing settings doc without the new fields loads with defaults (14
      days, so nothing changes on deploy)

## Implementation handoff

Settings, server enforcement, quick picks, custom window help text, and week navigation are implemented and tested. Minimum notice defaults to 0, preserving live behaviour until the client chooses a value; the client-recommended 60-minute default was not silently enabled. Window counts today plus N−1 calendar days. DST-safe date enumeration and exact notice boundaries have unit coverage; direct out-of-window submissions are rejected in the emulator. Existing bookings remain unchanged when the window shrinks.

Verified for this PR: 31 unit tests, TypeScript, lint, and formatting. The preceding CI input-type failure is fixed. Calendar selection regression tests cover an empty first week, retained week zero, and no offered dates. No production settings, bookings, or emails were changed. Original manual checklists above remain unchecked where real provider/client testing has not been performed.
