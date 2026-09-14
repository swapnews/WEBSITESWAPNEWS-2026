-- Migration 027: Detailed Merchandise Schema
-- Adds category_product, sku, weight_grams, variants, rating, and sales_count to products table for Shopee-style e-commerce.

alter table public.products
  add column if not exists category_product text not null default 'Umum',
  add column if not exists sku text,
  add column if not exists weight_grams integer not null default 200,
  add column if not exists original_price_idr integer,
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists rating numeric(2,1) not null default 5.0,
  add column if not exists sales_count integer not null default 0;

create index if not exists products_category_idx on public.products(category_product);
create index if not exists products_sales_count_idx on public.products(sales_count desc);
create index if not exists products_is_active_idx on public.products(is_active);
