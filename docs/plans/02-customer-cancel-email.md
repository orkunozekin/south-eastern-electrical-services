# 02 — Email customers when a booking is cancelled

**Type:** Feature · **Size:** Medium · **Depends on:** —

## Request

> Cancelling or clearing a booking should notify the customer by email and ask
> them to reschedule.

## Current state

Already on `main` (from PR #3, "Send optional calendar invite email on
booking"):

- **Optional customer email.** The booking form has an optional Email field
  (`components/booking-wizard.tsx`). It's validated and lower-cased in
  `validateBookingFields`, and stored on `bookings/{id}.email` only when
  given. `Booking.email?: string`, `AdminBookingDto.email` and
  `BookingDto.email` are typed. The admin Bookings list shows it.
- **Business notification** includes the customer email.
- **Customer confirmation email** (`sendBookingConfirmation` in
  `lib/plunk.ts`). Sent when an email is given, in the customer's timezone
  (passed from the browser at booking time), with an `.ics` invite attached.
  The invite is built by `buildCalendarInvite` in `lib/calendar-invite.ts` with
  `METHOD:REQUEST`, `UID:booking-{id}@{sender domain}`, `SEQUENCE:0`.
- **Shared sender** `sendViaPlunk` (API key, from address, idempotency key,
  attachments). `PLUNK_FROM_EMAIL` on a verified domain is already required for
  customer email.

Not yet done:

- **Cancelling** (`cancelBookingAction` → `cancelBooking` in
  `lib/booking/repository.ts`) marks the booking `cancelled` and frees the slot
  in one transaction. **The customer isn't told, and the calendar invite stays
  in their calendar.**
- **"Clearing"** can only mean `scripts/clear-bookings.mjs`, a developer
  script that deletes every `bookings` and `slots` document. There's no clear
  action in the admin UI.
- **The customer's timezone isn't stored.** The confirmation uses the browser
  timezone sent with the booking request, but it isn't saved, so a later
  cancellation email can't reuse it.
- **No site URL is configured,** so there's nothing to build a "reschedule"
  link from.
- **No business phone number** appears on the site to put in the email.
- **Consent wording:** the email field's hint says "Only needed if you'd like a
  calendar invite for the call." Using the address for a cancellation notice
  is closely related, but the hint should say so.

## Goals

1. When an admin cancels a future booking that has an email, the customer gets
   an email saying it was cancelled, with a link to pick a new time.
2. The same email **cancels the calendar invite**, so the call disappears from
   the customer's calendar.
3. The admin can see, before and after cancelling, whether the customer was or
   will be emailed. If they weren't, the admin knows to call.
4. An email failure never blocks or rolls back the cancellation (repo
   non-negotiable in `AGENTS.md`).

## Non-goals

- A self-service reschedule or cancel link for customers.
- SMS. It would reach every customer, since phone is always collected, but it
  needs a new provider (e.g. Twilio) and consent handling. Worth a separate
  plan if the client wants it.
- Making email required.
- Notifying from the clear-bookings script by default (see Phase 3).

## Decisions needed

| Question                                         | Recommendation                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Email field hint wording                         | "Optional. We'll send a calendar invite, and let you know if we need to reschedule. We'll still call your phone either way." |
| Reply-to address                                 | The first `notifyEmails` address, so customer replies reach the business.                                                    |
| Business phone number to include in the email    | Ask the client. Also worth adding to the site footer and contact page.                                                       |
| Should the admin be able to add a personal note? | Yes, an optional short message included in the email (e.g. "Sorry, I'm out on an emergency job").                            |

## Design

### Data model

`bookings/{id}` gains:

| Field                | Type                                      | Notes                                                         |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| `customerTimezone`   | `string`, optional                        | IANA zone from the booking request (already validated there)  |
| `inviteUid`          | `string`, optional                        | `UID` for the customer's invite, set when the booking is made |
| `cancelledAt`        | timestamp                                 | Already written, but not typed or read                        |
| `cancelNotice`       | `"sent" \| "failed" \| "skipped" \| null` | Result of the customer email                                  |
| `cancelNoticeAt`     | timestamp \| null                         |                                                               |
| `cancelNoticeReason` | `string \| null`                          | Why skipped or failed, for the admin UI                       |

`customerTimezone` is only written for new bookings. For existing bookings the
cancellation email falls back to the business timezone, labelled with its
abbreviation (e.g. "ET"). No migration is needed.

`submitBookingAction` already validates `input.timezone`. Pass it through
`CreateBookingInput` and store it in the `createBooking` transaction.

### Calendar cancellation (`lib/calendar-invite.ts`)

Extend `buildCalendarInvite` with:

- `method: "REQUEST" | "CANCEL"` (default `REQUEST`)
- `sequence: number` (default `0`)

For `CANCEL`, emit `METHOD:CANCEL`, `STATUS:CANCELLED` and `SEQUENCE:1`, drop
the `VALARM`, and use **exactly the same `UID`** as the original invite.
Calendar clients match on `UID` and remove the event when the sequence is
higher.

**Preserve the original UID; don't rebuild it.** Today
`sendBookingConfirmation` builds the UID as `booking-{id}@{sender domain}`,
from `PLUNK_FROM_EMAIL` at send time. If the sender domain changes between
booking and cancelling (e.g. moving from a temporary domain to the client's
own), rebuilding the UID at cancel time would produce a different value. The
cancellation would be recorded as sent, but the original event would stay in
the customer's calendar. So:

1. **Store the UID with the booking, before any email is sent.** When the
   booking has an email, `createBooking` builds
   `booking-{id}@{sender domain}` and writes it to `bookings/{id}.inviteUid`
   in the same transaction that creates the booking. The booking and its UID
   are saved together or not at all, so there's no later write that can fail
   after the invite has gone out.
2. `sendBookingConfirmation` takes the stored UID as an argument and puts it
   in the invite. It never builds its own.
3. The cancellation reads `booking.inviteUid` and uses it verbatim. It never
   calls the UID builder.
4. **Attach the cancellation `.ics` whenever `inviteUid` is set,** even if the
   confirmation may have failed or been skipped. The app can't reliably know
   whether the invite reached the customer, and a `CANCEL` for an event the
   customer doesn't have is harmless: calendar clients ignore it or show a
   notice, and the email body already says the call is cancelled. Missing a
   real event is the worse failure. No `inviteUid` only happens for bookings
   without an email, which get no cancellation email anyway, or for legacy
   bookings the backfill below didn't cover.
5. **Backfill for bookings made before this ships:** a one-off script sets
   `inviteUid = booking-{id}@{current sender domain}` on upcoming confirmed
   bookings that have an email. It must run **before** any change to
   `PLUNK_FROM_EMAIL`'s domain, while the current domain is still the one
   their invites were sent with. Note in the script that it's only valid for
   that reason.

### Email (`lib/plunk.ts`)

Add `sendCustomerCancellation({ booking, whenLabel, message?, rescheduleUrl, businessPhone?, replyTo? })`,
built on the existing `sendViaPlunk`:

- To: `booking.email`
- Subject: `Your callback on {whenLabel} has been cancelled`
- Body: apology, the original time, the admin's optional message
  (HTML-escaped with the existing `escapeHtml`), a prominent **"Pick a new
  time"** button to `rescheduleUrl`, and the business phone if configured.
- Attachment: `cancel.ics` (`text/calendar; method=CANCEL`)
- Idempotency key: `booking-cancel-${booking.id}`, so a retry can't
  double-send.
- Mirror the dev console logging used by the other two senders.

`sendViaPlunk` needs a `replyTo` option; add it there.

### Reschedule link

- Add a `SITE_URL` env var (e.g. `https://southeasternelectrical.org`), and
  document it in `.env.example`.
- The link is `${SITE_URL}/book?ref=cancelled`. The `ref` value is only for a
  friendlier heading on `/book` ("Sorry we had to cancel. Pick a new time
  below."). **Don't put name, phone, or email in the URL:** links end up in
  logs and browser history. Prefilling can come later with a signed token if
  wanted.

### Cancel flow

`cancelBookingAction(id)` becomes:

```ts
cancelBookingAction(
  id: string,
  options: { notifyCustomer: boolean; message?: string },
): Promise<
  | { ok: true; notice: "sent" | "failed" | "skipped"; noticeReason?: string }
  | { ok: false; error: string }
>;
```

1. Run the existing cancel transaction. If it fails, return the error and send
   no email.
2. Decide whether to email the customer. Skip with a reason when:
   - `notifyCustomer` is false ("admin chose not to notify")
   - the booking has no email ("no email on file")
   - the booking has already started ("booking time has passed")
   - Plunk isn't fully configured ("email not configured")
3. Otherwise send the email. Catch errors and record `failed`.
4. Write the `cancelNotice*` fields to the booking.
5. Return the notice result so the UI can tell the admin what happened.

Only the first cancel attempt sends an email. `cancelBooking` already returns
early for bookings that are already cancelled; make it report that, so the
action doesn't re-send.

### Admin UI (`components/admin-bookings-list.tsx`)

The email is already shown on each row. Additionally:

- Replace `window.confirm` with a small inline confirmation panel on the row:
  - "Cancel Jane Doe's callback on Tue, Oct 6 · 10:30 AM?"
  - Checkbox **"Email the customer asking them to reschedule"**: ticked and
    enabled when the booking has an email. When it doesn't, the checkbox is
    disabled with "No email on file. Please call (555) 123-4567."
  - An optional message textarea, visible when the checkbox is ticked.
  - **Cancel booking** / **Keep booking** buttons.
- After cancelling, show the result:
  - "Cancelled. Customer emailed and their calendar invite was cancelled."
  - "Cancelled. Email failed, please call the customer."
  - "Cancelled. No email on file, please call the customer."
- In **Recent / cancelled**, show the notice status per booking
  ("customer emailed", "email failed", "not emailed").

### Phase 3: "Clearing" (clear-bookings script)

`scripts/clear-bookings.mjs` is a destructive developer reset, and
`.env.local` points at the production project (see `AGENTS.md`). Emailing
every customer by accident while clearing test data would be worse than not
notifying, so:

- Before deleting, print a count of **upcoming confirmed** bookings and require
  a `--yes` flag to proceed.
- Add an opt-in `--notify` flag that emails upcoming customers who have an
  email. The script is plain `.mjs` and can't import the TypeScript senders
  directly, so either convert it to TypeScript and run it with `tsx`
  (preferred, since it reuses `sendCustomerCancellation` and the `.ics`
  builder unchanged) or call a small admin-only API route.
- For the client, "cancel everything on a day or date range" should be an
  admin feature, not a script. That's covered in
  [03](./03-availability-conflicts.md) and reuses this cancel flow.

## Implementation steps

**Phase 1: sending**

- [x] Store `customerTimezone` on new bookings
- [x] `buildCalendarInvite`: `method` / `sequence`
- [x] `createBooking` stores `inviteUid` in the booking transaction when an
      email is given; `sendBookingConfirmation` takes that UID instead of
      building one
- [ ] Run the prepared one-off backfill of `inviteUid` for existing upcoming bookings with an
      email (run before any sender-domain change)
- [x] `sendViaPlunk`: `replyTo` option
- [x] `sendCustomerCancellation` and template with the `cancel.ics`
      attachment
- [x] `SITE_URL` env var (and optionally `BUSINESS_PHONE`); update
      `.env.example`
- [x] Update the email field hint copy in the booking wizard

**Phase 2: cancel flow and UI**

- [x] `cancelBooking` reports whether it actually changed status
- [x] `cancelBookingAction(id, options)` with notice recording
- [x] Admin confirmation panel, result messages, notice status in the list
- [x] `/book?ref=cancelled` heading variant

The backfill script is prepared at `scripts/backfill-invite-uids.ts`; applying it to production requires owner approval and verification of the original sender.

**Phase 3: script**

- [x] `--yes` guard and upcoming count
- [x] Optional `--notify`

**Docs**

- [x] Update `docs/admin-guide.md`: §4 cancelling (new panel; customers are
      emailed and their invite is removed), §7 "Emails customers receive",
      §8 reschedule recipe (the old invite is removed automatically when the
      old booking is cancelled with notify on), troubleshooting row for
      "email failed"
- [x] Update `PLAN.md`: remove "No customer email field in v1" and "Customer
      confirmation emails" from out-of-scope

## Testing

Manual, with `BOOKING_NOTIFY_CONSOLE=true` locally, then real Plunk on a
preview deploy. Per `AGENTS.md`, don't create test bookings against the
production project without the owner's OK.

- [ ] Booking without email: cancel panel shows "No email on file"; nothing is
      sent; status is `skipped`
- [ ] Booking with email: customer receives the email with the correct local
      time, the admin message, and a working link
- [ ] Calendar removal: book with a Gmail and an Outlook/iCloud address, add
      the invite, cancel, and confirm the event is removed or marked cancelled
      in each client
- [ ] Domain change: book (UID stored), change `PLUNK_FROM_EMAIL` to another
      verified domain on a preview deploy, cancel, and confirm the event is
      still removed (the stored UID is used, not a rebuilt one)
- [ ] Booking with email: `inviteUid` is on the booking document right after
      it's created, and the confirmation invite uses the same UID
- [ ] Confirmation failed at booking time (simulate a Plunk failure): the
      booking still has `inviteUid`, and the cancellation email includes the
      `.ics` cancel
- [ ] Booking without email: no `inviteUid` is stored
- [ ] Untick "Email the customer": nothing is sent; status is `skipped`
- [ ] Simulate a Plunk failure (bad API key on preview): the booking is still
      cancelled, the slot is freed, the UI says "Email failed", status is
      `failed`
- [ ] Cancelling a past booking doesn't email
- [ ] Double-clicking Cancel sends only one email (idempotency key + status
      check)
- [ ] An HTML or script tag in the admin message is escaped in the email
- [ ] A booking made before `customerTimezone` existed gets a
      business-timezone time with its abbreviation

## Risks

- **Calendar client differences:** Google, Outlook, and Apple Calendar all
  honour `METHOD:CANCEL` with a matching `UID`, but some webmail clients only
  show it as a notice. The email body must say the call is cancelled on its
  own terms, without relying on the attachment.
- **Sender domain changes:** handled by storing `inviteUid` when the booking
  is created. The remaining risk is running the backfill _after_ a domain change,
  which would stamp legacy bookings with the wrong UID. Run it in the same
  deploy as this feature.
- **Low uptake:** if few customers leave an email, admins still need to call.
  The UI makes that explicit rather than implying everyone was notified.

## Implementation handoff

Cancellation, notices, admin UI, guarded reset scripts, and invite UID backfill tooling are implemented. Invite UID and original organizer email are saved transactionally. Repeated cancellation never resends; missing/failed notice metadata is shown explicitly. Configure SITE_URL and a verified sender before rollout. The production backfill was not run; confirm the original sender and run it before changing sender domain. Actual calendar behaviour in Gmail, Outlook, and Apple remains a preview-deployment check.

Verified locally: 44 unit tests and 12 guarded Firestore emulator tests, TypeScript, lint, formatting, and production build. No production settings, bookings, or emails were changed. Original manual checklists above remain unchecked where real provider/client testing has not been performed.
