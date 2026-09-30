# Agent lessons

## Lessons

### 2026-09-30 — Notification copy must match every skip path

- **Source:** PR #8 · Macroscope
- **Gap:** The cancel flow has several reasons it may not email the customer
  (no email, admin unticked, callback already started, send failed). One of
  them didn't tell the admin to call, and the customer-facing email hint
  promised a notification the admin can switch off.
- **Going forward:** When a notification can be skipped, list every skip
  reason and check that the admin UI, the admin guide, and customer-facing
  copy each handle all of them. Customer copy should say "may", not promise
  delivery, unless sending is unconditional.
- **Pointers:** `notifyCustomerOfCancel` in `app/actions/admin.ts`,
  `describeCancelResult` in `components/admin-bookings-list.tsx`,
  `docs/admin-guide.md` §4, email hint in `components/booking-wizard.tsx`
