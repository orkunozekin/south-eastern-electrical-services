<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Non-negotiables

- No secrets in code or client bundles; Firebase Admin and Plunk keys stay server-only.
- Visitor-facing errors stay sanitized: no Firebase, Plunk, or `.env` details (see `toUserFacingError` in `app/actions/booking.ts`).
- A confirmed booking never fails because an email send failed.
- Slot booking stays transactional so concurrent requests cannot double-book.
- Admin server actions stay behind `requireAdmin` (`lib/auth/session.ts`).
- `.env.local` uses the production Firebase project: don't create test bookings or other writes without the user's OK.
- Before finishing a change, run `npx tsc --noEmit`, `npm run lint`, and `npm run format:check`.

## Cursor Cloud specific instructions

- Install dependencies with `npm ci`. Node.js 22 and the committed `package-lock.json` are enough; no extra system packages are required.
- The dev server is `npm run dev` and listens on port 3333 (`http://localhost:3333`).
- Public pages (`/`, `/services`, `/about`, `/contact`, `/book`) and `/admin/login` render with no secrets. Live slot lookup, booking writes, and admin sign-in need a `.env.local` copied from `.env.example`, with Firebase Admin credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) and the `NEXT_PUBLIC_FIREBASE_*` web config.
- In development, booking notifications print to the server terminal by default, even when a real email is sent. Plunk delivery requires `PLUNK_API_KEY`, `PLUNK_FROM_EMAIL`, and a recipient from `BOOKING_NOTIFY_EMAIL` or booking settings. Set `BOOKING_NOTIFY_CONSOLE=false` to disable console logging.
- `npx tsc --noEmit` and `npm run build` succeed on a clean checkout. `npm run lint` currently fails in `lib/use-viewer-timezone.ts` (`react-hooks/set-state-in-effect`). `npm run format:check` currently fails on `components/site-header.tsx`.
