-- Ensure app_role enum has all required roles
DO $$ 
BEGIN
  -- Check if the type exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'senior_planner', 'planner', 'viewer');
  ELSE
    -- Add viewer role if it doesn't exist
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Update RLS policies to include viewer role for read-only access

-- Customer Orders: Viewers can read
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.customer_orders;
CREATE POLICY "All authenticated users can read orders" 
ON public.customer_orders 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Inventory: Viewers can read
DROP POLICY IF EXISTS "Authenticated users can read inventory" ON public.inventory;
CREATE POLICY "All authenticated users can read inventory" 
ON public.inventory 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Inventory: Only planners and above can modify
DROP POLICY IF EXISTS "Planners can manage inventory" ON public.inventory;
CREATE POLICY "Planners can insert inventory" 
ON public.inventory 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'planner'::app_role) OR has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Planners can update inventory" 
ON public.inventory 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'planner'::app_role) OR has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete inventory" 
ON public.inventory 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Wagon Availability: Viewers can read
DROP POLICY IF EXISTS "Authenticated users can read wagons" ON public.wagon_availability;
CREATE POLICY "All authenticated users can read wagons" 
ON public.wagon_availability 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Loading Points: Viewers can read
DROP POLICY IF EXISTS "Authenticated users can read loading points" ON public.loading_points;
CREATE POLICY "All authenticated users can read loading points" 
ON public.loading_points 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Rake Plans: Viewers can read
DROP POLICY IF EXISTS "Authenticated users can read plans" ON public.rake_plans;
CREATE POLICY "All authenticated users can read plans" 
ON public.rake_plans 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Rake Plan Orders: Viewers can read
DROP POLICY IF EXISTS "Authenticated users can read plan orders" ON public.rake_plan_orders;
CREATE POLICY "All authenticated users can read plan orders" 
ON public.rake_plan_orders 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Scenarios: Viewers can read
DROP POLICY IF EXISTS "Authenticated users can read scenarios" ON public.scenarios;
CREATE POLICY "All authenticated users can read scenarios" 
ON public.scenarios 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Add UPDATE and DELETE policies for rake_plans
CREATE POLICY "Planners can update plans" 
ON public.rake_plans 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'planner'::app_role) OR has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE and DELETE policies for rake_plan_orders
CREATE POLICY "Planners can update plan orders" 
ON public.rake_plan_orders 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'planner'::app_role) OR has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete plan orders" 
ON public.rake_plan_orders 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE and DELETE policies for scenarios
CREATE POLICY "Senior planners can update scenarios" 
ON public.scenarios 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete scenarios" 
ON public.scenarios 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));