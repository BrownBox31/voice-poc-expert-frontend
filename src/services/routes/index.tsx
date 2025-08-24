import { Navigate } from 'react-router-dom';
import apiClient from '../data/interceptor';

// Route paths constants
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INSPECTION_DETAILS: '/inspection/:vin',
  ROOT: '/',
} as const;

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = apiClient.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  
  return <>{children}</>;
};

// Public Route wrapper (redirects to dashboard if already authenticated)
interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ 
  children, 
  redirectTo = ROUTES.DASHBOARD 
}) => {
  const isAuthenticated = apiClient.isAuthenticated();
  
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

// Route configuration type
export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  protected?: boolean;
  public?: boolean;
}

// Navigation utilities
export const navigationUtils = {
  goToLogin: () => {
    window.location.href = ROUTES.LOGIN;
  },
  
  goToDashboard: () => {
    window.location.href = ROUTES.DASHBOARD;
  },
  
  goToInspectionDetails: (vin: string) => {
    window.location.href = `/inspection/${vin}`;
  },
  
  logout: () => {
    apiClient.clearTokens();
    window.location.href = ROUTES.LOGIN;
  },
  
  isCurrentRoute: (path: string): boolean => {
    return window.location.pathname === path;
  }
};
