import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRouteForRole } from '@/lib/role-access';
import { authService } from '@/services/auth.service';

export const useRedirectAfterLogin = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      const currentUser = user || authService.getCurrentUser();
      const role = currentUser?.role?.toUpperCase()?.trim();
      
      if (import.meta.env.DEV) {
        console.log('🔄 useRedirectAfterLogin - Role:', role);
      }
      
      const destino = getDefaultRouteForRole(role);
      if (import.meta.env.DEV) {
        console.log('🔄 Redirecionando para', destino);
      }
      navigate(destino, { replace: true });
    }
  }, [isAuthenticated, user, isLoading, navigate]);
};

