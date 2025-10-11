-- Fix 1: Add DELETE policy to production_recommendations table
CREATE POLICY "Senior planners can delete recommendations"
ON public.production_recommendations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own recommendations"
ON public.production_recommendations
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Fix 2: Add UPDATE and DELETE policies to performance_metrics table
CREATE POLICY "Senior planners can update metrics"
ON public.performance_metrics
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'senior_planner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete metrics"
ON public.performance_metrics
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Add DELETE policy to role_requests table
CREATE POLICY "Users can delete own pending requests"
ON public.role_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can delete requests"
ON public.role_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));