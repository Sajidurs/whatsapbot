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

## Environment variables

Put these in `.env.local`:

| Variable | Used by |
| --- | --- |
| `SUPABASE_URL` | service-role client (webhook + dashboard API routes) |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role client — server only, never expose |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + auth clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + auth clients |
| `ANTHROPIC_API_KEY` | Claude replies |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API |
| `WHATSAPP_VERIFY_TOKEN` | webhook verification handshake |

## Admin dashboard

The dashboard lives at `/dashboard` (conversations and leads), behind Supabase
Auth email/password login at `/login`. To set it up:

1. Run `supabase/schema.sql`, then `supabase/rls.sql`, in the Supabase SQL editor.
   Until `rls.sql` runs, the anon key can read every table from anywhere.
2. Create an admin in the Supabase dashboard under **Authentication → Users →
   Add user**, ticking *Auto Confirm User*. There is no public sign-up flow.

`proxy.ts` (Next 16's renamed middleware) redirects anonymous requests for
`/dashboard/*` to `/login`. Pages read with the anon key from the browser under
RLS; the manual send and pause/resume writes go through `/api/dashboard/*`,
which re-check the session before using the service-role key.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
