-- Phase 1: Enhanced Cost Model & SLA Tracking

-- Add SLA tracking fields to customer_orders
ALTER TABLE public.customer_orders
ADD COLUMN sla_status text DEFAULT 'on_track' CHECK (sla_status IN ('on_track', 'at_risk', 'breached')),
ADD COLUMN expected_dispatch_date timestamp with time zone,
ADD COLUMN actual_dispatch_date timestamp with time zone,
ADD COLUMN transport_mode text DEFAULT 'rail' CHECK (transport_mode IN ('rail', 'road', 'hybrid'));

-- Add enhanced cost breakdown to rake_plans
ALTER TABLE public.rake_plans
ADD COLUMN cost_breakdown jsonb DEFAULT '{
  "base_freight": 0,
  "distance_cost": 0,
  "loading_cost": 0,
  "demurrage": 0,
  "penalty": 0,
  "idle_freight": 0,
  "priority_premium": 0,
  "total": 0
}'::jsonb,
ADD COLUMN sla_compliance_score numeric DEFAULT 100.0,
ADD COLUMN multi_destination boolean DEFAULT false;

-- Create table for production recommendations
CREATE TABLE public.production_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_date date NOT NULL DEFAULT CURRENT_DATE,
  product_name text NOT NULL,
  recommended_tonnage numeric NOT NULL,
  priority_score numeric NOT NULL,
  reasoning jsonb NOT NULL,
  based_on_orders integer NOT NULL,
  transport_capacity_available numeric NOT NULL,
  current_inventory numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on production_recommendations
ALTER TABLE public.production_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for production_recommendations
CREATE POLICY "All authenticated users can read production recommendations"
ON public.production_recommendations FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Senior planners can create recommendations"
ON public.production_recommendations FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Senior planners can update recommendations"
ON public.production_recommendations FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create performance analytics table
CREATE TABLE public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  total_rakes_formed integer DEFAULT 0,
  average_utilization numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  orders_fulfilled integer DEFAULT 0,
  orders_delayed integer DEFAULT 0,
  sla_compliance_rate numeric DEFAULT 100.0,
  wagon_utilization_rate numeric DEFAULT 0,
  loading_point_efficiency numeric DEFAULT 0,
  cost_per_tonne numeric DEFAULT 0,
  metrics_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on performance_metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance_metrics
CREATE POLICY "All authenticated users can read performance metrics"
ON public.performance_metrics FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Planners can insert performance metrics"
ON public.performance_metrics FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'planner'::app_role) OR has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_production_recommendations_date ON public.production_recommendations(recommendation_date DESC);
CREATE INDEX idx_performance_metrics_date ON public.performance_metrics(metric_date DESC);
CREATE INDEX idx_customer_orders_sla_status ON public.customer_orders(sla_status);
CREATE INDEX idx_customer_orders_transport_mode ON public.customer_orders(transport_mode);