-- Remove unique constraint on stockyard_id to allow multiple products per stockyard
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_stockyard_id_key;

-- Add composite unique constraint on stockyard_id and product_id instead
ALTER TABLE public.inventory ADD CONSTRAINT inventory_stockyard_product_unique UNIQUE (stockyard_id, product_id);