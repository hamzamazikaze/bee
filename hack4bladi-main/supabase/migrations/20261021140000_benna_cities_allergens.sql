-- Cities (a kitchen only delivers its own city) and declared allergens per dish.

alter table workplaces add column city text not null default 'casablanca'
  check (city in ('casablanca', 'rabat', 'marrakech'));
alter table kitchens add column city text not null default 'casablanca'
  check (city in ('casablanca', 'rabat', 'marrakech'));

-- As declared by the kitchen; the app shows these and never claims more.
alter table dishes add column allergens text[] not null default '{}'
  check (allergens <@ array['gluten', 'lait', 'oeufs', 'fruits-a-coque', 'poisson', 'sesame']);

-- `or replace` may only append columns, so allergens goes last.
create or replace view todays_menu with (security_invoker = true) as
select
  d.id, d.name, d.description, d.slot, d.group_price_mad, d.solo_price_mad,
  d.ingredients, d.tag, d.image, k.id as kitchen_id, k.name as kitchen_name, kw.workplace_id,
  d.allergens
from menu_days m
join dishes d on d.id = m.dish_id
join kitchens k on k.id = d.kitchen_id
join kitchen_workplaces kw on kw.kitchen_id = k.id
where m.served_on = (now() at time zone 'Africa/Casablanca')::date
  and m.available;

grant select on todays_menu to anon, authenticated;
