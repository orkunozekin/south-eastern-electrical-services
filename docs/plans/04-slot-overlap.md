# 04 — Prevent overlapping bookings after slot length changes

**Type:** Bug · **Size:** Medium · **Depends on:** —

## Problem

A slot is treated as "taken" only if a `slots/{slotId}` document with that
exact ID is marked `booked`. The ID is the slot's **start time**
(`yyyy-MM-dd_HHmm`, from `slotIdForStart`). The slot's length isn't part of it.

So when the slot length changes, existing bookings no longer line up with the
new grid:

- With 30-minute slots, a customer books **9:30–10:00** (`…_0930`).
- The admin changes the slot length to **60 minutes**. The new grid offers
  9:00–10:00 (`…_0900`), 10:00–11:00, and so on.
- `…_0900` isn't booked, so **9:00–10:00 is offered and can be booked**. It
  overlaps the existing 9:30 booking.

The same applies the other way (60 → 30 frees the second half of each existing
booking) and when weekly start times move off the old grid (e.g. 9:00 → 9:15).

A related problem: **blocked slots** in overrides are matched against the grid
by exact `HH:mm`. After a slot-length change, or when mistyped (e.g. `09:15`),
they silently block nothing.

## Goals

- A slot is unavailable if it **overlaps** any confirmed booking, whatever the
  grid.
- The double-booking guarantee still holds under concurrent requests.
- Blocked-slot entries that don't match a real slot are rejected when saving.

## Non-goals

- Changing how slots are generated (grid from each day's start time).

## Design

### Availability: overlap instead of ID match

`getAvailableSlots` in `lib/booking/slots.ts` currently takes
`takenSlotIds: Iterable<string>`. Change it to take
`bookedRanges: { startsAt: Date; endsAt: Date }[]` and filter out any slot
where `slot.startsAt < booked.endsAt && booked.startsAt < slot.endsAt`.

In `lib/booking/repository.ts`, replace `getTakenSlotIdsForDate` with
`getBookedRangesForDate(date, timezone)`. It queries `bookings` where
`startsAt` falls in that local day (converted to UTC bounds with
`fromZonedTime`) and keeps `status == "confirmed"`. Querying bookings instead
of `slots` makes the booking documents the source of truth. The `slots`
collection stays only as a lock (below).

A booking that starts before midnight and ends after it can't happen with
current slot generation (ranges are within one day), so a same-day query is
sufficient.

### Double-booking guard

Today the transaction locks one `slots/{slotId}` document. Two requests for
_different_ but overlapping slots (e.g. 9:00–10:00 and 9:30–10:00 during a
grid change) would lock different documents and both succeed.

Fix: inside the `createBooking` transaction, also run a transactional query:

```ts
const overlapping = await tx.get(
  db
    .collection("bookings")
    .where("startsAt", "<", Timestamp.fromDate(match.endsAt))
    .where("startsAt", ">=", Timestamp.fromDate(dayStartUtc)),
);
// reject if any confirmed doc has endsAt > match.startsAt
```

The Admin SDK supports queries in transactions, and they conflict correctly
with concurrent writes. Keep the existing slot-document lock as well; it's
cheap, and it's the fast path for the common same-grid case.

This is a range query on a single field (`startsAt`), so it needs no composite
index.

### Validate blocked slots on save

In `saveOverrideAction`, generate the day's slots with the current settings
(and no override). Reject any `blockedSlots` entry that isn't a generated
start time, with a message like:

> `09:15` isn't a slot start time on Oct 6. Available start times: 09:00,
> 09:30, 10:00, …

### Optional guard on slot-length changes

With the overlap fix, changing slot length is safe for new bookings. It's
still worth a notice in Settings when upcoming bookings exist: "You have 4
upcoming bookings of 30 minutes. They'll keep their length." Plan 03's
preview covers any that end up outside availability.

## Implementation steps

- [ ] `getAvailableSlots` takes booked ranges and filters by overlap
- [ ] `getBookedRangesForDate` replaces `getTakenSlotIdsForDate`
- [ ] `createBooking` transaction: add an overlapping-bookings query
- [ ] `saveOverrideAction`: validate blocked slots against the generated grid
- [ ] Settings: notice when upcoming bookings exist and slot length changes
- [ ] Unit tests for overlap filtering (if Vitest is added)
- [ ] Update `docs/admin-guide.md`: soften the §6.2 warning; replace the §5.2
      "nothing gets blocked" gotcha and the troubleshooting row with the new
      validation error

## Testing

Unit (`getAvailableSlots`):

- 30-minute booking at 9:30, 60-minute grid: the 9:00 slot is excluded
- 60-minute booking at 9:00, 30-minute grid: 9:00 and 9:30 are excluded
- Adjacent booking (9:00–9:30) doesn't exclude 9:30–10:00

Manual:

- [ ] Book 9:30 on 30-minute slots, switch to 60: 9:00 isn't offered on
      `/book`
- [ ] Two browsers booking overlapping slots at the same time: exactly one
      succeeds
- [ ] Block `09:15` on a 30-minute grid: rejected with the list of valid times

## Risks

- **Cancelled-booking `slots` docs:** `cancelBooking` sets `booked: false` on
  the slot document. With bookings as the source of truth, stale `slots` docs
  can't block anything, so this is fine. The lock document just gets
  overwritten on the next booking.
- **Behaviour change in one function:** both `/book` and `createBooking` use
  `getAvailableSlots`, so one change fixes both paths. Test both.
