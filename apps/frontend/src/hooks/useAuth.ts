import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import type {
  UserInfo,
  LoginCredentials,
  LoginResponse,
} from '../services/api';

// Query keys for auth-related queries
export const authQueryKeys = {
  currentUser: ['auth', 'currentUser'],
} as const;

/**
 * Hook for managing authentication state and actions
 */
export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query for current user info
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: () => apiClient.getCurrentUser(),
    enabled: apiClient.isAuthenticated(),
    retry: false, // Don't retry on auth failures
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => apiClient.login(credentials),
    onSuccess: (data: LoginResponse) => {
      // Update user query cache
      queryClient.setQueryData(authQueryKeys.currentUser, data.user);

      // Invalidate all queries to refetch with new auth
      queryClient.invalidateQueries();

      // Navigate to dashboard
      navigate('/');
    },
    onError: error => {
      console.error('Login failed:', error);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();

      // Navigate to login
      navigate('/login');
    },
    onError: error => {
      console.error('Logout failed:', error);

      // Even if logout fails, clear local state and redirect
      queryClient.clear();
      navigate('/login');
    },
  });

  // Session refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => apiClient.refreshSession(),
    onSuccess: (userData: UserInfo) => {
      // Update user query cache
      queryClient.setQueryData(authQueryKeys.currentUser, userData);
    },
    onError: error => {
      console.error('Session refresh failed:', error);
      // Don't force logout on refresh failure
    },
  });

  // Computed states
  const isAuthenticated = apiClient.isAuthenticated();
  const isAdmin = user?.role === 'ADMIN';
  const isViewer = user?.role === 'VIEWER';

  return {
    // User state
    user,
    isAuthenticated,
    isAdmin,
    isViewer,
    isLoadingUser,
    userError,

    // Actions
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    refreshSession: refreshMutation.mutate,
    refetchUser,

    // Loading states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRefreshing: refreshMutation.isPending,

    // Errors
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
    refreshError: refreshMutation.error,
  };
}

/**
 * Hook for checking if user has specific role
 */
export function useHasRole(requiredRole: 'ADMIN' | 'VIEWER') {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return false;
  }

  // Role hierarchy: ADMIN > VIEWER
  const roleHierarchy = {
    VIEWER: 1,
    ADMIN: 2,
  };

  const userRoleLevel = roleHierarchy[user.role];
  const requiredRoleLevel = roleHierarchy[requiredRole];

  return userRoleLevel >= requiredRoleLevel;
}
