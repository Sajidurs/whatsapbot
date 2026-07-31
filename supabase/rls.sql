-- Row Level Security for the admin dashboard.
-- Run this in the Supabase SQL editor after supabase/schema.sql.
--
-- Without this, the public anon key can read and write customers/messages from
-- anywhere on the internet. The dashboard reads with the anon key from the
-- browser, so it needs SELECT as an authenticated user — and nothing more.
--
-- The service-role key used by app/api/whatsapp and app/api/dashboard/* bypasses
-- RLS entirely, so the webhook and the manual-send/pause routes keep working.

alter table branches  enable row level security;
alter table customers enable row level security;
alter table messages  enable row level security;
alter table products  enable row level security;

-- Logged-in admins can read everything the dashboard displays.
drop policy if exists "authenticated read branches" on branches;
create policy "authenticated read branches"
  on branches for select
  to authenticated
  using (true);

drop policy if exists "authenticated read customers" on customers;
create policy "authenticated read customers"
  on customers for select
  to authenticated
  using (true);

drop policy if exists "authenticated read messages" on messages;
create policy "authenticated read messages"
  on messages for select
  to authenticated
  using (true);

drop policy if exists "authenticated read products" on products;
create policy "authenticated read products"
  on products for select
  to authenticated
  using (true);

-- No insert/update/delete policies on purpose: every write goes through a route
-- handler using the service-role key, which checks the session first.

-- Admin accounts are created manually — there is no public sign-up flow:
--   Supabase dashboard → Authentication → Users → Add user
-- (tick "Auto Confirm User" so the account can sign in immediately).
