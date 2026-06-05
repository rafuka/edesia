# Restaurant Dashboard

A Next.js 16 (App Router) + Supabase app where each authorized user is a
**restaurant**. Restaurants sign in to a dashboard whose **Menu** tab lets them
build an editable menu: add **sections**, and within sections add **items** with
a main **image or video**, a **description**, and a **price**.

> A public-facing menu page for diners is planned but not built yet — only the
> authenticated dashboard exists today.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, `proxy.ts`)
- **Supabase** — Postgres (data), Auth (email/password), Storage (item media)
- **Tailwind CSS v4 + shadcn/ui** (Base UI primitives)

## Architecture

| Path | Purpose |
| --- | --- |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server (RSC / actions) Supabase client |
| `src/lib/supabase/middleware.ts` | Session refresh + route guard helper |
| `src/proxy.ts` | Next 16 middleware — refreshes session, gates `/dashboard` |
| `src/app/(auth)/` | `login` / `signup` pages + auth Server Actions |
| `src/app/dashboard/` | Authenticated layout, Menu tab |
| `src/app/dashboard/menu/actions.ts` | Section/item CRUD Server Actions |
| `src/components/menu/` | Menu editor, section & item cards, dialogs |
| `src/lib/media.ts` | Uploads item image/video to Supabase Storage |
| `supabase/schema.sql` | Tables, RLS, signup trigger, storage bucket |

Data model: `restaurants` (1 per auth user) → `menu_sections` → `menu_items`.
Row Level Security ensures a restaurant can only read/write its own data.

## Setup

### 1. Apply the database schema

Run `supabase/schema.sql` against the `restaurant-app` project. Either:

- **Via the Supabase MCP server** (already added to `.mcp.json`) — approve it,
  then it can apply the migration, or
- **Manually** — paste `supabase/schema.sql` into the Supabase dashboard SQL
  editor and run it.

This creates the tables, RLS policies, the `handle_new_user` signup trigger
(auto-creates a `restaurants` row), and the public `menu-media` storage bucket.

### 2. Environment variables

`.env.local` already has the project URL. Fill in the anon/public key from
**Supabase dashboard → Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://mgipdlxggwugngdvsdpk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000 → you'll be sent to `/login`. Create an account at
`/signup` (enter a restaurant name); you'll land on the Menu tab.

> If signups require email confirmation, either confirm via the emailed link or
> disable **Confirm email** under Supabase → Authentication → Providers → Email
> for a frictionless local flow.
