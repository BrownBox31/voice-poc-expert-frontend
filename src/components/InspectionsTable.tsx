import React, { useState, useMemo } from 'react';
import type { VehicleInspection } from '../interfaces/inspection';

interface InspectionsTableProps {
  inspections: VehicleInspection[];
  isLoading?: boolean;
  onInspectionClick?: (inspection: VehicleInspection) => void;
}

const InspectionsTable: React.FC<InspectionsTableProps> = ({
  inspections,
  isLoading = false,
  onInspectionClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort inspections based on VIN search and inspection date
  const filteredInspections = useMemo(() => {
    let filtered = inspections;
    
    // Filter by search term if provided
    if (searchTerm.trim()) {
      filtered = inspections.filter(inspection => 
        inspection.vin.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
    }
    
    // Sort by inspection date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.inspectionDate ? new Date(a.inspectionDate).getTime() : 0;
      const dateB = b.inspectionDate ? new Date(b.inspectionDate).getTime() : 0;
      return dateB - dateA; // Newest first (descending order)
    });
  }, [inspections, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };
  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    
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





  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderEmptyState = () => {
    if (searchTerm && filteredInspections.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-400 text-xl">🔍</span>
          </div>
          <p className="text-gray-500 text-lg mb-2">No inspections match your search</p>
          <p className="text-sm text-gray-400 mb-4">
            No inspections found for VIN containing "{searchTerm}"
          </p>
          <button
            onClick={clearSearch}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Clear search
          </button>
        </div>
      );
    }

    if (inspections.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-400 text-xl">📋</span>
          </div>
          <p className="text-gray-500 text-lg mb-2">No inspections found</p>
          <p className="text-sm text-gray-400">
            Start your first vehicle inspection to see data here
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">
            Vehicle Inspections ({filteredInspections.length}{inspections.length !== filteredInspections.length ? ` of ${inspections.length}` : ''})
          </h3>
          
          {/* Search Input */}
          <div className="relative max-w-xs w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 text-sm">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search by VIN..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  title="Clear search"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Show empty state if no results */}
        {(filteredInspections.length === 0) ? (
          renderEmptyState()
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VIN
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date of Latest Inspection
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInspections.map((inspection, index) => (
                <tr 
                  key={inspection.vin || index}
                  className={`hover:bg-gray-50 ${onInspectionClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onInspectionClick?.(inspection)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {inspection.vin}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={getStatusBadge(inspection.overallStatus)}>
                      {inspection.overallStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">
                      {inspection.inspectionDate ? new Date(inspection.inspectionDate).toLocaleString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      className="text-blue-600 hover:text-blue-800 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectionClick?.(inspection);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default InspectionsTable;
