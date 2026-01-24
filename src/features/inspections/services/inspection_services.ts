import apiService from '../../../services/data/api_service_class';
import { ApiEndpoints } from '../../../services/data/apis';
import type { ApiResponse } from '../../../interfaces/api';

// Define interfaces
export interface InspectionResolutionComment {
  voiceClipUrl: string;
  comment: string;
  type: string;
}

export interface InspectionIssue {
  issueId: number;
  status: string;
  issueDescription: string;
  createdAt: string;
  inspectionId: number;
  inspectionResolutionComments?: InspectionResolutionComment[];
  createdByUser: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface InspectionData {
  vin: string;
  issues: InspectionIssue[];
}

export interface InspectionSummary {
  inspectionId: string;
  vin: string;
  issueCount: number;
  openIssuesCount: number;
  closedIssuesCount: number;
  createdAt: string;
  lastUpdated: string;
  status: string;
}

export interface StatusCounts {
  total: number;
  open: number;
  closed: number;
}

export type InspectionIssuesResponse = InspectionData[];

// Helper functions
export const isIssueResolved = (status: string): boolean => {
  const resolvedStatuses = ['COMPLETED', 'APPROVED', 'CLOSED'];
  return resolvedStatuses.includes(status.toUpperCase());
};

export const getStatusBadge = (status: string): string => {
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

// Data processing functions
export const processApiResponse = (response: unknown): InspectionIssuesResponse | null => {
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
  
  return issuesData;
};

export const groupIssuesByInspection = (issues: InspectionIssue[]): Record<string, InspectionIssue[]> => {
  // Group issues by inspectionId
  return issues.reduce((groups: Record<string, InspectionIssue[]>, issue) => {
    const inspectionId = String(issue.inspectionId || 'unknown');
    if (!groups[inspectionId]) {
      groups[inspectionId] = [];
    }
    groups[inspectionId].push(issue);
    return groups;
  }, {});
};

export const createInspectionSummaries = (inspectionGroups: Record<string, InspectionIssue[]>, vinNumber: string): InspectionSummary[] => {
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
  return inspectionSummaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const filterInspections = (inspections: InspectionSummary[], searchTerm: string): InspectionSummary[] => {
  if (!searchTerm.trim()) return inspections;
  
  const searchLower = searchTerm.toLowerCase();
  return inspections.filter(inspection => 
    inspection.inspectionId.toLowerCase().includes(searchLower)
  );
};

export const getSelectedInspectionIssues = (
  issuesData: InspectionIssue[] | null, 
  selectedInspectionId: string | null
): InspectionIssue[] => {
  if (!selectedInspectionId || !issuesData) return [];
  
  return issuesData.filter(issue => 
    String(issue.inspectionId) === selectedInspectionId
  );
};

export const filterIssues = (
  issues: InspectionIssue[], 
  statusFilter: 'all' | 'open' | 'closed', 
  searchTerm: string
): InspectionIssue[] => {
  if (!issues.length) return [];
  
  let filtered = issues;
  
  // Filter by status
  if (statusFilter === 'open') {
    filtered = filtered.filter(issue => !isIssueResolved(issue.status));
  } else if (statusFilter === 'closed') {
    filtered = filtered.filter(issue => isIssueResolved(issue.status));
  }
  
  // Filter by search term
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(issue => 
      issue.issueDescription.toLowerCase().includes(searchLower) ||
      issue.issueId.toString().includes(searchLower)
    );
  }
  
  return filtered;
};

export const getStatusCounts = (issues: InspectionIssue[]): StatusCounts => {
  if (!issues.length) {
    return { total: 0, open: 0, closed: 0 };
  }
  
  const total = issues.length;
  const closed = issues.filter(issue => isIssueResolved(issue.status)).length;
  const open = total - closed;
  
  return { total, open, closed };
};

// API service functions
export const fetchInspectionsByVin = async (vinNumber: string): Promise<{
  inspections: InspectionSummary[];
  issuesData: InspectionIssue[];
}> => {
  try {
    // Use the inspection details endpoint to get all issues for this VIN
    const url = `${ApiEndpoints.INSPECTION_DETAILS}${vinNumber}`;
    const response = await apiService.get<InspectionIssuesResponse>(url);

    // Process the API response
    const inspectionData = processApiResponse(response);
    
    if (Array.isArray(inspectionData)) {
      // Find the data for the specific VIN
      const vinData = inspectionData.find(data => data.vin === vinNumber);
      
      if (vinData && vinData.issues) {
        // Group issues by inspection
        const inspectionGroups = groupIssuesByInspection(vinData.issues);
        
        // Create inspection summaries
        const inspections = createInspectionSummaries(inspectionGroups, vinNumber);
        
        return { inspections, issuesData: vinData.issues };
      } else {
        return { inspections: [], issuesData: [] };
      }
    } else {
      return { inspections: [], issuesData: [] };
    }
  } catch (error) {
    throw new Error(`Failed to fetch inspections: ${error}`);
  }
};

export const updateIssueStatus = async (issueId: number, comment: string): Promise<void> => {
  try {
    const url = `${ApiEndpoints.UPDATE_ISSUE_STATUS}${issueId}`;
    const payload = {
      status: "closed",
      comments: comment.trim()
    };

    await apiService.patch(url, payload);
  } catch (error) {
    throw new Error(`Failed to update issue status: ${error}`);
  }
};

export const updateIssue = async (
  issueId: number,
  data: {
    status?: 'open' | 'closed';
    comments?: string;
    issueDescription?: string;
  }
): Promise<void> => {
  try {
    const url = `${ApiEndpoints.UPDATE_ISSUE_STATUS}${issueId}`;

    // Build payload dynamically (ONLY include passed fields)
    const payload: Record<string, any> = {};

    if (data.status) {
      payload.status = data.status;
    }

    if (data.comments?.trim()) {
      payload.comments = data.comments.trim();
    }

    if (data.issueDescription?.trim()) {
      payload.issueDescription = data.issueDescription.trim();
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('No valid fields provided to update');
    }

    await apiService.patch(url, payload);
  } catch (error) {
    throw new Error(`Failed to update issue: ${error}`);
  }
};

// inspection_services.ts
export const createIssueResolution = async (
  inspectionIssueId: number,
  description: string,
  actionType?: string
): Promise<void> => {
  try {
    const payload = {
      inspectionIssueId,
      description: description.trim(),
      action_type: actionType ?? '',

      //  Optional fields – enable when needed
      // attachment_urls: [],       // string[]
      // voice_clip_url: '',        // string
    };

    await apiService.post('/resolution/create', payload);
  } catch (error) {
    throw new Error(`Failed to create issue resolution: ${error}`);
  }
};

export const deleteIssueResolution = async (issueId: number): Promise<void> => {
  try {
    const url = `${ApiEndpoints.DELETE_RESOLUTION_ISSUE}${issueId}`;
    await apiService.delete(url);
  } catch (error) {
    throw new Error(`Failed to delete issue: ${error}`);
  }
};



