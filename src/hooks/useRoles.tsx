import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'admin' | 'senior_planner' | 'planner' | 'viewer';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const useUserRoles = (userId?: string) => {
  return useQuery({
    queryKey: ['userRoles', userId],
    queryFn: async () => {
      const query = supabase.from('user_roles').select('*');
      if (userId) {
        query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as UserRole[];
    },
  });
};

export const useCurrentUserRoles = () => {
  return useQuery({
    queryKey: ['currentUserRoles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as UserRole[];
    },
  });
};

export const useHasRole = (role: AppRole) => {
  const { data: roles = [] } = useCurrentUserRoles();
  return roles.some((r) => r.role === role);
};

export const useIsAdmin = () => useHasRole('admin');
export const useIsSeniorPlanner = () => useHasRole('senior_planner');
export const useIsPlanner = () => useHasRole('planner');
export const useIsViewer = () => useHasRole('viewer');

export const useAssignRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast({
        title: "Role assigned",
        description: "User role has been successfully assigned.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error assigning role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast({
        title: "Role removed",
        description: "User role has been successfully removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
