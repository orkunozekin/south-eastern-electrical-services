# Plans

Implementation plans for known issues and requested features. Each plan is a
living document: check boxes as work lands, and update the plan if the design
changes while building.

| #   | Plan                                                                                  | Type    | Depends on | Size         |
| --- | ------------------------------------------------------------------------------------- | ------- | ---------- | ------------ |
| 01  | [Public calendar ignores saved settings](./01-public-calendar-dates.md)               | Bug     | —          | Small        |
| 02  | [Email customers when a booking is cancelled](./02-customer-cancel-email.md)          | Feature | —          | Large        |
| 03  | [Handle bookings affected by availability changes](./03-availability-conflicts.md)    | Feature | 02         | Medium       |
| 04  | [Prevent overlapping bookings after slot length changes](./04-slot-overlap.md)        | Bug     | —          | Medium       |
| 05  | [Minimum booking notice and adjustable booking window](./05-booking-notice-window.md) | Feature | 01         | Small–Medium |
| 06  | [Make the developer notify address visible](./06-env-notify-address.md)               | Cleanup | —          | Small        |

## Suggested order

1. **01**: it blocks weekend availability for the client today, and 05 builds on
   it.
2. **04**: a data-integrity bug. Fix it before the client starts adjusting slot
   length.
3. **02**: the largest change (new customer field, new email). 03 depends on it.
4. **03**, **05**, **06** in any order.

After each plan ships, update [`docs/admin-guide.md`](../admin-guide.md). Each
plan lists the guide sections it affects.

## Testing note

The repo has no automated test setup yet. Plans 01, 04 and 05 change pure slot
logic in `lib/booking/slots.ts`, which is easy to unit test. Adding
[Vitest](https://vitest.dev) with a handful of `slots.ts` tests is worth doing
as part of whichever of those lands first. Each plan also lists manual checks.
