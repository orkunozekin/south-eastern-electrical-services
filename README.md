This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3333](http://localhost:3333) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Local booking tests

Run `npm test` for unit tests. Firestore tests are opt-in and require a local emulator with a demo project; they never use production credentials. Start the Firestore emulator using `firestore-emulator.json` with project `demo-southeastern-tests`, then run:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_PROJECT_ID=demo-southeastern-tests npm run test:emulator
```

The suite rejects remote hosts and real project IDs before connecting.

## Pull request checks

GitHub Actions runs **Unit tests** and **Code quality** on every pull request, on pushes to `main`, and for merge queues. Unit tests run without production credentials; the separate opt-in Firestore emulator suite is excluded. Any unit test failure fails the check.

To enforce passing tests before merge, configure a rule for `main` that requires the **Unit tests** status check, requires the branch to be up to date, and does not allow bypasses. Branch protection for a private personal repository requires GitHub Pro. Until that is enabled, these checks report failures but GitHub cannot enforce them as merge requirements.

## Booking overlap index rollout

Before deploying PR #16, deploy `firestore.indexes.json` to the intended Firebase project using `firebase deploy --only firestore:indexes --project <project-id>`, then wait until the bookings index is ready. It covers `status`, `endsAt`, and `startsAt` for bounded overlap queries. Verify the project explicitly; the index has not been deployed to production by this change. The local emulator does not enforce composite-index availability.
