-- Create enum types for status fields
CREATE TYPE order_status AS ENUM ('open', 'planned', 'dispatched', 'completed');
CREATE TYPE loading_point_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');

-- Customer Orders Table
CREATE TABLE public.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  tonnage_required DECIMAL(10,2) NOT NULL CHECK (tonnage_required > 0),
  priority_level priority_level NOT NULL DEFAULT 'medium',
  deadline_date TIMESTAMPTZ NOT NULL,
  status order_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory/Stockyard Table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stockyard_id TEXT NOT NULL UNIQUE,
  stockyard_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  tonnage_available DECIMAL(10,2) NOT NULL CHECK (tonnage_available >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wagon Availability Table
CREATE TABLE public.wagon_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wagon_type TEXT NOT NULL UNIQUE,
  total_count INTEGER NOT NULL CHECK (total_count >= 0),
  available_count INTEGER NOT NULL CHECK (available_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loading Points Table
CREATE TABLE public.loading_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id TEXT NOT NULL UNIQUE,
  point_name TEXT NOT NULL,
  operational_status loading_point_status NOT NULL DEFAULT 'active',
  capacity_tph DECIMAL(10,2) NOT NULL CHECK (capacity_tph > 0),
  compatible_products TEXT[] NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rake Plans Table
CREATE TABLE public.rake_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rake_id TEXT NOT NULL UNIQUE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_loading_point TEXT NOT NULL,
  origin_stockyard TEXT NOT NULL,
  destinations TEXT[] NOT NULL,
  wagon_type TEXT NOT NULL,
  wagon_count INTEGER NOT NULL CHECK (wagon_count > 0),
  total_tonnage DECIMAL(10,2) NOT NULL CHECK (total_tonnage > 0),
  utilization_percentage DECIMAL(5,2) NOT NULL,
  estimated_dispatch_time TIMESTAMPTZ,
  estimated_total_cost DECIMAL(12,2) NOT NULL,
  composite_priority_score DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table for rake plans and orders
CREATE TABLE public.rake_plan_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rake_plan_id UUID NOT NULL REFERENCES public.rake_plans(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  tonnage_allocated DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rake_plan_id, order_id)
);

-- Scenarios Table for What-If Analysis
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL,
  scenario_config JSONB NOT NULL,
  result_plan_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wagon_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loading_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rake_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rake_plan_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- Create public access policies (MVP - no auth required for simplicity)
CREATE POLICY "Allow public read access" ON public.customer_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.customer_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.customer_orders FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.customer_orders FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.inventory FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.wagon_availability FOR SELECT USING (true);
CREATE POLICY "Allow public update access" ON public.wagon_availability FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.loading_points FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.loading_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.loading_points FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.rake_plans FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.rake_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.rake_plans FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.rake_plan_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.rake_plan_orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.scenarios FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.scenarios FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_orders_status ON public.customer_orders(status);
CREATE INDEX idx_orders_priority ON public.customer_orders(priority_level);
CREATE INDEX idx_orders_deadline ON public.customer_orders(deadline_date);
CREATE INDEX idx_rake_plans_date ON public.rake_plans(plan_date);
CREATE INDEX idx_loading_points_status ON public.loading_points(operational_status);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_customer_orders_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wagon_availability_updated_at
  BEFORE UPDATE ON public.wagon_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loading_points_updated_at
  BEFORE UPDATE ON public.loading_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();