-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'senior_planner', 'planner', 'viewer');

-- Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can insert/update/delete roles
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fix search_path for existing function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Replace public RLS policies on customer_orders
DROP POLICY IF EXISTS "Allow public read access" ON public.customer_orders;
DROP POLICY IF EXISTS "Allow public insert access" ON public.customer_orders;
DROP POLICY IF EXISTS "Allow public update access" ON public.customer_orders;
DROP POLICY IF EXISTS "Allow public delete access" ON public.customer_orders;

CREATE POLICY "Authenticated users can read orders"
ON public.customer_orders
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Planners can create orders"
ON public.customer_orders
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'planner') OR 
  public.has_role(auth.uid(), 'senior_planner') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Planners can update orders"
ON public.customer_orders
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'planner') OR 
  public.has_role(auth.uid(), 'senior_planner') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete orders"
ON public.customer_orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Replace public RLS policies on inventory
DROP POLICY IF EXISTS "Allow public read access" ON public.inventory;
DROP POLICY IF EXISTS "Allow public insert access" ON public.inventory;
DROP POLICY IF EXISTS "Allow public update access" ON public.inventory;

CREATE POLICY "Authenticated users can read inventory"
ON public.inventory
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Planners can manage inventory"
ON public.inventory
FOR ALL
USING (
  public.has_role(auth.uid(), 'planner') OR 
  public.has_role(auth.uid(), 'senior_planner') OR
  public.has_role(auth.uid(), 'admin')
);

-- Replace public RLS policies on loading_points
DROP POLICY IF EXISTS "Allow public read access" ON public.loading_points;
DROP POLICY IF EXISTS "Allow public insert access" ON public.loading_points;
DROP POLICY IF EXISTS "Allow public update access" ON public.loading_points;

CREATE POLICY "Authenticated users can read loading points"
ON public.loading_points
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage loading points"
ON public.loading_points
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Replace public RLS policies on wagon_availability
DROP POLICY IF EXISTS "Allow public read access" ON public.wagon_availability;
DROP POLICY IF EXISTS "Allow public update access" ON public.wagon_availability;

CREATE POLICY "Authenticated users can read wagons"
ON public.wagon_availability
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Planners can update wagons"
ON public.wagon_availability
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'planner') OR 
  public.has_role(auth.uid(), 'senior_planner') OR
  public.has_role(auth.uid(), 'admin')
);

-- Replace public RLS policies on rake_plans
DROP POLICY IF EXISTS "Allow public read access" ON public.rake_plans;
DROP POLICY IF EXISTS "Allow public insert access" ON public.rake_plans;
DROP POLICY IF EXISTS "Allow public delete access" ON public.rake_plans;

CREATE POLICY "Authenticated users can read plans"
ON public.rake_plans
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Planners can create plans"
ON public.rake_plans
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'planner') OR 
  public.has_role(auth.uid(), 'senior_planner') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete plans"
ON public.rake_plans
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Replace public RLS policies on rake_plan_orders
DROP POLICY IF EXISTS "Allow public read access" ON public.rake_plan_orders;
DROP POLICY IF EXISTS "Allow public insert access" ON public.rake_plan_orders;

CREATE POLICY "Authenticated users can read plan orders"
ON public.rake_plan_orders
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Planners can create plan orders"
ON public.rake_plan_orders
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'planner') OR 
  public.has_role(auth.uid(), 'senior_planner') OR
  public.has_role(auth.uid(), 'admin')
);

-- Replace public RLS policies on scenarios
DROP POLICY IF EXISTS "Allow public read access" ON public.scenarios;
DROP POLICY IF EXISTS "Allow public insert access" ON public.scenarios;

CREATE POLICY "Authenticated users can read scenarios"
ON public.scenarios
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Senior planners can create scenarios"
ON public.scenarios
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'senior_planner') OR
  public.has_role(auth.uid(), 'admin')
);