# 06 — Make the developer notify address visible

**Type:** Cleanup · **Size:** Small · **Depends on:** —

## Problem

`resolveRecipients` in `lib/plunk.ts` **always** merges the
`BOOKING_NOTIFY_EMAIL` env var with the admin's **Notify emails** setting.
The client can't see that address in Settings and can't stop it receiving
booking emails. That's confusing ("I removed everyone and emails still go
out"), and once the site is handed over it may be a privacy concern, because
customer names and phone numbers go to an address the client doesn't control.

Related: `isPlunkConfigured()` requires `BOOKING_NOTIFY_EMAIL` to be set, even
though the Settings list alone would be enough.

## Options

| Option                                                                             | Pros                                               | Cons                                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| **A. Fallback only:** use the env address only when Settings has no addresses      | Client fully controls recipients; safety net stays | Developer stops getting copies once Settings is filled |
| **B. Show it read-only** in Settings ("Also sent to dev@…, set by your developer") | Transparent; no behaviour change                   | Client still can't remove it                           |
| **C. Separate `BOOKING_BCC_EMAIL`**, shown read-only like B                        | Explicit intent for monitoring copies              | One more env var                                       |

**Recommendation: A.** The Settings list becomes the single source of truth.
The env var only prevents bookings going unnoticed if the list is ever
emptied. If you want ongoing copies for monitoring, add yourself to the
Settings list openly, or use C.

## Design (option A)

- `resolveRecipients(notifyEmails)`: return the Settings addresses if there
  are any, otherwise the env addresses.
- `isPlunkConfigured()`: require only `PLUNK_API_KEY` (and `PLUNK_FROM_EMAIL`
  for real delivery). Recipients are checked at send time, as
  `canSendViaPlunk` already does.
- Settings form: under **Notify emails**, add help text: "If this list is
  empty, notifications go to a backup address set by your developer."
- Optional: warn in Settings when saving an empty list.

## Implementation steps

- [ ] Change `resolveRecipients` to fallback-only
- [ ] Relax `isPlunkConfigured`
- [ ] Settings help text and empty-list warning
- [ ] Update `.env.example`: comment `BOOKING_NOTIFY_EMAIL` as "Fallback when
      the admin notify list is empty"
- [ ] Update `docs/admin-guide.md` §7: replace the "address behind the scenes"
      tip

## Testing

- [ ] Settings list has an address: only that address is emailed
- [ ] Settings list is empty: the env address is emailed
- [ ] Both empty: notification is skipped with the existing warning log, and
      the booking still succeeds
