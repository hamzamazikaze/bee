-- Orders (any channel), plus the WhatsApp agent's conversation state and dedupe log.
-- No anon policies: only the server, with the service role key, reads or writes these.

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  source text not null check (source in ('web', 'whatsapp')),
  customer_phone text,
  customer_name text,
  workplace_id text not null references workplaces (id),
  group_order_id uuid not null references group_orders (id),
  dish_id text not null references dishes (id),
  qty integer not null check (qty between 1 and 10),
  unit_price_mad integer not null check (unit_price_mad > 0),
  total_mad integer not null check (total_mad = unit_price_mad * qty),
  -- No payment processing yet: test orders are paid in cash at pickup.
  payment text not null default 'cash' check (payment in ('cash')),
  -- 'pending' until the kitchen accepts it in the admin; never shown as confirmed before.
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled')),
  -- One order per confirming WhatsApp message id: a re-delivered webhook can't double-order.
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_phone on orders (customer_phone, created_at desc);

-- The cutoff is enforced by the database, not only by whoever calls it.
create function orders_require_open_group() returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from group_orders g
    where g.id = new.group_order_id
      and g.workplace_id = new.workplace_id
      and g.status = 'open'
      and g.cutoff_at > now()
  ) then
    raise exception 'group order closed' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger orders_require_open_group before insert on orders
  for each row execute function orders_require_open_group();

create table whatsapp_events (
  id text primary key,
  received_at timestamptz not null default now()
);

create table whatsapp_sessions (
  wa_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;
alter table whatsapp_events enable row level security;
alter table whatsapp_sessions enable row level security;

grant all on orders, whatsapp_events, whatsapp_sessions to service_role;
-- The server's joins (orders → dishes/workplaces/group_orders) read the menu tables as service_role.
grant select on workplaces, kitchens, kitchen_workplaces, dishes, menu_days, group_orders, todays_menu, open_group_orders to service_role;
