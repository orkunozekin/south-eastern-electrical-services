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

**Changing the business timezone** causes the same problem, because slot IDs
use the local time in the business timezone. A 10:00 AM Eastern booking is
`…_1000`. After switching to Central, the same moment is the 9:00 AM Central
slot (`…_0900`), which isn't marked booked, so it's offered again. Meanwhile
the unrelated 10:00 AM Central slot is wrongly treated as taken. The overlap
check below fixes this too, because it compares real times rather than
local-time IDs.

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
grid change) lock different documents, so both can succeed.

A transactional query for overlapping bookings isn't enough on its own either.
If two overlapping requests run at the same moment, each query can see no
existing booking, and the two transactions write different documents, so
neither conflicts with the other. Both would commit.

Fix: give every booking transaction **one shared document to contend on per
business day**, then check for overlaps while holding it.

1. **Day lock document:** `bookingDays/{yyyy-MM-dd}`, keyed by the booking's
   start date in the business timezone (the same date prefix `slotIdForStart`
   already uses).
2. In the `createBooking` transaction, in this order:
   1. `tx.get(dayRef)`. The document may not exist yet; Firestore still tracks
      the read.
   2. `tx.get(slotRef)`, the existing exact-slot check (kept as a fast
      rejection).
   3. Query overlapping bookings:

      ```ts
      const overlapping = await tx.get(
        db
          .collection("bookings")
          .where(
            "startsAt",
            ">=",
            Timestamp.fromDate(subMinutes(match.startsAt, MAX_SLOT_MINUTES)),
          )
          .where("startsAt", "<", Timestamp.fromDate(match.endsAt)),
      );
      // reject if any doc has status "confirmed" and endsAt > match.startsAt
      ```

      `MAX_SLOT_MINUTES` is 120, the highest slot length Settings allows. That
      bounds how early an overlapping booking can start, so the query doesn't
      depend on day boundaries.

   4. Write the booking, the slot document, and
      `tx.set(dayRef, { lastBookingAt: now, count: FieldValue.increment(1) }, { merge: true })`.

Every booking on a day writes the same day document, so two concurrent
bookings on that day always conflict. Firestore aborts and retries one of them,
including when both read the day document before it existed. On retry, its
overlap query sees the other booking and rejects it with the usual "That time
slot is no longer available." At this business's volume, serialising bookings
per day costs nothing noticeable.

The range query is on a single field (`startsAt`), so it needs no composite
index.

**Why a per-day key is enough.** The day document only has to serialise
bookings that are _in flight at the same time_. Bookings that already exist are
found by the overlap query, which compares real times, so it works across slot
length and timezone changes. Two concurrent overlapping requests are computed
with the same settings. Slots never cross midnight in the business timezone,
so both requests get the same date key and contend on the same document. The
only gap is a settings change landing between two in-flight requests, which is
a window of milliseconds.

`cancelBooking` doesn't need to touch the day document: freeing time can't
create an overlap.

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
- [ ] `createBooking` transaction: read and write a `bookingDays/{date}` lock
      document, then run the overlapping-bookings query before writing
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
- [ ] Change the business timezone with a booking at 10:00 AM ET: the
      equivalent 9:00 AM CT slot isn't offered, and 10:00 AM CT is
- [ ] Concurrency: a local script against the **Firestore emulator** (not
      production; see `AGENTS.md`) that calls `createBooking` many times in
      parallel for overlapping slots with different IDs (e.g. 9:00–10:00 and
      9:30–10:00). Exactly one succeeds each time. Run it with and without the
      day document, to confirm the test catches the bug.
- [ ] Block `09:15` on a 30-minute grid: rejected with the list of valid times

## Risks

- **Cancelled-booking `slots` docs:** `cancelBooking` sets `booked: false` on
  the slot document. With bookings as the source of truth, stale `slots` docs
  can't block anything, so this is fine. The lock document just gets
  overwritten on the next booking.
- **New collection:** `bookingDays` holds one small document per day that has
  had a booking. It needs no cleanup, and `scripts/clear-bookings.mjs` should
  delete it alongside `bookings` and `slots`.
- **Behaviour change in one function:** both `/book` and `createBooking` use
  `getAvailableSlots`, so one change fixes both paths. Test both.
