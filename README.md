## Nanny Hours

Simple, phone-friendly tracker to log Monday–Friday nanny hours, hourly rate, and extra reimbursements. Every change rolls into a weekly total so you always know how many hours were worked and what is owed at the end of the week.

### Tech stack

- [Next.js App Router](https://nextjs.org/docs) + TypeScript
- Tailwind CSS (v4) for minimal UI
- [Supabase](https://supabase.com/) for persistence

### Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and paste your Supabase project URL + anon key.

3. Create the required tables in Supabase. `weekly_logs` keeps one record per week, while `settings` stores the single hourly rate that the UI references everywhere:

   ```sql
   create table if not exists weekly_logs (
     id uuid primary key default uuid_generate_v4(),
     week_start date unique not null,
     hourly_rate numeric not null default 0,
     hours jsonb not null default '{}'::jsonb,
     extras jsonb not null default '[]'::jsonb,
     inserted_at timestamptz not null default now()
   );

   create unique index if not exists weekly_logs_week_start_idx
     on weekly_logs (week_start);

   create table if not exists settings (
     name text primary key,
     numeric_value numeric not null default 0,
     updated_at timestamptz not null default now()
   );
   ```

4. Start the dev server and open [http://localhost:3500](http://localhost:3500):

   ```bash
   npm run dev
   ```

5. Visit the app on your phone by hitting the dev machine’s LAN IP (e.g., `http://192.168.1.10:3500`) for an iOS-friendly experience.

### Using the tracker

- Each day’s hours accept decimals (e.g. `1.5`).
- Hourly rate is saved once under “Hourly rate” and reused for every week (edit any time).
- Running totals/amount due update instantly.
- Extras let you add reimbursements or other one-off amounts with a label.
- Tap **Save this week** to upsert the entry for the currently selected week into Supabase.

Deploy anywhere Next.js runs (Vercel, Render, Fly). Just be sure to expose the same `NEXT_PUBLIC_SUPABASE_*` variables in the hosting environment.
