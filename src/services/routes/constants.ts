import apiClient from '../data/interceptor';

// Route paths constants
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INSPECTION_DETAILS: '/inspection/:vin',
  ROOT: '/',
} as const;

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
