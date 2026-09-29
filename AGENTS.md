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
