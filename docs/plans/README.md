# Plans

Implementation plans for known issues and requested features. Each plan is a
living document: check boxes as work lands, and update the plan if the design
changes while building.

| #   | Plan                                                                                       | Type    | Depends on | Size         |
| --- | ------------------------------------------------------------------------------------------ | ------- | ---------- | ------------ |
| 01  | [Public calendar ignores saved settings](./01-public-calendar-dates.md)                    | Bug     | —          | Small        |
| 02  | [Email customers when a booking is cancelled](./02-customer-cancel-email.md)               | Feature | —          | Medium       |
| 03  | [Handle bookings affected by availability changes](./03-availability-conflicts.md)         | Feature | 02         | Medium       |
| 04  | [Prevent overlapping bookings after slot length or timezone changes](./04-slot-overlap.md) | Bug     | —          | Medium       |
| 05  | [Minimum booking notice and adjustable booking window](./05-booking-notice-window.md)      | Feature | 01         | Small–Medium |
| 06  | [Put the client in control of notification recipients](./06-env-notify-address.md)         | Cleanup | —          | Small        |

## Current status

Plan 01 was already implemented. Plans 02–06 are now implemented locally, with unit tests and Firestore emulator coverage. The individual plans describe final implementation choices and remaining rollout checks.

Before production rollout:

1. Configure `SITE_URL` and a verified Plunk sender; optionally set `BUSINESS_PHONE`.
2. Enter the client's notification address(es) in Settings.
3. With owner approval, preview and run the legacy invite UID backfill using the original sender address, before any sender-domain change.
4. Verify confirmation and cancellation email/calendar behaviour on a preview Firebase project with Gmail and Outlook/Apple Calendar.

Minimum notice stays at zero until the client chooses a value. No production data changes, backfill, or email tests were run during implementation.

## Admin guide

The client-facing admin guide, `docs/admin-guide.md`, is added in
[PR #4](https://github.com/orkunozekin/south-eastern-electrical-services/pull/4).
Merge that first. Each plan's **Docs** step lists the guide sections to update
once the plan ships. If a plan lands before the guide is merged, make the
same edits on the guide's branch instead.

## Testing

`npm test` runs mocked-email and pure booking regression tests. `npm run test:emulator` requires a loopback Firestore emulator and demo project ID; see the root README for commands. Integration tests cover concurrent overlapping bookings, server notice/window enforcement, invite UID persistence, and admin conflict resolutions. Production data is never used for automated verification.
