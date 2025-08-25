import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/button';
import apiService from '../services/data/api_service_class';
import { ApiEndpoints } from '../services/data/apis';
import type { ApiResponse } from '../interfaces/api';

// Define interface for inspection summary (grouped by inspectionId)
interface InspectionSummary {
  inspectionId: string;
  vin: string;
  issueCount: number;
  openIssuesCount: number;
  closedIssuesCount: number;
  createdAt: string;
  lastUpdated: string;
  status: string; // Overall status of the inspection
}

// Define interface for the raw inspection issue (same as in inspection-details)
interface InspectionResolutionComment {
  voiceClipUrl: string;
  comment: string;
  type: string;
}

interface InspectionIssue {
  id: number;
  status: string;
  vin: string;
  issueDescription: string;
  createdAt: string;
  inspectionId: number; // This is actually a number in the API
  InspectionResolutionComments?: InspectionResolutionComment[];
  createdByUserId: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

type InspectionIssuesResponse = InspectionIssue[];

const InspectionList: React.FC = () => {
  const { vin } = useParams<{ vin: string }>();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [issuesData, setIssuesData] = useState<InspectionIssue[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [issueComments, setIssueComments] = useState<Record<number, string>>({});
  const [updatingIssues, setUpdatingIssues] = useState<Set<number>>(new Set());
  const [updateSuccess, setUpdateSuccess] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [issueSearchTerm, setIssueSearchTerm] = useState<string>('');

  // Helper function to check if an issue is resolved
  const isIssueResolved = (status: string): boolean => {
    const resolvedStatuses = ['COMPLETED', 'APPROVED', 'CLOSED'];
    return resolvedStatuses.includes(status.toUpperCase());
  };

  useEffect(() => {
    if (vin) {
      fetchInspectionsByVin(vin);
    }
  }, [vin]);

  const fetchInspectionsByVin = async (vinNumber: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the inspection details endpoint to get all issues for this VIN
      const url = `${ApiEndpoints.INSPECTION_DETAILS}${vinNumber}`;
      const response = await apiService.get<InspectionIssuesResponse>(url);

      // Handle response based on API structure
      let issuesData: InspectionIssuesResponse | null = null;
      
      if (response && typeof response === 'object') {
        if ('data' in response && response.data) {
          issuesData = response.data as InspectionIssuesResponse;
        } else {
          // Check if response has ApiResponse structure
          const apiResponse = response as ApiResponse<InspectionIssuesResponse>;
          if (apiResponse.success && apiResponse.data) {
            issuesData = apiResponse.data;
          } else {
            // Handle direct array response
            if (Array.isArray(response)) {
              issuesData = response as InspectionIssuesResponse;
            } else {
              issuesData = response as unknown as InspectionIssuesResponse;
            }
          }
        }
      }
      
      // Filter issues for the specific VIN
      if (Array.isArray(issuesData)) {
        issuesData = issuesData.filter(issue => issue.vin === vinNumber);
        
        // Group issues by inspectionId to create inspection summaries
        const inspectionGroups = issuesData.reduce((groups: Record<string, InspectionIssue[]>, issue) => {
          const inspectionId = String(issue.inspectionId || 'unknown');
          if (!groups[inspectionId]) {
            groups[inspectionId] = [];
          }
          groups[inspectionId].push(issue);
          return groups;
        }, {});

        // Convert groups to InspectionSummary array
        const inspectionSummaries: InspectionSummary[] = Object.entries(inspectionGroups).map(([inspectionId, issues]) => {
          const openIssues = issues.filter(issue => !isIssueResolved(issue.status));
          const closedIssues = issues.filter(issue => isIssueResolved(issue.status));
          
          // Sort issues by creation date to get the earliest and latest
          const sortedIssues = [...issues].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const earliestIssue = sortedIssues[0];
          const latestIssue = sortedIssues[sortedIssues.length - 1];
          
          // Determine overall inspection status
          let status = 'completed';
          if (openIssues.length > 0) {
            status = openIssues.length === issues.length ? 'pending' : 'in_progress';
          }

          return {
            inspectionId,
            vin: vinNumber,
            issueCount: issues.length,
            openIssuesCount: openIssues.length,
            closedIssuesCount: closedIssues.length,
            createdAt: earliestIssue.createdAt,
            lastUpdated: latestIssue.createdAt,
            status
          };
        });

        // Sort inspections by creation date (newest first)
        inspectionSummaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setInspections(inspectionSummaries);
        setIssuesData(issuesData); // Store the raw issues data for navigation
      } else {
        setInspections([]);
      }
    } catch (error) {
      setError(error as string);
      setInspections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleInspectionClick = (inspectionId: string) => {
    setSelectedInspectionId(inspectionId);
    // Reset issue-related state when selecting a new inspection
    setSelectedIssues(new Set());
    setIssueComments({});
    setUpdateSuccess({});
    setStatusFilter('all');
    setIssueSearchTerm('');
  };

  const handleBackToInspectionGrid = () => {
    setSelectedInspectionId(null);
    setSelectedIssues(new Set());
    setIssueComments({});
    setUpdateSuccess({});
    setStatusFilter('all');
    setIssueSearchTerm('');
  };

  const handleCheckboxChange = (issueId: number) => {
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const handleCommentChange = (issueId: number, comment: string) => {
    setIssueComments(prev => ({
      ...prev,
      [issueId]: comment
    }));
  };

  const updateIssueStatus = async (issueId: number) => {
    const comment = issueComments[issueId];
    const isSelected = selectedIssues.has(issueId);
    
    if (!isSelected || !comment?.trim()) {
      alert('Please select the issue and add a comment before updating.');
      return;
    }

    try {
      setUpdatingIssues(prev => new Set([...prev, issueId]));
      setUpdateSuccess(prev => ({ ...prev, [issueId]: false }));
      
      const url = `${ApiEndpoints.UPDATE_ISSUE_STATUS}${issueId}`;
      const payload = {
        status: "closed",
        comments: comment.trim()
      };

      await apiService.patch(url, payload);
      
      // Mark as successfully updated
      setUpdateSuccess(prev => ({ ...prev, [issueId]: true }));
      
      // Remove from selected issues after successful update
      setSelectedIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueId);
        return newSet;
      });
      
      // Clear the comment for this issue since it's now resolved
      setIssueComments(prev => {
        const updated = { ...prev };
        delete updated[issueId];
        return updated;
      });
      
      // Show success feedback briefly
      setTimeout(() => {
        setUpdateSuccess(prev => ({ ...prev, [issueId]: false }));
      }, 3000);
      
      // Refetch the inspection data to update counts and statuses
      if (vin) {
        await fetchInspectionsByVin(vin);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update issue status. Please try again.';
      alert(errorMessage);
    } finally {
      setUpdatingIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-sm font-medium rounded-full";
    
    switch (status.toLowerCase()) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'in_progress':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'pending':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Filter inspections based on search term
  const filteredInspections = React.useMemo(() => {
    if (!searchTerm.trim()) return inspections;
    
    const searchLower = searchTerm.toLowerCase();
    return inspections.filter(inspection => 
      inspection.inspectionId.toLowerCase().includes(searchLower)
    );
  }, [inspections, searchTerm]);

  // Get issues for selected inspection
  const selectedInspectionIssues = React.useMemo(() => {
    if (!selectedInspectionId || !issuesData) return [];
    
    return issuesData.filter(issue => 
      issue.vin === vin && String(issue.inspectionId) === selectedInspectionId
    );
  }, [selectedInspectionId, issuesData, vin]);

  // Filter issues based on status and search term
  const filteredIssues = React.useMemo(() => {
    if (!selectedInspectionIssues.length) return [];
    
    let filtered = selectedInspectionIssues;
    
    // Filter by status
    if (statusFilter === 'open') {
      filtered = filtered.filter(issue => !isIssueResolved(issue.status));
    } else if (statusFilter === 'closed') {
      filtered = filtered.filter(issue => isIssueResolved(issue.status));
    }
    
    // Filter by search term
    if (issueSearchTerm.trim()) {
      const searchLower = issueSearchTerm.toLowerCase();
      filtered = filtered.filter(issue => 
        issue.issueDescription.toLowerCase().includes(searchLower) ||
        issue.id.toString().includes(searchLower)
      );
    }
    
    return filtered;
  }, [selectedInspectionIssues, statusFilter, issueSearchTerm]);

  // Get counts for different statuses
  const statusCounts = React.useMemo(() => {
    if (!selectedInspectionIssues.length) {
      return { total: 0, open: 0, closed: 0 };
    }
    
    const total = selectedInspectionIssues.length;
    const closed = selectedInspectionIssues.filter(issue => isIssueResolved(issue.status)).length;
    const open = total - closed;
    
    return { total, open, closed };
  }, [selectedInspectionIssues]);

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inspections for VIN</h1>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Inspections</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => vin && fetchInspectionsByVin(vin)} variant="primary">
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (filteredInspections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inspections for VIN</h1>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Inspections Found</h3>
                <p className="text-gray-600">
                  {searchTerm ? `No inspections found matching "${searchTerm}"` : `No inspections found for VIN: ${vin}`}
                </p>
                {searchTerm && (
                  <Button 
                    onClick={() => setSearchTerm('')} 
                    variant="secondary" 
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show inspection details if an inspection is selected
  if (selectedInspectionId) {
    const selectedInspection = inspections.find(insp => insp.inspectionId === selectedInspectionId);
    
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inspection Details</h1>
                <p className="text-sm text-gray-600">
                  VIN: {vin} • Inspection ID: {selectedInspectionId}
                  {filteredIssues.length > 0 && (
                    <>
                      {` • ${filteredIssues.length} of ${selectedInspectionIssues.length} issue${selectedInspectionIssues.length !== 1 ? 's' : ''}`}
                      {statusFilter !== 'all' && ` (${statusFilter})`}
                      {issueSearchTerm && ` matching "${issueSearchTerm}"`}
                    </>
                  )}
                  {selectedIssues.size > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • {selectedIssues.size} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleBackToInspectionGrid} variant="secondary">
                  Back to Inspections
                </Button>
                <Button onClick={handleBackToDashboard} variant="secondary">
                  Dashboard
                </Button>
              </div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedInspection && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <span className={getStatusBadge(selectedInspection.status)}>
                        {selectedInspection.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  {/* Audio Player - Show if we have resolution audio */}
                  {(() => {
                    const audioLink = selectedInspectionIssues.length > 0 
                      && selectedInspectionIssues[0].InspectionResolutionComments 
                      && selectedInspectionIssues[0].InspectionResolutionComments.length > 0
                      ? selectedInspectionIssues[0].InspectionResolutionComments[0].voiceClipUrl 
                      : null;
                    
                    return audioLink ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500 mb-2">Listen to Issue Recording</p>
                        <audio controls className="w-full h-8">
                          <source src={audioLink} type="audio/mpeg" />
                          <source src={audioLink} type="audio/wav" />
                          <source src={audioLink} type="audio/ogg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Filters */}
            {selectedInspectionIssues.length > 0 && (
              <div className="bg-white shadow rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                    {/* Status Filter */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                            statusFilter === 'all'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          All ({statusCounts.total})
                        </button>
                        <button
                          onClick={() => setStatusFilter('open')}
                          className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                            statusFilter === 'open'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          Open ({statusCounts.open})
                        </button>
                        <button
                          onClick={() => setStatusFilter('closed')}
                          className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                            statusFilter === 'closed'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                          }`}
                        >
                          Closed ({statusCounts.closed})
                        </button>
                      </div>
                    </div>
                    
                    {/* Search Filter */}
                    <div className="flex items-center space-x-2 flex-1 max-w-md">
                      <span className="text-sm font-medium text-gray-700">Search:</span>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={issueSearchTerm}
                          onChange={(e) => setIssueSearchTerm(e.target.value)}
                          placeholder="Search by issue description or ID..."
                          className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        {issueSearchTerm && (
                          <button
                            onClick={() => setIssueSearchTerm('')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inspection Issues */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Inspection Issues</h3>
                
                {filteredIssues.length > 0 ? (
                  <div className="space-y-4">
                    {filteredIssues.map((issue) => (
                      <div key={issue.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                            <span className="text-sm font-medium text-gray-900">#{issue.id}</span>
                            <span className={getStatusBadge(issue.status)}>
                              {issue.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <input
                              type="checkbox"
                              checked={isIssueResolved(issue.status) || selectedIssues.has(issue.id)}
                              onChange={() => handleCheckboxChange(issue.id)}
                              disabled={isIssueResolved(issue.status)}
                              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                                isIssueResolved(issue.status) ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!isIssueResolved(issue.status) ? (
                              <Button
                                onClick={() => updateIssueStatus(issue.id)}
                                disabled={!selectedIssues.has(issue.id) || !issueComments[issue.id]?.trim() || updatingIssues.has(issue.id)}
                                variant={updateSuccess[issue.id] ? "secondary" : "primary"}
                                size="small"
                                className={`min-w-[80px] ${
                                  updateSuccess[issue.id] 
                                    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                                    : ''
                                }`}
                              >
                                {updatingIssues.has(issue.id) ? (
                                  <div className="flex items-center space-x-1">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                    <span>...</span>
                                  </div>
                                ) : updateSuccess[issue.id] ? (
                                  <div className="flex items-center space-x-1">
                                    <span>✓</span>
                                    <span>Updated</span>
                                  </div>
                                ) : (
                                  'Update'
                                )}
                              </Button>
                            ) : (
                              <span className="text-sm text-green-600 font-medium">
                                ✓ Resolved
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Issue Description */}
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Description:</h4>
                          <p className="text-sm text-gray-900">{issue.issueDescription}</p>
                        </div>

                        {/* Meta Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Created by:</span>
                            <div className="text-gray-600">
                              {issue.createdByUserId.firstName} {issue.createdByUserId.lastName}
                              <span className="text-xs text-gray-400 ml-1">(ID: {issue.createdByUserId.id})</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Created at:</span>
                            <div className="text-gray-600">
                              {issue.createdAt ? new Date(issue.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Comments Section */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Comments:</h4>
                          {isIssueResolved(issue.status) ? (
                            <div className="w-full p-3 text-sm border border-gray-300 rounded-md bg-gray-50">
                              {issue.InspectionResolutionComments && issue.InspectionResolutionComments.length > 0 ? (
                                <div>
                                  {issue.InspectionResolutionComments
                                    .filter(comment => comment.type === "RESOLUTION_COMMENT")
                                    .map((comment, index) => (
                                      <div key={index} className="mb-2 last:mb-0">
                                        <div className="text-gray-700 mb-1">{comment.comment}</div>
                                        {comment.voiceClipUrl && (
                                          <div className="mt-2">
                                            <audio controls className="w-full h-8">
                                              <source src={comment.voiceClipUrl} type="audio/mpeg" />
                                              <source src={comment.voiceClipUrl} type="audio/wav" />
                                              <source src={comment.voiceClipUrl} type="audio/ogg" />
                                              Your browser does not support the audio element.
                                            </audio>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  {issue.InspectionResolutionComments.filter(comment => comment.type === "RESOLUTION_COMMENT").length === 0 && (
                                    <div className="text-gray-500 italic">No resolution comments available</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic">Issue resolved</div>
                              )}
                            </div>
                          ) : (
                            <textarea
                              value={issueComments[issue.id] || ''}
                              onChange={(e) => handleCommentChange(issue.id, e.target.value)}
                              placeholder="Add comments..."
                              className="w-full p-3 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-400 text-xl">📋</span>
                    </div>
                    {selectedInspectionIssues.length > 0 ? (
                      <div>
                        <p className="text-gray-500 text-lg mb-2">No matching issues found</p>
                        <p className="text-sm text-gray-400">
                          {statusFilter !== 'all' && `No ${statusFilter} issues found`}
                          {issueSearchTerm && ` matching "${issueSearchTerm}"`}
                          {(statusFilter !== 'all' || issueSearchTerm) && '. Try adjusting your filters.'}
                        </p>
                        {(statusFilter !== 'all' || issueSearchTerm) && (
                          <button
                            onClick={() => {
                              setStatusFilter('all');
                              setIssueSearchTerm('');
                            }}
                            className="mt-3 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-500 text-lg mb-2">No issues found</p>
                        <p className="text-sm text-gray-400">
                          No issues were found for this inspection.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              {filteredIssues.length > 0 && selectedIssues.size > 0 && (
                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      setSelectedIssues(new Set());
                      setIssueComments({});
                      setUpdateSuccess({});
                    }}
                    variant="secondary"
                  >
                    Clear All Selections
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show inspection grid (default view)
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inspections for VIN</h1>
              <p className="text-sm text-gray-600">
                VIN: {vin} • {filteredInspections.length} inspection{filteredInspections.length !== 1 ? 's' : ''} found
                {searchTerm && ` matching "${searchTerm}"`}
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
          {/* Search Filter */}
          {inspections.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Search Inspections</h3>
                <div className="relative max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by inspection ID..."
                    className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inspections Grid */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Select an Inspection</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInspections.map((inspection) => (
                  <div 
                    key={inspection.inspectionId}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-300"
                    onClick={() => handleInspectionClick(inspection.inspectionId)}
                  >
                    {/* Inspection ID Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        ID: {inspection.inspectionId}
                      </h4>
                      <span className={getStatusBadge(inspection.status)}>
                        {inspection.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Statistics */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Total Issues:</span>
                        <span className="text-sm font-semibold text-gray-900">{inspection.issueCount}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Open Issues:</span>
                        <span className={`text-sm font-semibold ${
                          inspection.openIssuesCount > 0 ? 'text-orange-600' : 'text-gray-900'
                        }`}>
                          {inspection.openIssuesCount}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Closed Issues:</span>
                        <span className={`text-sm font-semibold ${
                          inspection.closedIssuesCount > 0 ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {inspection.closedIssuesCount}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{Math.round((inspection.closedIssuesCount / inspection.issueCount) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(inspection.closedIssuesCount / inspection.issueCount) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Created:</span> {' '}
                        {new Date(inspection.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div>
                        <span className="font-medium">Last Updated:</span> {' '}
                        {new Date(inspection.lastUpdated).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* View Details Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button 
                        onClick={() => handleInspectionClick(inspection.inspectionId)}
                        variant="primary"
                        size="small"
                        className="w-full"
                      >
                        View Issues ({inspection.issueCount})
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InspectionList;
