-- Fix infinite recursion in user_roles RLS policy
-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Recreate the policy using the existing has_role() function to prevent recursion
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));