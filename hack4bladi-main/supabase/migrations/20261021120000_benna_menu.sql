-- BENNA menu, workplaces and group orders. Read-only for the app: the server reads with
-- the anon key; writes happen through the dashboard / service role only.

create table workplaces (
  id text primary key,
  name text not null,
  area text not null,
  pickup text not null,
  code text not null unique
);

create table kitchens (
  id text primary key,
  name text not null,
  blurb text not null,
  district text not null
);

-- Which kitchens deliver to which workplace.
create table kitchen_workplaces (
  kitchen_id text not null references kitchens (id) on delete cascade,
  workplace_id text not null references workplaces (id) on delete cascade,
  primary key (kitchen_id, workplace_id)
);

create table dishes (
  id text primary key,
  kitchen_id text not null references kitchens (id),
  name text not null,
  description text not null,
  slot text not null check (slot in ('breakfast', 'lunch', 'healthy')),
  group_price_mad integer not null check (group_price_mad > 0),
  solo_price_mad integer not null,
  -- As declared by the kitchen. Matching excludes on these; the app never claims more.
  ingredients text[] not null default '{}',
  tag text check (tag in ('fait-maison', 'healthy', 'nouveau', 'populaire')),
  image text not null,
  check (solo_price_mad >= group_price_mad)
);

-- What each kitchen serves on a given day.
create table menu_days (
  dish_id text not null references dishes (id) on delete cascade,
  served_on date not null,
  available boolean not null default true,
  primary key (dish_id, served_on)
);

create table group_orders (
  id uuid primary key default gen_random_uuid(),
  workplace_id text not null references workplaces (id),
  name text not null,
  host_name text not null,
  served_on date not null,
  delivery_time time not null,
  cutoff_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'open' check (status in ('open', 'closed'))
);

alter table workplaces enable row level security;
alter table kitchens enable row level security;
alter table kitchen_workplaces enable row level security;
alter table dishes enable row level security;
alter table menu_days enable row level security;
alter table group_orders enable row level security;

create policy "public read" on workplaces for select using (true);
create policy "public read" on kitchens for select using (true);
create policy "public read" on kitchen_workplaces for select using (true);
create policy "public read" on dishes for select using (true);
create policy "public read" on menu_days for select using (true);
create policy "public read" on group_orders for select using (true);

-- RLS filters rows; the role still needs the table privilege. Recent Supabase no longer
-- grants it to anon by default, and the security_invoker views below read as the caller.
grant select on workplaces, kitchens, kitchen_workplaces, dishes, menu_days, group_orders to anon, authenticated;

-- "Today" is Casablanca's today, whatever the database server's timezone.
create view todays_menu with (security_invoker = true) as
select
  d.id, d.name, d.description, d.slot, d.group_price_mad, d.solo_price_mad,
  d.ingredients, d.tag, d.image, k.id as kitchen_id, k.name as kitchen_name, kw.workplace_id
from menu_days m
join dishes d on d.id = m.dish_id
join kitchens k on k.id = d.kitchen_id
join kitchen_workplaces kw on kw.kitchen_id = k.id
where m.served_on = (now() at time zone 'Africa/Casablanca')::date
  and m.available;

create view open_group_orders with (security_invoker = true) as
select id, workplace_id, name, host_name, delivery_time, cutoff_at, capacity
from group_orders
where status = 'open'
  and cutoff_at > now()
  and served_on = (now() at time zone 'Africa/Casablanca')::date;

grant select on todays_menu, open_group_orders to anon, authenticated;
