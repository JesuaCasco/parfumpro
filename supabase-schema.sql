-- Supabase schema para ParfumPro

create table if not exists productos (
  id serial primary key,
  name text not null,
  brand text,
  type text not null,
  volume text,
  price numeric not null,
  stock integer not null default 0
);

create table if not exists ventas (
  id serial primary key,
  product_id integer references productos(id) on delete set null,
  product_name text not null,
  quantity integer not null,
  total numeric not null,
  sold_at timestamp with time zone not null default now()
);
