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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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

# MongoDB setup

The quiz saves completed scores to MongoDB and reads the shared top 10 leaderboard.

1. Create a MongoDB database and database user, then allow your app's IP address in the cluster's network access settings.
2. Copy `.env.example` to `.env.local`.
3. Replace `MONGODB_URI` with your MongoDB connection string. Keep this value private and do not prefix it with `NEXT_PUBLIC_`.
4. Set `SESSION_SECRET` to a long random secret for signed login sessions.
5. Optionally change `MONGODB_DB` to choose a database name.
6. Run `npm run dev`.

The first sign-in with a new email creates an account; later sign-ins check the password. Passwords are salted and hashed before storage. Scores are still kept in browser storage as a fallback when MongoDB is unavailable. The score API accepts client-reported scores without verifying that they were earned through a quiz session.
