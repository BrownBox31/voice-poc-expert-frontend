import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/button';
import InspectionCard from '../features/inspections/components/InspectionCard';
import {
  fetchInspectionsByVin,
  updateIssueStatus,
  updateIssue,
  filterInspections,
  getSelectedInspectionIssues,
  filterIssues,
  getStatusCounts,
  getStatusBadge,
  isIssueResolved,
  createIssueResolution,
  type InspectionSummary,
  type InspectionIssue,
  deleteIssueResolution
} from '../features/inspections/services/inspection_services';
import Loader from '../components/loader';
import { FiTrash2, FiEdit } from "react-icons/fi";
import { buildFileUrl } from "../utils/fileUrl";



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
  const [editingIssueId, setEditingIssueId] = useState<number | null>(null);
  const [editedDescription, setEditedDescription] = useState<string>('');
  const [updatingDescription, setUpdatingDescription] = useState<boolean>(false);
  const [addIssueOpen, setAddIssueOpen] = useState(false);

  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [newIssueActionType, setNewIssueActionType] = useState('');
  const [creatingIssue, setCreatingIssue] = useState(false);



  useEffect(() => {
    if (vin) {
      handleFetchInspections(vin);
    }
  }, [vin]);

  const handleFetchInspections = async (vinNumber: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { inspections, issuesData } = await fetchInspectionsByVin(vinNumber);
      setInspections(inspections);
      setIssuesData(issuesData);
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

  const handleUpdateIssueStatus = async (issueId: number) => {
    const comment = issueComments[issueId];
    const isSelected = selectedIssues.has(issueId);

    if (!isSelected || !comment?.trim()) {
      alert('Please select the issue and add a comment before updating.');
      return;
    }

    try {
      setUpdatingIssues(prev => new Set([...prev, issueId]));
      setUpdateSuccess(prev => ({ ...prev, [issueId]: false }));

      await updateIssueStatus(issueId, comment.trim());

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
        await handleFetchInspections(vin);
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

  const handleEditClick = (issueId: number, currentDesc: string) => {
    setEditingIssueId(issueId);
    setEditedDescription(currentDesc);
  };

  const handleCancelEdit = () => {
    setEditingIssueId(null);
    setEditedDescription('');
  };

  const handleSaveEdit = async (issueId: number) => {
    if (!editedDescription.trim()) {
      alert('Description cannot be empty');
      return;
    }

    try {
      setUpdatingDescription(true);
      // console.log('Updating issue description for issue ID:', issueId,  editedDescription);
      await updateIssue(issueId, {
        issueDescription: editedDescription,
      });


      // Refresh data
      if (vin) {
        await handleFetchInspections(vin);
      }

      handleCancelEdit();
    } catch (error) {
      alert('Failed to update description');
    } finally {
      setUpdatingDescription(false);
    }
  };


  // Filter inspections based on search term
  const filteredInspections = React.useMemo(() => {
    return filterInspections(inspections, searchTerm);
  }, [inspections, searchTerm]);

  // Get issues for selected inspection
  const selectedInspectionIssues = React.useMemo(() => {
    return getSelectedInspectionIssues(issuesData, selectedInspectionId);
  }, [selectedInspectionId, issuesData]);

  // Filter issues based on status and search term
  const filteredIssues = React.useMemo(() => {
    return filterIssues(selectedInspectionIssues, statusFilter, issueSearchTerm);
  }, [selectedInspectionIssues, statusFilter, issueSearchTerm]);

  // Get counts for different statuses
  const statusCounts = React.useMemo(() => {
    return getStatusCounts(selectedInspectionIssues);
  }, [selectedInspectionIssues]);

  const handleCreateIssue = async () => {
    if (!newIssueDescription.trim()) {
      alert('Description is required');
      return;
    }

    if (!selectedInspectionId) {
      alert('Inspection not selected');
      return;
    }

    try {
      setCreatingIssue(true);
      console.log(filteredInspections)
      const inspectionId = filteredInspections[0]?.inspectionId;
      await createIssueResolution(
        Number(inspectionId),
        vin,
        newIssueDescription,
        // newIssueActionType
      );

      // Refresh issues
      if (vin) {
        await handleFetchInspections(vin);
      }

      // Reset & close modal
      setNewIssueDescription('');
      setNewIssueActionType('');
      setAddIssueOpen(false);

    } catch (error) {
      alert('Failed to create inspection issue');
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleDeleteIssue = async (issueId: number, vinNumber: string) => {
    console.log("Delete clicked for issueId:", issueId, "vin:", vinNumber);

    try {
      await deleteIssueResolution(issueId);

      alert(`Issue #${issueId} deleted successfully`);

      // refresh list after delete
      const res = await fetchInspectionsByVin(vinNumber);
      setInspections(res.inspections);
      setIssuesData(res.issuesData);

    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("Failed to delete issue. Please try again.");
    }
  };


  if (isLoading) return <Loader />;

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
                <Button onClick={() => vin && handleFetchInspections(vin)} variant="primary">
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
                    const rawAudioLink =
                      selectedInspectionIssues.length > 0 &&
                        selectedInspectionIssues[0].inspectionResolutionComments &&
                        selectedInspectionIssues[0].inspectionResolutionComments.length > 0
                        ? selectedInspectionIssues[0].inspectionResolutionComments[0].voiceClipUrl
                        : null;

                    const audioLink = buildFileUrl(rawAudioLink);

                    return audioLink ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          Listen to Issue Recording
                        </p>

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
                          className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${statusFilter === 'all'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                            }`}
                        >
                          All ({statusCounts.total})
                        </button>
                        <button
                          onClick={() => setStatusFilter('open')}
                          className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${statusFilter === 'open'
                            ? 'bg-orange-100 text-orange-800 border border-orange-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                            }`}
                        >
                          Open ({statusCounts.open})
                        </button>
                        <button
                          onClick={() => setStatusFilter('closed')}
                          className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${statusFilter === 'closed'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                            }`}
                        >
                          Closed ({statusCounts.closed})
                        </button>
                      </div>
                    </div>

                    {/* Search Filter */}
                    <div className="flex items-center gap-3 flex-1">
                      {/* Search */}
                      <div className="relative flex-1 max-w-md">
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
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Add Issue Button */}
                      <button
                        onClick={() => setAddIssueOpen(true)}
                        className="px-4 py-2 text-sm font-medium border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition"
                      >
                        + Add Issue
                      </button>
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
                      <div key={issue.issueId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                            <span className="text-sm font-medium text-gray-900">#{issue.issueId}</span>
                            <span className={getStatusBadge(issue.status)}>
                              {issue.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <input
                              type="checkbox"
                              checked={isIssueResolved(issue.status) || selectedIssues.has(issue.issueId)}
                              onChange={() => handleCheckboxChange(issue.issueId)}
                              disabled={isIssueResolved(issue.status)}
                              className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${isIssueResolved(issue.status) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Delete Icon */}
                            <button
                              onClick={() => handleDeleteIssue(issue.issueId, vin!)}
                              className="text-red-500 hover:text-red-700 transition"
                              title="Delete Issue"
                              type="button"
                            >
                              <FiTrash2 size={18} />
                            </button>

                            {!isIssueResolved(issue.status) ? (

                              <Button
                                onClick={() => handleUpdateIssueStatus(issue.issueId)}
                                disabled={!selectedIssues.has(issue.issueId) || !issueComments[issue.issueId]?.trim() || updatingIssues.has(issue.issueId)}
                                variant={updateSuccess[issue.issueId] ? "secondary" : "primary"}
                                size="small"
                                className={`min-w-[80px] ${updateSuccess[issue.issueId]
                                  ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                  : ''
                                  }`}
                              >
                                {updatingIssues.has(issue.issueId) ? (
                                  <div className="flex items-center space-x-1">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                    <span>...</span>
                                  </div>
                                ) : updateSuccess[issue.issueId] ? (
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
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-700">Description:</h4>

                            {!isIssueResolved(issue.status) && editingIssueId !== issue.issueId && (
                              <button
                                onClick={() => handleEditClick(issue.issueId, issue.issueDescription || "")}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit description"
                                type="button"
                              >
                                <FiEdit size={16} />
                              </button>

                            )}
                          </div>

                          {editingIssueId === issue.issueId ? (
                            <div className="space-y-2">
                              <textarea
                                value={editedDescription || ''}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                rows={3}
                                className="w-full p-2 text-sm border border-gray-300 rounded-md"
                              />

                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1 text-sm border rounded-md"
                                >
                                  ✕
                                </button>

                                <button
                                  onClick={() => handleSaveEdit(issue.issueId)}
                                  className="px-3 py-1 text-sm border rounded-md"
                                >
                                  ✓
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-900">
                              {issue.issueDescription || '—'}
                            </p>
                          )}
                        </div>


                        {/* Meta Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Created by:</span>
                            <div className="text-gray-600">
                              {issue.createdByUser.firstName} {issue.createdByUser.lastName}
                              <span className="text-xs text-gray-400 ml-1">(ID: {issue.createdByUser.id})</span>
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
                              {issue.inspectionResolutionComments && issue.inspectionResolutionComments.length > 0 ? (
                                <div>
                                  {issue.inspectionResolutionComments
                                    .filter((comment) => comment.type === "RESOLUTION_COMMENT")
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
                                  {issue.inspectionResolutionComments.filter((comment) => comment.type === "RESOLUTION_COMMENT").length === 0 && (
                                    <div className="text-gray-500 italic">No resolution comments available</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-gray-500 italic">Issue resolved</div>
                              )}
                            </div>
                          ) : (
                            <textarea
                              value={issueComments[issue.issueId] || ''}
                              onChange={(e) => handleCommentChange(issue.issueId, e.target.value)}
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
            {addIssueOpen && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm bg-transparent">

                <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Add Inspection Issue
                  </h3>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={newIssueDescription}
                      onChange={(e) => setNewIssueDescription(e.target.value)}
                      rows={4}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                      placeholder="Describe the issue..."
                    />
                  </div>

                  {/* Action Type */}
                  {/* <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type (optional)
                    </label>
                    <input
                      value={newIssueActionType}
                      onChange={(e) => setNewIssueActionType(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded-md"
                      placeholder="MANUAL_ENTRY"
                    />
                  </div> */}

                  {/* Footer */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setAddIssueOpen(false)}
                      className="px-4 py-2 text-sm border rounded-md text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleCreateIssue}
                      disabled={creatingIssue}
                      className="px-4 py-2 text-sm border rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {creatingIssue ? 'Saving...' : 'Create Issue'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                  <InspectionCard
                    key={inspection.inspectionId}
                    inspection={inspection}
                    onInspectionClick={handleInspectionClick}
                    getStatusBadge={getStatusBadge}
                  />
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
