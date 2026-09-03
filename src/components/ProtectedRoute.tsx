import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, isSuperAdmin, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se for SUPER_ADMIN, redireciona para o painel admin
  const currentUser = user || authService.getCurrentUser();
  const role = currentUser?.role?.toUpperCase()?.trim();
  if (role === 'SUPER_ADMIN' || isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

