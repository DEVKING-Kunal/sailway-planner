import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentUserRoles } from '@/hooks/useRoles';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'senior_planner' | 'planner' | 'viewer';
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { data: roles, isLoading: rolesLoading } = useCurrentUserRoles();

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role requirements
  if (requireRole && roles) {
    const roleHierarchy = {
      'admin': 4,
      'senior_planner': 3,
      'planner': 2,
      'viewer': 1
    };

    const userMaxRole = Math.max(...roles.map(r => roleHierarchy[r.role] || 0));
    const requiredLevel = roleHierarchy[requireRole] || 0;

    if (userMaxRole < requiredLevel) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
