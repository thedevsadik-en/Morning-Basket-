-- Supabase Schema Update for Store Configuration
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS min_order_value integer DEFAULT 300,
ADD COLUMN IF NOT EXISTS free_delivery_threshold integer DEFAULT 700,
ADD COLUMN IF NOT EXISTS delivery_fee integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS bkash_number text DEFAULT '01712069030';

-- Populate default record if missing or update values
INSERT INTO store_settings (id, min_order_value, free_delivery_threshold, delivery_fee, bkash_number)
VALUES (1, 300, 700, 60, '01712069030')
ON CONFLICT (id) DO UPDATE SET
  min_order_value = COALESCE(store_settings.min_order_value, store_settings.minimum_order_value, 300),
  free_delivery_threshold = COALESCE(store_settings.free_delivery_threshold, 700),
  delivery_fee = COALESCE(store_settings.delivery_fee, 60),
  bkash_number = COALESCE(store_settings.bkash_number, '01712069030');
