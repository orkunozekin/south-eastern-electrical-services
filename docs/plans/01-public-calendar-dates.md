# 01 — Public calendar ignores saved settings

**Type:** Bug · **Size:** Small · **Depends on:** —

## Problem

The row of date buttons on `/book` is built from the hard-coded
`DEFAULT_BOOKING_SETTINGS` instead of the settings saved in Firestore:

```ts
// app/(site)/book/data.ts
timezone: DEFAULT_BOOKING_SETTINGS.timezone,
dates: getBookableDateStrings(DEFAULT_BOOKING_SETTINGS),
```

Time slots for a selected day _are_ correct, because `fetchSlotsAction` reads
live settings. Only the list of days is wrong. As a result:

- **Weekend days never appear**, even when Saturday or Sunday is enabled in
  Admin → Availability.
- **Disabled weekdays still appear**, and show "No open times on this day".
- **Dates closed by an override still appear**, with the same empty message.
- **The business timezone is ignored** when working out "today" and when
  labelling date chips.

### How it got this way

Commit `d39f4b8` ("Prevent /book crash from firebase-admin jose ESM failure")
moved `getBookingPageData` out of the server-actions file so the page no longer
imports `firebase-admin` during render. The dates were switched to defaults as
part of that workaround. The comment says "live settings load client-side via
actions", but that was never wired up for dates.

## Goals

- The date list reflects saved weekly hours, timezone, and closed-day
  overrides.
- Don't reintroduce the `firebase-admin` / `jose` SSR crash.

## Non-goals

- Hiding days that are fully booked. That's possible, but it costs one slot
  query per day. Revisit if the client asks.
- Changing the 14-day window (see [05](./05-booking-notice-window.md)).

## Design

Follow the pattern that already works for slots: load the dates through a
server action that dynamically imports `@/lib/booking/server`.

### New server action

In `app/actions/booking.ts`:

```ts
export async function fetchBookingCalendarAction(): Promise<
  { ok: true; timezone: string; dates: string[] } | { ok: false; error: string }
>;
```

It will:

1. Load `getBookingSettings()` and `listAvailabilityOverrides()` in parallel.
2. Call `getBookableDateStrings(settings)`.
3. Filter out dates whose override has `closed: true`.
4. Return `{ timezone: settings.timezone, dates }`.

`listAvailabilityOverrides()` currently returns every override ever saved. Add
an optional `{ from, to }` date-string range so this action only reads the
window it needs (document IDs are `YYYY-MM-DD`, so a `__name__` range query
works).

### Wizard changes (`components/booking-wizard.tsx`)

- Hold `dates` and `timezone` in state, initialised from props.
- On mount, call `fetchBookingCalendarAction()`. On success, replace the dates
  and timezone. If the currently selected date isn't in the new list, select
  the first new date. On failure, keep the defaults (current behaviour).
- While loading, show the date row in a muted "Loading days…" state instead of
  showing defaults that are about to change. This avoids a visible jump from
  Mon–Fri to the real list.
- Don't fetch slots until the calendar has loaded. Otherwise the first slot
  fetch runs against a default date that may be replaced a moment later.
- **Refetch when the selected day is clicked again.** Today slots load only in
  a `useEffect` keyed on `selectedDate`, so clicking the already-selected day
  does nothing, and a customer who's had the page open a while keeps seeing
  stale times. Keep a `slotsRequestId` counter that `selectDate` increments on
  every click, and include it in the effect's dependencies.

### Page (`app/(site)/book/page.tsx` / `data.ts`)

No structural change. `getBookingPageData()` stays as the SSR-safe fallback.
Update its comment to say the defaults are a first-paint and error fallback
only.

## Implementation steps

- [x] Add optional date range to `listAvailabilityOverrides` in
      `lib/booking/repository.ts`
- [x] Add `fetchBookingCalendarAction` to `app/actions/booking.ts`
- [x] Wizard: dates/timezone state, fetch on mount, loading state, reselect
      logic, gate slot fetch
- [x] Update the comment in `app/(site)/book/data.ts`
- [ ] Remove `revalidatePath("/book")` calls in `app/actions/admin.ts` if
      they're no longer meaningful (the page has no server-fetched data).
      Harmless either way, so optional. _(Skipped: left in place.)_
- [x] Wizard: refetch slots when the selected day is clicked again
- [x] Update `docs/admin-guide.md`: remove the weekends note in §5.1 and the
      "weekdays only" note in §9, and remove "offering weekend callbacks" from
      §11. In the §9 "Changes take effect right away" item, drop the
      "clicking the same day again doesn't refresh it" caveat.

## Handoff

**Status:** Implemented and manually tested. PR open.

- The action loads settings first, then overrides, rather than in parallel,
  because the override date range depends on the business timezone.
- The admin guide also had stale text in §5.2 ("Close a whole day") and the §10
  troubleshooting row about "No open times"; both are updated.
- Verified: `tsc`, format check, `npm run build` (`/book` still prerenders),
  the loading state, the live date list, and that re-clicking a day triggers a
  new slot fetch. Lint has only the known `use-viewer-timezone.ts` error.
- Manual checks: weekend, weekday, and override checks ran against production
  Firestore for about a minute, then settings were restored exactly. The
  timezone check used `getBookableDateStrings` with a fake clock instead of
  changing the live timezone. The saved timezone is `America/Chicago`, not
  the Eastern default, so this fix also changes "today" on the live site.
- Remaining: none.

## Testing

Unit tests (if Vitest is added): `getBookableDateStrings` with weekend hours
enabled and with a non-Eastern timezone.

Manual:

- [x] Enable Saturday in admin, then Saturdays appear on `/book` and show slots
- [x] Disable Wednesday, then Wednesdays disappear
- [x] Close a date with an override, and that date disappears
- [x] Set timezone to Pacific, and near midnight Eastern the "today" chip is
      the correct Pacific date _(verified with a fake clock, not live)_
- [x] `/book` renders with Firebase env vars unset (fallback path, no crash)
- [x] `npm run build` succeeds (the original crash was a build/SSR failure)

## Risks

- **First-paint flash:** mitigated by the loading state.
- **Crash regression:** the new action must import `@/lib/booking/server`
  dynamically (as the existing actions do), never at module top level.
