import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/button';
import InspectionsTable from '../components/InspectionsTable';
import { navigationUtils } from '../services/routes/constants';
import apiService from '../services/data/api_service_class';
import { ApiEndpoints } from '../services/data/apis';
import type { VehicleInspection, InspectionListResponse } from '../interfaces/inspection';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get<InspectionListResponse>(ApiEndpoints.ALL_INSPECTIONS);      
      
      // The API is returning the data directly, not wrapped in a data property
      let fetchedInspections: VehicleInspection[] = [];
      
      

      if (Array.isArray(response)) {
        // Response is directly an array
        fetchedInspections = response;
      } else if (response && typeof response === 'object') {
        // Check if response has a data property
        if ('data' in response && Array.isArray(response.data)) {
          fetchedInspections = response.data;
        } else if ('data' in response && response.data && typeof response.data === 'object') {
          // Check if data has an inspections property
          const responseData = response.data as InspectionListResponse;
          if ('inspections' in responseData && Array.isArray(responseData.inspections)) {
            fetchedInspections = responseData.inspections;
          }
        }
      }
      
      setInspections(fetchedInspections);
      setIsLoading(false);
    } catch (error) {
      setInspections([]);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    navigationUtils.logout();
  };

  const handleInspectionClick = (inspection: VehicleInspection) => {
    navigate(`/inspection/${inspection.vin}`);
  };

  

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inspections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Vehicle Inspection Expert
              </h1>
              <p className="text-sm text-gray-600">
                Dashboard Overview
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleLogout}
                variant="secondary"
                size="small"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <InspectionsTable 
            inspections={inspections} 
            isLoading={isLoading}
            onInspectionClick={handleInspectionClick}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
