-- ============================================================
-- PRISTAGE ONLINE SHOP — Supabase setup
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. EXTENSIONS ------------------------------------------------
create extension if not exists "pgcrypto";

-- 2. PRODUCTS TABLE ---------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2) check (old_price is null or old_price >= 0),
  category text not null default 'Other Products',
  image text,
  additional_images text[] default '{}',
  stock_status text not null default 'available' check (stock_status in ('available','out_of_stock')),
  featured boolean not null default false,
  delivery_note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured);

-- keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- 3. ADMINS TABLE -------------------------------------------------
-- Links a Supabase Auth user to admin privileges.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- 4. ROW LEVEL SECURITY -------------------------------------------
alter table public.products enable row level security;
alter table public.admins enable row level security;

-- Anyone (including anonymous customers) can read products.
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products for select
  using (true);

-- Only logged-in admins can add/edit/delete products.
drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Admins table: an admin may check only their own row (used by admin.js to confirm access).
drop policy if exists "Admins can read own row" on public.admins;
create policy "Admins can read own row"
  on public.admins for select
  using (auth.uid() = user_id);

-- 5. STORAGE BUCKET FOR PRODUCT IMAGES -----------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

-- 6. SAMPLE / INITIAL PRODUCTS --------------------------------------
insert into public.products (name, slug, description, price, old_price, category, image, stock_status, featured, delivery_note)
values
('Smartpro 90L Single Door Fridge SFR-120-DT-I', 'smartpro-90l-single-door-fridge-sfr-120-dt-i', 'Compact 90L single-door fridge, ideal for small kitchens, bedsitters and offices.', 19000, null, 'Refrigerators', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Fridge', 'available', true, ''),
('Skyworth 90L Single Door Refrigerator', 'skyworth-90l-single-door-refrigerator', 'Reliable 90L single-door refrigerator from Skyworth, energy efficient for everyday use.', 19000, null, 'Refrigerators', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Fridge', 'available', false, ''),
('Nunix A1C Bottom-Load Hot/Cold Water Dispenser', 'nunix-a1c-bottom-load-hot-cold-water-dispenser', 'Bottom-load water dispenser with hot and cold functions, no bending to load bottles.', 11000, null, 'Home Appliances', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Dispenser', 'available', true, ''),
('Electromate Bottom-Load Water Dispenser + Coffee Maker', 'electromate-bottom-load-water-dispenser-coffee-maker', 'Bottom-load dispenser with an integrated coffee maker, hot and cold water settings.', 10800, null, 'Home Appliances', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Dispenser', 'available', false, ''),
('43" Xgimi Smart Android TV', '43-inch-xgimi-smart-android-tv', '43-inch Smart Android TV with built-in apps and HD display.', 19999, null, 'TVs', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Smart+TV', 'available', true, ''),
('Olelon 4+1 Standing Cooker', 'olelon-4-plus-1-standing-cooker', 'Standing cooker with 4 gas burners, 1 hotplate and an oven for baking and grilling.', 10999, null, 'Cookers', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Cooker', 'available', false, ''),
('Hisense Pressure Cooker 6L 6-in-1', 'hisense-pressure-cooker-6l-6-in-1', '6-litre multi-function pressure cooker: pressure cook, slow cook, steam, sauté and more.', 8500, null, 'Kitchen Appliances', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Pressure+Cooker', 'available', false, ''),
('Bosch Granite 10-Piece Cookware Set', 'bosch-granite-10-piece-cookware-set', 'Durable granite-coated 10-piece cookware set for everyday cooking.', 8200, 8500, 'Kitchen Appliances', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Cookware+Set', 'available', false, ''),
('Globalstar 50x55 3+1 Cooker', 'globalstar-50x55-3-plus-1-cooker', 'Standing cooker with 3 gas burners, 1 hotplate and oven, size 50x55.', 23000, null, 'Cookers', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Cooker', 'available', true, 'Free delivery'),
('Haier 3 Gas + 1 Electric Cooker', 'haier-3-gas-plus-1-electric-cooker', 'Standing cooker with 3 gas burners and 1 electric hotplate, plus oven.', 34500, null, 'Cookers', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Cooker', 'available', false, ''),
('Mika 6kg Washing Machine', 'mika-6kg-washing-machine', '6kg top-load washing machine, suitable for small to medium households.', 16500, null, 'Washing Machines', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Washing+Machine', 'available', true, ''),
('RAF Blender 2-in-1', 'raf-blender-2-in-1', '2-in-1 blender for smoothies, juices and dry grinding.', 2999, null, 'Kitchen Appliances', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Blender', 'available', false, ''),
('RAF Juicer 4-in-1', 'raf-juicer-4-in-1', '4-in-1 multi-function juicer for fruits and vegetables.', 6000, null, 'Kitchen Appliances', 'https://placehold.co/800x600/0F3D3E/FFFFFF?text=Juicer', 'available', false, '')
on conflict (slug) do nothing;

-- 7. AFTER YOU CREATE YOUR ADMIN LOGIN (see README), RUN THIS ------
-- Replace the email below with the exact email you used to sign up
-- in Supabase Authentication, then run just this statement:
--
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'you@example.com'
-- on conflict (user_id) do nothing;
