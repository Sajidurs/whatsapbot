-- Qalbia WhatsApp bot schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- 10 physical branches customers pick from on their first message.
create table if not exists branches (
  id   bigint generated always as identity primary key,
  name text not null unique
);

-- One row per WhatsApp contact. phone_number is the WhatsApp "wa_id"
-- (digits only, no "+"), e.g. 9715XXXXXXXX.
create table if not exists customers (
  phone_number text primary key,
  name         text,
  branch_id    bigint references branches (id),
  state        text not null default 'new', -- 'new' | 'awaiting_branch' | 'active'
  paused       boolean not null default false,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);

create table if not exists products (
  id          bigint generated always as identity primary key,
  name        text not null,
  price       numeric(10, 2) not null,
  description text,
  in_stock    boolean not null default true
);

-- Full audit log of every inbound/outbound WhatsApp message.
create table if not exists messages (
  id            bigint generated always as identity primary key,
  phone_number  text not null references customers (phone_number),
  direction     text not null check (direction in ('inbound', 'outbound')),
  body          text not null,
  wa_message_id text,
  created_at    timestamptz not null default now()
);

create index if not exists messages_phone_number_created_at_idx
  on messages (phone_number, created_at);

-- Placeholder branches — rename/replace with real locations any time.
insert into branches (name) values
  ('Deira'),
  ('Bur Dubai'),
  ('Karama'),
  ('Al Barsha'),
  ('Dubai Marina'),
  ('JBR'),
  ('Business Bay'),
  ('Mirdif'),
  ('International City'),
  ('Downtown Dubai')
on conflict do nothing;
