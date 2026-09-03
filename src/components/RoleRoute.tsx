import { useAuth } from '@/contexts/AuthContext';
import { canAccessRoute, getDefaultRouteForRole } from '@/lib/role-access';
import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';

interface RoleRouteProps {
  children: React.ReactNode;
}

/**
 * Bloqueia rotas por perfil (ex.: vendedor não acessa financeiro).
 * Redireciona para a rota padrão do perfil.
 */
export function RoleRoute({ children }: RoleRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!canAccessRoute(user?.role, location.pathname)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return <>{children}</>;
}
