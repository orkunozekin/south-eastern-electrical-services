# Southeastern Electrical Services

Next.js 16 website with callback booking, Firebase admin sign-in, and optional Plunk confirmation and cancellation emails.

## Local development

Use Node.js 22 and `npm ci`, then `npm run dev` at http://localhost:3333. Public pages render without secrets. Copy `.env.example` only when you need live integration; keep Firebase Admin and Plunk keys server-only.

**`.env.local` may point at production Firebase. Do not create test bookings, change settings, run backfills, or clear data there without the owner's explicit approval.**

## Checks

Run `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, and `npm run build`. The build fetches Google Fonts and needs network access. Unit tests mock email delivery and do not load `.env.local`. The emulator suite is skipped by `npm test` unless explicitly opted in.

For transaction and concurrency checks, start the Firestore emulator using the Firebase CLI:

```sh
npx firebase-tools emulators:start --only firestore --project demo-southeastern-tests --config firestore-emulator.json
```

Then, in another terminal:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_PROJECT_ID=demo-southeastern-tests npm run test:emulator
```

The integration suite refuses non-loopback hosts and non-demo project IDs. It creates and clears fixtures only in that demo emulator project. It covers concurrent booking attempts, overlap prevention after grid changes, legacy slot documents, booking notice/window enforcement, invite identity persistence, and conflict detection.

## Deployment and handoff

Configure Firebase web and Admin credentials, verified `PLUNK_FROM_EMAIL`, `PLUNK_API_KEY`, and `SITE_URL` on the hosting platform. `BUSINESS_PHONE` is optional. `BOOKING_NOTIFY_EMAIL` is only a bootstrap recipient; once an address is saved in Admin Settings, only the saved addresses receive business notifications. Settings require at least one address.

Minimum notice defaults to zero to preserve existing behaviour. The client can choose a notice period and a booking window of 1–90 calendar days, including today. Existing appointments keep their original instants and duration. Availability changes preview affected bookings; cancellations remain saved even when email delivery fails.

Read [the client admin guide](docs/admin-guide.md) and [the implementation plans](docs/plans/README.md). Before handoff, configure the client's notification addresses and validate real email/calendar behaviour on a preview Firebase project. Gmail, Outlook, and Apple Calendar may handle cancellation attachments differently.

### Legacy calendar invite backfill

Prepare this before any sender-domain change. The script needs the exact email address used for the original invitations; it cannot infer that from legacy records. Preview first:

```sh
node --env-file=.env.local --import tsx scripts/backfill-invite-uids.ts --original-sender=hello@example.com
```

Add `--yes` only after reviewing the project and original sender. It updates upcoming confirmed bookings with email and no stored UID, preserving existing identities. Do not run against production without approval. The script is prepared; it is not automatically run by deployment.

### Developer reset

`scripts/clear-bookings.mjs` remains a compatibility entry point. Both forms preview upcoming confirmed counts and require `--yes` before deletion:

```sh
node --env-file=.env.local --import tsx scripts/clear-bookings.ts
```

`--notify` opts into cancelling and emailing upcoming customers before deletion. The reset stops if an email or notice-recording result cannot be confirmed. Stop booking traffic before a reset. This is a destructive developer tool; clients should use the date override conflict panel to cancel a day’s callbacks.

## Pull request checks

GitHub Actions runs **Unit tests** and **Code quality** on every pull request, on pushes to `main`, and for merge queues. Unit tests run without production credentials; the separate opt-in Firestore emulator suite is excluded. Any unit test failure fails the check.

To enforce passing tests before merge, configure a rule for `main` that requires the **Unit tests** status check, requires the branch to be up to date, and does not allow bypasses. Branch protection for a private personal repository requires GitHub Pro. Until that is enabled, these checks report failures but GitHub cannot enforce them as merge requirements.

## Booking overlap index rollout

Before deploying PR #16, deploy `firestore.indexes.json` to the intended Firebase project using `firebase deploy --only firestore:indexes --project <project-id>`, then wait until the bookings index is ready. It covers `status`, `endsAt`, and `startsAt` for bounded overlap queries. Verify the project explicitly; the index has not been deployed to production by this change. The local emulator does not enforce composite-index availability.

A reset with `--yes --notify` stops if any cancelled booking has an unresolved customer notice, including records from earlier attempts. Review those records and contact affected customers before deciding how to proceed; retrying must not silently erase the audit. Cancellation reschedule links use `SITE_URL`, falling back to `VERCEL_PROJECT_PRODUCTION_URL` when it is unset.
