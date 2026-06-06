-- ============================================================
--  restaurant-app schema
--  One authenticated user == one restaurant.
--  A restaurant has many menu sections; a section has many items.
--  Each item may carry a main image OR a video, plus description + price.
-- ============================================================

-- ----------------------------------------------------------------
--  Tables
-- ----------------------------------------------------------------

create table if not exists public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.menu_sections (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  description   text,
  position      int  not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.menu_sections (id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10, 2),
  media_url   text,
  media_type  text check (media_type in ('image', 'video')),
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists menu_sections_restaurant_id_idx on public.menu_sections (restaurant_id);
create index if not exists menu_items_section_id_idx on public.menu_items (section_id);

-- ----------------------------------------------------------------
--  updated_at maintenance for restaurants
-- ----------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
--  Auto-provision a restaurant row when a user signs up.
--  Reads restaurant_name / restaurant_slug from the signup metadata.
-- ----------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug  text;
  final_slug text;
  n          int := 0;
begin
  base_slug := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'restaurant_slug'), ''),
    regexp_replace(
      lower(coalesce(new.raw_user_meta_data ->> 'restaurant_name', split_part(new.email, '@', 1))),
      '[^a-z0-9]+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then
    base_slug := 'restaurant';
  end if;

  final_slug := base_slug;
  while exists (select 1 from public.restaurants where slug = final_slug) loop
    n := n + 1;
    final_slug := base_slug || '-' || n;
  end loop;

  insert into public.restaurants (owner_id, name, slug)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'restaurant_name'), ''), 'My Restaurant'),
    final_slug
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- This SECURITY DEFINER function only runs from the trigger above. Prevent it
-- being invoked directly as a PostgREST RPC by anon/authenticated roles.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ----------------------------------------------------------------
--  Row Level Security
-- ----------------------------------------------------------------

alter table public.restaurants   enable row level security;
alter table public.menu_sections enable row level security;
alter table public.menu_items    enable row level security;

-- restaurants: an owner can only touch their own restaurant
drop policy if exists "owner selects own restaurant" on public.restaurants;
create policy "owner selects own restaurant" on public.restaurants
  for select using (owner_id = auth.uid());

drop policy if exists "owner inserts own restaurant" on public.restaurants;
create policy "owner inserts own restaurant" on public.restaurants
  for insert with check (owner_id = auth.uid());

drop policy if exists "owner updates own restaurant" on public.restaurants;
create policy "owner updates own restaurant" on public.restaurants
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner deletes own restaurant" on public.restaurants;
create policy "owner deletes own restaurant" on public.restaurants
  for delete using (owner_id = auth.uid());

-- sections: owned through the parent restaurant
drop policy if exists "owner manages own sections" on public.menu_sections;
create policy "owner manages own sections" on public.menu_sections
  for all
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = menu_sections.restaurant_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = menu_sections.restaurant_id and r.owner_id = auth.uid()
    )
  );

-- items: owned through section -> restaurant
drop policy if exists "owner manages own items" on public.menu_items;
create policy "owner manages own items" on public.menu_items
  for all
  using (
    exists (
      select 1 from public.menu_sections s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = menu_items.section_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.menu_sections s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = menu_items.section_id and r.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
--  Storage: bucket for item images / videos
--  Path convention: {restaurant_id}/{item_id}/{filename}
--  The bucket is public, so objects are served via the public URL
--  (/storage/v1/object/public/...) without any SELECT policy on
--  storage.objects. We intentionally do NOT add a broad SELECT policy:
--  that would let clients *list* every file in the bucket. Writes are
--  restricted to the owning restaurant below.
-- ----------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('menu-media', 'menu-media', true)
on conflict (id) do nothing;

-- NOTE: keep `storage.foldername(name)` at the top level of the policy, NOT
-- inside a `from public.restaurants r` subquery. Inside such a subquery the
-- unqualified column `name` binds to restaurants.name (closer scope) instead
-- of storage.objects.name, silently breaking the check. The IN-subquery form
-- below keeps `name` unambiguous.

-- Owner can read/list only their own folder. Scoped to `authenticated` (not a
-- broad public-listing policy), and required so update/delete can locate the
-- object. Public read of objects still happens via the public object URL.
drop policy if exists "owner reads menu media" on storage.objects;
create policy "owner reads menu media" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'menu-media'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.restaurants r where r.owner_id = auth.uid()
    )
  );

drop policy if exists "owner uploads menu media" on storage.objects;
create policy "owner uploads menu media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-media'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.restaurants r where r.owner_id = auth.uid()
    )
  );

drop policy if exists "owner updates menu media" on storage.objects;
create policy "owner updates menu media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu-media'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.restaurants r where r.owner_id = auth.uid()
    )
  );

drop policy if exists "owner deletes menu media" on storage.objects;
create policy "owner deletes menu media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-media'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.restaurants r where r.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
--  Dining tables (Tables tab). Numbered sequentially per restaurant.
-- ----------------------------------------------------------------

create table if not exists public.restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  number        int  not null,
  created_at    timestamptz not null default now(),
  unique (restaurant_id, number)
);

create index if not exists restaurant_tables_restaurant_id_idx
  on public.restaurant_tables (restaurant_id);

alter table public.restaurant_tables enable row level security;

drop policy if exists "owner manages own tables" on public.restaurant_tables;
create policy "owner manages own tables" on public.restaurant_tables
  for all
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_tables.restaurant_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_tables.restaurant_id and r.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
--  Public, read-only access for the diner-facing menu page (/r/[slug]).
--  The menu is intentionally world-readable by slug; the 20-minute per-table
--  session is enforced in the application layer (a signed cookie), not in RLS.
--  These SELECT policies are OR'd with the owner "for all" policies above, so
--  owners keep full write access while anyone can read the menu.
-- ----------------------------------------------------------------

drop policy if exists "public reads restaurants" on public.restaurants;
create policy "public reads restaurants" on public.restaurants
  for select to anon, authenticated using (true);

drop policy if exists "public reads sections" on public.menu_sections;
create policy "public reads sections" on public.menu_sections
  for select to anon, authenticated using (true);

drop policy if exists "public reads items" on public.menu_items;
create policy "public reads items" on public.menu_items
  for select to anon, authenticated using (true);

-- ----------------------------------------------------------------
--  Live table activity for the dashboard:
--    * table_presence — which tables currently have the menu open
--      (refreshed by heartbeats from the public menu).
--    * waiter_calls   — "call a waiter" requests; active while resolved_at null.
--  Both are written by the service role from cookie-gated server actions (which
--  bypass RLS), so only owner SELECT (and owner UPDATE to resolve calls) is
--  granted below — no public/anon write policies.
-- ----------------------------------------------------------------

create table if not exists public.table_presence (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_number  integer not null,
  last_seen     timestamptz not null default now(),
  primary key (restaurant_id, table_number)
);

alter table public.table_presence enable row level security;

drop policy if exists "owner reads presence" on public.table_presence;
create policy "owner reads presence" on public.table_presence
  for select to authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = table_presence.restaurant_id and r.owner_id = auth.uid()
    )
  );

create table if not exists public.waiter_calls (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_number  integer not null,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists waiter_calls_active_idx
  on public.waiter_calls (restaurant_id, table_number)
  where resolved_at is null;

alter table public.waiter_calls enable row level security;

drop policy if exists "owner reads calls" on public.waiter_calls;
create policy "owner reads calls" on public.waiter_calls
  for select to authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = waiter_calls.restaurant_id and r.owner_id = auth.uid()
    )
  );

drop policy if exists "owner resolves calls" on public.waiter_calls;
create policy "owner resolves calls" on public.waiter_calls
  for update to authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = waiter_calls.restaurant_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = waiter_calls.restaurant_id and r.owner_id = auth.uid()
    )
  );
