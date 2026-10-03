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

### 2026-10-02 — Keep routing docs and save-path tests in each PR

- **Source:** PR #15 · Greptile
- **Gap:** Splitting the implementation left routing documentation and warning text describing the old recipient behavior, with only resolver tests in the recipient PR.
- **Going forward:** Each independently mergeable PR must include matching configuration comments, client guidance, diagnostics, and tests of its save paths. Test stale settings snapshots so unrelated form saves cannot overwrite newer recipient choices.
- **Pointers:** `lib/plunk.ts`, `app/actions/admin.ts`, `.env.example`, `docs/admin-guide.md`, `tests/notification-settings-save.test.ts`

### 2026-10-02 — Current limits do not bound legacy records

- **Source:** PR #16 · Greptile
- **Gap:** Overlap queries assumed every stored appointment obeyed the current 120-minute limit, although previous settings allowed longer appointments. Day-lock documents were also omitted from the existing reset script.
- **Going forward:** Query persisted interval boundaries without assuming current validation limits hold for historical records. Cover legacy intervals spanning prior days in regression tests, and update cleanup whenever a new collection is introduced.
- **Pointers:** `lib/booking/repository.ts`, `tests/booking-emulator.test.ts`, `scripts/clear-bookings.mjs`
