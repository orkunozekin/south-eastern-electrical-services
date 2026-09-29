# 03 — Handle bookings affected by availability changes

**Type:** Feature · **Size:** Medium · **Depends on:** [02](./02-customer-cancel-email.md)
(the cancel-and-notify flow)

## Problem

Changing availability never touches existing bookings:

- **Closing a day** with a date override leaves that day's confirmed bookings
  in place.
- **Blocking slots** leaves bookings at those times in place.
- **Shortening weekly hours** (or unticking a day) leaves bookings outside the
  new hours in place.

The admin gets no warning. Unless they cross-check the Bookings page, they end
up with bookings for times they've said they're unavailable. The admin guide
currently tells them to check manually.

## Goals

- When a change would leave confirmed future bookings outside availability,
  the admin sees exactly which bookings before saving.
- For date overrides, the admin can cancel those bookings (and email
  customers, via 02) in the same step.
- For weekly-hours changes, the admin is warned and can jump to the affected
  bookings.

## Non-goals

- Automatically moving bookings to another time.
- Auto-cancelling without the admin confirming.

## Design

### Shared conflict check

Add a pure helper in `lib/booking/slots.ts`:

```ts
export function isBookingWithinAvailability(
  booking: { startsAt: Date; endsAt: Date },
  settings: BookingSettings,
  override: AvailabilityOverride | null,
): boolean;
```

It gets the booking's local date in `settings.timezone`, calls
`generateDaySlots(date, settings, override)`, and returns true if some
generated slot contains the booking (`slot.startsAt <= booking.startsAt` and
`booking.endsAt <= slot.endsAt`). Using containment rather than slot-ID
equality keeps it correct after slot-length changes (see
[04](./04-slot-overlap.md)).

Then add a server helper in `lib/booking/repository.ts`:

```ts
export async function findConflictingBookings(input: {
  settings: BookingSettings;
  overrides: Map<string, AvailabilityOverride | null>; // by date; missing = read from Firestore
  from?: Date; // default now
  to?: Date; // optional bound
}): Promise<Booking[]>;
```

It lists confirmed bookings from `from` onward and filters with
`isBookingWithinAvailability`, using the proposed settings and override rather
than the saved ones.

### Date overrides: preview, then save

1. New action `previewOverrideAction({ date, closed, blockedSlots })` returns
   `{ conflicts: AdminBookingDto[] }` for that date under the proposed
   override.
2. `saveOverrideAction` gains
   `conflictResolution: "keep" | "cancel" | "cancel-and-notify"` and an
   optional `message`.
   - `keep`: current behaviour.
   - `cancel` / `cancel-and-notify`: after saving the override, cancel each
     conflicting booking through the same function 02 uses, with
     `notifyCustomer` set accordingly. Return a per-booking result list.
3. The server recomputes conflicts at save time instead of trusting the
   preview's IDs, because a booking may have come in between preview and save.

UI (`components/admin-availability-form.tsx`):

- Clicking **Save override** calls preview first. With no conflicts, it saves
  immediately (same as now).
- With conflicts, an inline panel lists them ("2 bookings are affected: Jane
  Doe 10:30 AM, Bob Smith 2:00 PM") with three buttons:
  - **Cancel them & email customers** (default)
  - **Cancel them without emailing**
  - **Keep the bookings**

  It also has an optional message box, shared with 02's panel.

- After saving, show a summary: "Override saved. 2 bookings cancelled; 1
  customer emailed, 1 has no email: please call (555) 123-4567."

Once this exists, "close the day and cancel everyone" is the admin-facing way
to clear a day's bookings. The client never needs the clear-bookings script.

### Weekly hours: warn

Weekly-hours changes can affect bookings on many dates, so bulk cancelling
from this form would be too blunt. Instead:

1. `previewWeeklyHoursAction(weeklyHours)` returns conflicts across all future
   bookings, taking each date's saved override into account.
2. With conflicts, show a warning listing them, with **Save anyway** and
   **Go back** buttons. The admin can then cancel individual bookings from the
   Bookings page, where 02's per-booking notify flow applies.

The same preview should run for **Settings → Save** when the timezone or slot
length changes, since both can push bookings outside availability. It's the
same helper with the proposed settings.

### Bookings page badge

As a low-cost safety net, mark upcoming bookings that are outside current
availability with an "Outside your hours" badge. Compute it in
`getAdminBookingsAction` with the same helper. This catches conflicts created
before this feature shipped, or by "Save anyway".

## Implementation steps

- [ ] `isBookingWithinAvailability` in `lib/booking/slots.ts`, plus unit tests
- [ ] `findConflictingBookings` in the repository
- [ ] `previewOverrideAction`; `saveOverrideAction` with `conflictResolution`
- [ ] Availability form: preview → conflict panel → save with resolution →
      summary
- [ ] `previewWeeklyHoursAction` and warning UI on weekly hours
- [ ] Run the same preview on Settings save when timezone or slot length
      changes
- [ ] "Outside your hours" badge on the Bookings page
- [ ] Update `docs/admin-guide.md`: §5.1 "Changes don't affect existing
      bookings", §5.2 "Overrides don't cancel existing bookings", §8 "Take a day
      off" recipe (step 3 goes away), §6.1 timezone warning

## Testing

Unit (`isBookingWithinAvailability`):

- Inside hours; outside hours; on a closed override; on a blocked slot; after
  a timezone change; after a slot-length change (30-minute booking inside a
  new 60-minute slot counts as within)

Manual:

- [ ] Close a date with 2 bookings: conflict panel lists both; each resolution
      does what it says
- [ ] Block one slot with a booking: only that booking is listed
- [ ] Close a date with no bookings: saves immediately with no panel
- [ ] A booking made between preview and save is still caught
- [ ] Untick a weekday with bookings: warning appears and "Save anyway" works
- [ ] Badge appears on bookings outside hours

## Risks

- **Query cost:** `findConflictingBookings` reads all future bookings. At this
  business's volume (tens per week) that's fine. If it ever grows, bound it
  with `to` (e.g. the booking window from 05) and query by date.
