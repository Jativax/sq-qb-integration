import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiClient } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that checks for authentication
 * Redirects to login page if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [authed, setAuthed] = useState(apiClient.isAuthenticated());

  // Auto-login for E2E when enabled via Vite env
  useEffect(() => {
    const shouldAutoLogin = import.meta.env.VITE_E2E_AUTO_LOGIN === 'true';
    if (!authed && shouldAutoLogin && !isChecking) {
      setIsChecking(true);
      const email = import.meta.env.VITE_E2E_EMAIL || 'admin@sqqb.com';
      const password = import.meta.env.VITE_E2E_PASSWORD || 'admin123';
      apiClient
        .login({ email, password })
        .then(() => setAuthed(true))
        .finally(() => setIsChecking(false));
    }
  }, [authed, isChecking]);

  if (!authed) {
    if (isChecking) {
      return <></>;
    }
    // Redirect to login page with return path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
