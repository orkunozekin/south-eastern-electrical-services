# 06 — Make the developer notify address visible

**Type:** Cleanup · **Size:** Small · **Depends on:** —

## Problem

`resolveRecipients` in `lib/plunk.ts` **always** merges the
`BOOKING_NOTIFY_EMAIL` env var with the admin's **Notify emails** setting.
The client can't see that address in Settings and can't stop it receiving
booking emails. That's confusing ("I removed everyone and emails still go
out"), and once the site is handed over it may be a privacy concern, because
customer names, phone numbers, and emails go to an address the client doesn't
control.

Related: `isPlunkConfigured()` requires `BOOKING_NOTIFY_EMAIL` to be set, even
though the Settings list alone would be enough.

## Goal

Once the client has entered their own notify address, **only the addresses in
Settings receive booking emails**. The client can see and change every
recipient, and nothing reaches a developer-controlled address unless it's on
that list.

The env address stays only as a **bootstrap default**: it's used before
anyone has entered an address in Settings (a fresh deploy), so early bookings
aren't missed.

## Options considered

| Option                                                                                  | Result                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A. Fallback when the Settings list is empty                                             | Client controls recipients, but emptying the list sends everything to the env address. Doesn't meet the goal. |
| B. Show the env address read-only in Settings                                           | Transparent, but the client still can't remove it. Doesn't meet the goal.                                     |
| **C. Bootstrap only: fallback while empty, and Settings requires at least one address** | Once an address is entered, the env address can never be used again. **Meets the goal.**                      |

**Recommendation: C.** If you want ongoing copies for monitoring, add yourself
to the Settings list openly, where the client can see and remove you.

## Design

### Sending (`lib/plunk.ts`)

- `resolveRecipients(notifyEmails)`: return the Settings addresses if there
  are any; otherwise return the env addresses. They're no longer merged.
- `isPlunkConfigured()`: require only `PLUNK_API_KEY` (and `PLUNK_FROM_EMAIL`
  for real delivery). Recipients are checked at send time, as
  `canSendViaPlunk` already does.

### Settings (`saveAdminSettingsAction`, `components/admin-settings-form.tsx`)

- **Require at least one notify address** when saving Settings: "Add at least
  one email address to receive booking notifications." With this rule in
  place, the list can only be empty before the client first saves an address,
  so the fallback can't be triggered by emptying it.
- `saveWeeklyHoursAction` also writes the settings document, but it
  re-saves the current `notifyEmails` unchanged, so it can't empty the list.
- **While the list is empty**, show a notice above the field so the bootstrap
  behaviour isn't hidden: "No addresses yet. Until you add one, booking
  notifications go to your developer's address (d•••@example.com)." Mask the
  address, since it's only there to explain the behaviour.
- Once the list has an address, show no mention of the env address. It no
  longer receives anything.

### Handoff

Add "enter your notify address(es)" as the first step in the admin guide's
email check (§7, "Check emails are arriving"), so the switch from the
developer's address to the client's happens on day one.

## Implementation steps

- [x] `resolveRecipients`: Settings list, else env (no merging)
- [x] Relax `isPlunkConfigured`
- [x] `saveAdminSettingsAction`: reject an empty notify list
- [x] Settings form: masked bootstrap notice while the list is empty
- [x] Update `.env.example`: comment `BOOKING_NOTIFY_EMAIL` as "Used only
      until an address is saved in Admin → Settings"
- [x] Update `docs/admin-guide.md` §6.3 (at least one address is required) and
      §7 (replace the "address behind the scenes" tip; add the first-step
      instruction)

## Testing

- [ ] Fresh settings (no addresses): the env address receives notifications,
      and Settings shows the masked notice
- [ ] Save one address: only that address is emailed, not the env address
- [ ] Try to save an empty list: rejected with the message above; the
      previous list is kept
- [ ] Save weekly hours after addresses are set: the list is unchanged
- [ ] Both empty (no env var, no addresses): notification is skipped with the
      existing warning log, and the booking still succeeds

## Implementation handoff

Settings recipients replace the bootstrap env list, at least one is required, and the masked bootstrap notice is returned only to authenticated Settings. Weekly-hours saves write only weeklyHours, so they cannot overwrite a newer recipient list. Unit tests use mocked delivery to verify recipients and missing configuration. Real delivery to client inboxes remains a rollout check.

Verified locally: 44 unit tests and 12 guarded Firestore emulator tests, TypeScript, lint, formatting, and production build. No production settings, bookings, or emails were changed. Original manual checklists above remain unchecked where real provider/client testing has not been performed.
