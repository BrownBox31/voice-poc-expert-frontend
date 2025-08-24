import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES, ProtectedRoute, PublicRoute } from './index';

// Import pages
import Login from '../../pages/login';
import Dashboard from '../../pages/dashboard';
import InspectionDetails from '../../pages/inspection-details';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Root route - redirect to dashboard if authenticated, login if not */}
        <Route 
          path={ROUTES.ROOT} 
          element={
            <Navigate 
              to={localStorage.getItem('accessToken') ? ROUTES.DASHBOARD : ROUTES.LOGIN} 
              replace 
            />
          } 
        />
        
        {/* Public routes */}
        <Route 
          path={ROUTES.LOGIN} 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path={ROUTES.DASHBOARD} 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path={ROUTES.INSPECTION_DETAILS} 
          element={
            <ProtectedRoute>
              <InspectionDetails />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all route - redirect to dashboard or login */}
        <Route 
          path="*" 
          element={
            <Navigate 
              to={localStorage.getItem('accessToken') ? ROUTES.DASHBOARD : ROUTES.LOGIN} 
              replace 
            />
          } 
        />
      </Routes>
    </Router>
  );
};

export default AppRouter;
