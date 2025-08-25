import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/button';
import apiService from '../services/data/api_service_class';
import { ApiEndpoints } from '../services/data/apis';
import type { ApiResponse } from '../interfaces/api';

// Define interface based on actual API response structure
interface InspectionIssue {
  id: number;
  status: string;
  vin: string;
  issueDescription: string;
  createdByUserId: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

// API returns an array of inspection issues
type InspectionDetailsResponse = InspectionIssue[];

const InspectionDetails: React.FC = () => {
  const { vin } = useParams<{ vin: string }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vin) {
      fetchInspectionDetails(vin);
    }
  }, [vin]);

  const fetchInspectionDetails = async (vinNumber: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Construct the full URL by appending the VIN to the endpoint
      const url = `${ApiEndpoints.INSPECTION_DETAILS}${vinNumber}`;
      const response = await apiService.get<InspectionDetailsResponse>(url);
      
      console.log('Raw API response:', response);
      
      // Handle response based on API structure
      let inspectionData: InspectionDetailsResponse | null = null;
      
      if (response && typeof response === 'object') {
        if ('data' in response && response.data) {
          inspectionData = response.data as InspectionDetailsResponse;
        } else {
          // Check if response has ApiResponse structure
          const apiResponse = response as ApiResponse<InspectionDetailsResponse>;
          if (apiResponse.success && apiResponse.data) {
            inspectionData = apiResponse.data;
          } else {
            // Handle direct array response
            if (Array.isArray(response)) {
              inspectionData = response as InspectionDetailsResponse;
            } else {
              inspectionData = response as unknown as InspectionDetailsResponse;
            }
          }
        }
      }
      
      console.log('Processed inspection data:', inspectionData);
      
      // Filter issues for the specific VIN if we have an array
      if (Array.isArray(inspectionData)) {
        inspectionData = inspectionData.filter(issue => issue.vin === vinNumber);
      }
      
      setInspection(inspectionData);
    } catch (error) {
      console.error('Failed to fetch inspection details:', error);
      setError('Failed to load inspection details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-sm font-medium rounded-full";
    
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'APPROVED':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'UNDER_PROGRESS':
      case 'IN_PROGRESS':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'PENDING':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'OPEN':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inspection details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inspection Details</h1>
                <p className="text-sm text-gray-600">VIN: {vin}</p>
              </div>
              <Button onClick={handleBackToDashboard} variant="secondary">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-500 text-xl">⚠️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Details</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => vin && fetchInspectionDetails(vin)} variant="primary">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!inspection || (Array.isArray(inspection) && inspection.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inspection Details</h1>
                <p className="text-sm text-gray-600">VIN: {vin}</p>
              </div>
              <Button onClick={handleBackToDashboard} variant="secondary">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-xl">📋</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Inspection Found</h3>
                <p className="text-gray-600">No inspection details found for VIN: {vin}</p>
              </div>
            </div>
          </div>
        </main>
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
              <h1 className="text-2xl font-bold text-gray-900">Inspection Details</h1>
              <p className="text-sm text-gray-600">
                VIN: {vin}
                {Array.isArray(inspection) && inspection.length > 0 && 
                  ` • ${inspection.length} issue${inspection.length !== 1 ? 's' : ''} found`
                }
              </p>
            </div>
            <Button onClick={handleBackToDashboard} variant="secondary">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Inspection Overview */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Inspection Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">VIN</p>
                  <p className="mt-1 text-sm font-mono text-gray-900">{vin}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Total Issues</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {Array.isArray(inspection) ? inspection.length : 0}
                  </p>
                </div>
                
                {Array.isArray(inspection) && inspection.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Status Distribution</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Array.from(new Set(inspection.map(issue => issue.status))).map(status => (
                        <span key={status} className={getStatusBadge(status)} style={{fontSize: '10px', padding: '2px 6px'}}>
                          {status}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inspection Issues */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Inspection Issues</h3>
              
              {Array.isArray(inspection) && inspection.length > 0 ? (
                <div className="space-y-4">
                  {inspection.map((issue) => (
                    <div key={issue.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">Issue #{issue.id}</h4>
                            <span className={getStatusBadge(issue.status)}>
                              {issue.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">VIN: {issue.vin}</p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-500 mb-1">Issue Description</p>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                          {issue.issueDescription}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">Created by:</span>{' '}
                          {issue.createdByUserId.firstName} {issue.createdByUserId.lastName}
                          <span className="text-gray-400 ml-1">(ID: {issue.createdByUserId.id})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 text-xl">📋</span>
                  </div>
                  <p className="text-gray-500 text-lg mb-2">No inspection issues found</p>
                  <p className="text-sm text-gray-400">
                    No issues were found for this VIN.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InspectionDetails;
