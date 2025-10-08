-- Ensure app_role enum has all required roles (viewer)
DO $$ 
BEGIN
  -- Add viewer role if it doesn't exist
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add missing UPDATE and DELETE policies for rake_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rake_plans' 
    AND policyname = 'Planners can update plans'
  ) THEN
    CREATE POLICY "Planners can update plans" 
    ON public.rake_plans 
    FOR UPDATE 
    TO authenticated
    USING (has_role(auth.uid(), 'planner'::app_role) OR has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add missing UPDATE and DELETE policies for rake_plan_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rake_plan_orders' 
    AND policyname = 'Planners can update plan orders'
  ) THEN
    CREATE POLICY "Planners can update plan orders" 
    ON public.rake_plan_orders 
    FOR UPDATE 
    TO authenticated
    USING (has_role(auth.uid(), 'planner'::app_role) OR has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rake_plan_orders' 
    AND policyname = 'Admins can delete plan orders'
  ) THEN
    CREATE POLICY "Admins can delete plan orders" 
    ON public.rake_plan_orders 
    FOR DELETE 
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add missing UPDATE and DELETE policies for scenarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scenarios' 
    AND policyname = 'Senior planners can update scenarios'
  ) THEN
    CREATE POLICY "Senior planners can update scenarios" 
    ON public.scenarios 
    FOR UPDATE 
    TO authenticated
    USING (has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scenarios' 
    AND policyname = 'Admins can delete scenarios'
  ) THEN
    CREATE POLICY "Admins can delete scenarios" 
    ON public.scenarios 
    FOR DELETE 
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;