import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/button';
import apiService from '../services/data/api_service_class';
import { ApiEndpoints } from '../services/data/apis';

// Define a flexible inspection details interface that can handle various API response structures
interface InspectionDetailsResponse {
  vin?: string;
  status?: string;
  overallStatus?: string;
  inspectionDate?: string;
  overallScore?: number;
  inspectionCount?: number;
  notes?: string;
  vehicleInfo?: {
    make?: string;
    model?: string;
    year?: number;
    vin?: string;
    licensePlate?: string;
    mileage?: number;
    color?: string;
  };
  inspectionItems?: Array<{
    id?: string;
    category?: string;
    itemName?: string;
    status?: string;
    severity?: string;
    description?: string;
    recommendations?: string;
    images?: string[];
  }>;
  images?: Array<{
    id?: string;
    url?: string;
    thumbnailUrl?: string;
    caption?: string;
    category?: string;
    uploadedAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  // Allow for any additional properties the API might return
  [key: string]: unknown;
}

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
          inspectionData = response as InspectionDetailsResponse;
        }
      }
      
      console.log('Processed inspection data:', inspectionData);
      
      // If we got minimal data, create a basic structure
      if (inspectionData && Object.keys(inspectionData).length === 0) {
        inspectionData = {
          vin: vinNumber,
          status: 'unknown',
          overallStatus: 'unknown',
          inspectionCount: 0
        };
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
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getItemStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded";
    
    switch (status.toLowerCase()) {
      case 'pass':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'fail':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'not_applicable':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    
    const baseClasses = "px-2 py-1 text-xs font-medium rounded ml-2";
    
    switch (severity.toLowerCase()) {
      case 'critical':
        return `${baseClasses} bg-red-600 text-white`;
      case 'high':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`;
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
      <div className="min-h-screen bg-gray-50">
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

  if (!inspection) {
    return (
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inspection Details</h1>
              <p className="text-sm text-gray-600">
                VIN: {inspection.vehicleInfo?.vin || inspection.vin || vin}
                {inspection.vehicleInfo?.year && inspection.vehicleInfo?.make && inspection.vehicleInfo?.model && 
                  ` • ${inspection.vehicleInfo.year} ${inspection.vehicleInfo.make} ${inspection.vehicleInfo.model}`
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div className="mt-1">
                    <span className={getStatusBadge(inspection.status || inspection.overallStatus || 'unknown')}>
                      {(inspection.status || inspection.overallStatus || 'unknown').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {inspection.inspectionDate && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Inspection Date</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(inspection.inspectionDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {inspection.overallScore !== undefined && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">Overall Score</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {inspection.overallScore}/100
                    </p>
                  </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">Items Inspected</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {inspection.inspectionItems?.length || inspection.inspectionCount || 0}
                  </p>
                </div>
              </div>

              {inspection.notes && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    {inspection.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Information */}
          {(inspection.vehicleInfo || inspection.vin) && (
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inspection.vehicleInfo?.make && inspection.vehicleInfo?.model && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Make & Model</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {inspection.vehicleInfo.make} {inspection.vehicleInfo.model}
                      </p>
                    </div>
                  )}
                  
                  {inspection.vehicleInfo?.year && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Year</p>
                      <p className="mt-1 text-sm text-gray-900">{inspection.vehicleInfo.year}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">VIN</p>
                    <p className="mt-1 text-sm text-gray-900 font-mono">
                      {inspection.vehicleInfo?.vin || inspection.vin || vin}
                    </p>
                  </div>
                  
                  {inspection.vehicleInfo?.mileage && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Mileage</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {inspection.vehicleInfo.mileage.toLocaleString()} miles
                      </p>
                    </div>
                  )}
                  
                  {inspection.vehicleInfo?.color && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Color</p>
                      <p className="mt-1 text-sm text-gray-900">{inspection.vehicleInfo.color}</p>
                    </div>
                  )}
                  
                  {inspection.vehicleInfo?.licensePlate && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">License Plate</p>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {inspection.vehicleInfo.licensePlate}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inspection Items */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Inspection Items</h3>
              
              {inspection.inspectionItems && inspection.inspectionItems.length > 0 ? (
                <div className="space-y-4">
                  {inspection.inspectionItems.map((item, index) => (
                    <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.itemName || `Item ${index + 1}`}</h4>
                          {item.category && (
                            <p className="text-sm text-gray-500 capitalize">{item.category.replace('_', ' ')}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center">
                          {item.status && (
                            <span className={getItemStatusBadge(item.status)}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                          {item.severity && (
                            <span className={getSeverityBadge(item.severity)}>
                              {item.severity.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-gray-700 mb-2">{item.description}</p>
                      )}
                      
                      {item.recommendations && (
                        <div className="bg-blue-50 p-3 rounded mt-2">
                          <p className="text-sm font-medium text-blue-800">Recommendations:</p>
                          <p className="text-sm text-blue-700">{item.recommendations}</p>
                        </div>
                      )}
                      
                      {item.images && item.images.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Images:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.images.map((imageUrl, imgIndex) => (
                              <div key={imgIndex} className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                                <span className="text-gray-400 text-xs">📷</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 text-xl">📋</span>
                  </div>
                  <p className="text-gray-500 text-lg mb-2">No inspection items available</p>
                  <p className="text-sm text-gray-400">
                    Detailed inspection items are not available for this VIN.
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
