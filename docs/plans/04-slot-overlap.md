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
`getBookedRangesForDate(date, timezone)`. It queries `bookings` whose
`startsAt` is in `[dayStart − MAX_SLOT_MINUTES, dayEnd)`, where `dayStart` and
`dayEnd` are that local day's bounds converted to UTC with `fromZonedTime`. It
keeps only `status == "confirmed"` bookings whose `endsAt > dayStart`.
Querying bookings instead of `slots` makes the booking documents the **only**
source of truth. The `slots` collection is no longer read or written (see
below).

The lookback of `MAX_SLOT_MINUTES` (120, the highest slot length Settings
allows) matters after a **timezone change**. A booking made under the old
timezone can start before midnight in the new one and end after it, for
example a late-evening Pacific booking viewed in Eastern. A query limited to
bookings that _start_ on the requested date would miss it, and would offer a
slot early the next day that overlaps its end. With the lookback, that booking
is included and the overlapping slot is hidden. So the customer is never shown
a time that the booking transaction would then reject.

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
   2. Query overlapping bookings:

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

   3. Write the booking and
      `tx.set(dayRef, { lastBookingAt: now, count: FieldValue.increment(1) }, { merge: true })`.

**Remove the `slots/{slotId}` check and write.** The exact-slot check must go,
not just stop being relied on. Slot IDs are local times in the business
timezone, so after a timezone change an old booking's ID can collide with an
unrelated, genuinely free slot. For example, a 10:00 AM Eastern booking has ID
`…_1000`, and after switching to Central the free 10:00 AM Central slot has
the same ID. Keeping the check would reject a customer booking a slot the
overlap filter correctly offered. Rejection now comes only from the overlap
query, which compares real times. Likewise, `cancelBooking` stops writing to
`slots`; it only updates the booking's status. The booking's `slotId` field
can stay as a readable label.

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

- [x] `getAvailableSlots` takes booked ranges and filters by overlap
- [x] `getBookedRangesForDate` replaces `getTakenSlotIdsForDate`, with the
      `MAX_SLOT_MINUTES` lookback before the day's start
- [x] Remove the `slots/{slotId}` read and write from `createBooking`, and the
      `slots` write from `cancelBooking`
- [x] `createBooking` transaction: read and write a `bookingDays/{date}` lock
      document, then run the overlapping-bookings query before writing
- [x] `saveOverrideAction`: validate blocked slots against the generated grid
- [x] Settings: notice when upcoming bookings exist and slot length changes
- [x] Unit tests for overlap filtering (if Vitest is added)
- [x] Update `docs/admin-guide.md`: soften the §6.2 warning; replace the §5.2
      "nothing gets blocked" gotcha and the troubleshooting row with the new
      validation error

## Testing

Unit (`getAvailableSlots`):

- 30-minute booking at 9:30, 60-minute grid: the 9:00 slot is excluded
- 60-minute booking at 9:00, 30-minute grid: 9:00 and 9:30 are excluded
- Adjacent booking (9:00–9:30) doesn't exclude 9:30–10:00
- A booking from the previous local date that ends after midnight excludes the
  overlapping early slot on the requested date (after a timezone change)

Manual:

- [ ] Book 9:30 on 30-minute slots, switch to 60: 9:00 isn't offered on
      `/book`
- [ ] Change the business timezone with a booking at 10:00 AM ET: the
      equivalent 9:00 AM CT slot isn't offered, and 10:00 AM CT is offered
      **and can be booked** (not rejected by a stale slot ID)
- [ ] Concurrency: a local script against the **Firestore emulator** (not
      production; see `AGENTS.md`) that calls `createBooking` many times in
      parallel for overlapping slots with different IDs (e.g. 9:00–10:00 and
      9:30–10:00). Exactly one succeeds each time. Run it with and without the
      day document, to confirm the test catches the bug.
- [ ] Block `09:15` on a 30-minute grid: rejected with the list of valid times

## Risks

- **Legacy `slots` docs:** existing `slots` documents stay in Firestore but are
  never read, so they can't block anything. `scripts/clear-bookings.mjs` can
  keep deleting them. Optionally, delete the collection once this ships.
- **New collection:** `bookingDays` holds one small document per day that has
  had a booking. It needs no cleanup, and `scripts/clear-bookings.mjs` should
  delete it alongside `bookings`.
- **Behaviour change in one function:** both `/book` and `createBooking` use
  `getAvailableSlots`, so one change fixes both paths. Test both.

## Implementation handoff

Availability uses actual booked ranges and booking transactions recheck settings, overrides, notice/window limits and overlaps. Legacy slots are no longer read or written. Shared lock documents use UTC dates (both dates for appointments crossing UTC midnight) rather than business-local dates, so locks remain consistent during timezone changes. Emulator tests confirm one concurrent overlapping booking succeeds and reproduce the original bug with the old slot-ID-only transaction. The emulator also rejected an overlap with transactional range reads and no day writes; the explicit shared locks are retained as a conservative guarantee. Blocked starts are validated when saving.

Verified locally: 44 unit tests and 12 guarded Firestore emulator tests, TypeScript, lint, formatting, and production build. No production settings, bookings, or emails were changed. Original manual checklists above remain unchecked where real provider/client testing has not been performed.
