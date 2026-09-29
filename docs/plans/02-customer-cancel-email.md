# 02 — Email customers when a booking is cancelled

**Type:** Feature · **Size:** Large · **Depends on:** —

## Request

> Cancelling or clearing a booking should notify the customer by email and ask
> them to reschedule.

## Current state

- **We don't collect customer email.** A booking is `name` + `phone` only
  (`lib/booking/types.ts`). The original plan explicitly said "No customer
  email field in v1". This feature needs a new field on the booking form.
- **Cancelling** (`cancelBookingAction` → `cancelBooking` in
  `lib/booking/repository.ts`) marks the booking `cancelled` and frees the slot
  in one transaction. Nobody is told.
- **"Clearing"** today can only mean `scripts/clear-bookings.mjs`. That's a
  developer script that deletes every `bookings` and `slots` document. There's
  no clear action in the admin UI.
- **Email:** `lib/plunk.ts` sends only the business notification. Real delivery
  needs `PLUNK_FROM_EMAIL` on a verified domain. That's optional today, but
  it's **required** for customer email: we can't email customers from an
  unverified sender.
- **No site URL is configured,** so there's nothing to build a "reschedule"
  link from.
- **No business phone number** appears on the site to put in the email.

## Goals

1. Customers can leave an email address when booking.
2. When an admin cancels a future booking that has an email, the customer gets
   an email saying it was cancelled, with a link to pick a new time.
3. The admin can see, before and after cancelling, whether the customer was or
   will be emailed. If they weren't, the admin knows to call.
4. An email failure never blocks or rolls back the cancellation.

## Non-goals

- A self-service reschedule or cancel link for customers.
- SMS. It would reach every customer, since phone is always collected, but it
  needs a new provider (e.g. Twilio) and consent handling. Worth a separate
  plan if the client wants it.
- Emailing customers when bookings are _created_ (a confirmation email). This
  is easy to add once the email field exists, but it's out of scope here.
- Notifying from the clear-bookings script by default (see Phase 4).

## Decisions needed

| Question                                         | Recommendation                                                                                                                                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is customer email **required** or **optional**?  | **Optional.** A required email adds friction to a "leave your number and we'll call" flow. Label it "Email (optional). We'll only use it if we need to reschedule." Bookings without email fall back to a phone call. |
| Which sending domain and from address?           | The client's domain, e.g. `bookings@<domain>`, verified in Plunk. Blocked until the site has a custom domain.                                                                                                         |
| Reply-to address                                 | The first `notifyEmails` address, so customer replies reach the business.                                                                                                                                             |
| Business phone number to include in the email    | Ask the client. Also worth adding to the site footer and contact page.                                                                                                                                                |
| Should the admin be able to add a personal note? | Yes, an optional short message included in the email (e.g. "Sorry, I'm out on an emergency job").                                                                                                                     |

## Design

### Data model

`bookings/{id}` gains:

| Field                | Type                                      | Notes                                   |
| -------------------- | ----------------------------------------- | --------------------------------------- |
| `email`              | `string \| null`                          | Lower-cased and trimmed, optional       |
| `cancelledAt`        | timestamp                                 | Already written, but not typed or read  |
| `cancelNotice`       | `"sent" \| "failed" \| "skipped" \| null` | Result of the customer email            |
| `cancelNoticeAt`     | timestamp \| null                         |                                         |
| `cancelNoticeReason` | `string \| null`                          | Why skipped or failed, for the admin UI |

Existing bookings have no `email`. `bookingFromDoc` treats a missing value as
`null`. No migration is needed.

Update `Booking`, `CreateBookingInput`, and `AdminBookingDto` to match.

### Booking form

- `components/booking-wizard.tsx`: add an optional `type="email"` field under
  Name and Phone.
- `lib/booking/validation.ts`: `validateBookingFields(name, phone, email?)`.
  Validate with the same regex as the admin settings action, and cap the length
  at 254.
- `createBooking` stores `email ?? null`.
- Include the customer email in the **business** notification too, so the
  business has it in their inbox.

### Email sending (`lib/plunk.ts`)

Refactor into:

- A private `sendViaPlunk({ to, subject, html, idempotencyKey, replyTo? })`
  that holds the fetch, auth, and from-address logic currently inside
  `sendBookingNotification`. Keep the dev console-logging behaviour.
- `sendBookingNotification`: unchanged behaviour, now using the helper.
- A new `sendCustomerCancellationEmail({ booking, whenLabel, message?, rescheduleUrl, businessPhone? })`
  - To: `booking.email`
  - Subject: `Your callback with Southeastern Electrical has been cancelled`
  - Body: apology, the original time in the business timezone, the admin's
    optional message (HTML-escaped), a prominent **"Pick a new time"** button
    to `rescheduleUrl`, and the business phone if configured.
  - Idempotency key: `cancel-${booking.id}`, so a retry can't double-send.
  - Reply-to: the first business notify email.

### Reschedule link

- Add a `SITE_URL` env var (e.g. `https://southeasternelectrical.com`), and
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
4. Write `cancelNotice*` fields to the booking.
5. Return the notice result so the UI can tell the admin what happened.

Only the first cancel attempt sends an email. `cancelBooking` already returns
early for bookings that are already cancelled; make it report that, so the
action doesn't re-send.

### Admin UI (`components/admin-bookings-list.tsx`)

- Show the customer email under the phone number when present.
- Replace `window.confirm` with a small inline confirmation panel on the row:
  - "Cancel Jane Doe's callback on Tue, Oct 6 · 10:30 AM?"
  - Checkbox **"Email the customer asking them to reschedule"**: ticked and
    enabled when the booking has an email. When it doesn't, the checkbox is
    disabled with "No email on file. Please call (555) 123-4567."
  - An optional message textarea, visible when the checkbox is ticked.
  - **Cancel booking** / **Keep booking** buttons.
- After cancelling, show the result:
  - "Cancelled. Customer emailed."
  - "Cancelled. Email failed, please call the customer."
  - "Cancelled. No email on file, please call the customer."
- In **Recent / cancelled**, show the notice status per booking
  ("customer emailed", "email failed", "not emailed").

### Phase 4: "Clearing" (clear-bookings script)

`scripts/clear-bookings.mjs` is a destructive developer reset. Emailing every
customer by accident while clearing test data would be worse than not
notifying, so:

- Before deleting, print a count of **upcoming confirmed** bookings and require
  a `--yes` flag to proceed.
- Add an opt-in `--notify` flag that emails upcoming customers who have an
  email, reusing the same template. Since the script is plain `.mjs`, the
  simplest way to share the template is a small `lib/emails/cancellation.mjs`
  module imported by both. The alternative is converting the script to
  TypeScript and running it with `tsx`.
- For the client, "cancel everything on a day or date range" should be an
  admin feature, not a script. That's covered in
  [03](./03-availability-conflicts.md) and reuses this cancel flow.

## Implementation steps

**Phase 1: collect email**

- [ ] Types: `email` on `Booking`, `CreateBookingInput`, `AdminBookingDto`,
      `BookingDto`
- [ ] Validation for optional email
- [ ] `createBooking` stores `email`; `bookingFromDoc` reads it
- [ ] Wizard email field and copy
- [ ] Business notification includes the customer email

**Phase 2: sending**

- [ ] Refactor `lib/plunk.ts` into `sendViaPlunk` and existing notification
- [ ] `sendCustomerCancellationEmail` and template
- [ ] `SITE_URL` env var (and optionally `BUSINESS_PHONE`); update
      `.env.example`
- [ ] Verify the sending domain in Plunk and set `PLUNK_FROM_EMAIL` in Vercel

**Phase 3: cancel flow and UI**

- [ ] `cancelBooking` reports whether it actually changed status
- [ ] `cancelBookingAction(id, options)` with notice recording
- [ ] Admin confirmation panel, result messages, notice status in the list
- [ ] `/book?ref=cancelled` heading variant

**Phase 4: script**

- [ ] `--yes` guard and upcoming count
- [ ] Optional `--notify`

**Docs**

- [ ] Update `docs/admin-guide.md`: §1 (customers may leave an email), §4
      cancelling (new panel, customers are emailed), §7 (customer
      cancellation email), §8 reschedule recipe, §9 ("customers can't cancel"
      stays; "customer is not notified" changes), troubleshooting row for
      "email failed"
- [ ] Update `PLAN.md`: remove "No customer email field in v1" and "Customer
      confirmation emails" from out-of-scope as appropriate

## Testing

Manual (with `BOOKING_NOTIFY_CONSOLE=true` locally, then real Plunk on a
preview deploy):

- [ ] Booking without email: cancel panel shows "No email on file"; nothing is
      sent; status is `skipped`
- [ ] Booking with email: customer receives the email with the correct local
      time, the admin message, and a working link
- [ ] Untick "Email the customer": nothing is sent; status is `skipped`
- [ ] Simulate a Plunk failure (bad API key on preview): the booking is still
      cancelled, the slot is freed, the UI says "Email failed", status is
      `failed`
- [ ] Cancelling a past booking doesn't email
- [ ] Double-clicking Cancel sends only one email (idempotency key + status
      check)
- [ ] An HTML or script tag in the admin message is escaped in the email
- [ ] Invalid email on the booking form shows a clear error; an empty email
      is accepted

## Risks

- **Deliverability:** a new domain may land in spam. Set up SPF/DKIM through
  Plunk's domain verification, and keep the email plain and transactional.
- **Privacy:** we're now storing customer emails. Only use them for this
  booking. The site has no privacy policy page; consider adding one.
- **Low uptake:** if few customers leave an email, admins still need to call.
  The UI makes that explicit rather than implying everyone was notified.
