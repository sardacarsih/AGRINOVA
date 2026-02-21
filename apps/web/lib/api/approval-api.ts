import cookieApiClient from './cookie-client';
import { User } from '@/types/auth';

// Approval types and interfaces
export interface PendingApproval {
  id: string;
  type: 'user_registration' | 'role_change' | 'multi_assignment' | 'permission_change' | 'user_update';
  requesterId?: string;
  requesterName: string;
  requestedRole?: string;
  currentRole?: string;
  company?: string;
  companyId?: string;
  estate?: string;
  requestedAssignment?: string;
  currentCompanies?: string;
  requestedCompanies?: string;
  requestedPermissions?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  description: string;
  metadata?: {
    userId?: string;
    targetUserId?: string;
    requestData?: any;
    originalData?: any;
    changes?: Record<string, { old: any; new: any }>;
    reason?: string;
  };
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface ApprovalFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  priority?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ApprovalStatistics {
  totalPending: number;
  highPriority: number;
  thisWeek: number;
  avgResponseTime: string;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
  responseTimeHours: number;
}

export interface ApprovalAction {
  approvalId: string;
  action: 'approve' | 'reject';
  notes?: string;
  reason?: string;
}

export interface BulkApprovalAction {
  approvalIds: string[];
  action: 'approve' | 'reject';
  notes?: string;
  reason?: string;
}

export interface ApprovalsResponse {
  data: PendingApproval[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class ApprovalAPI {
  private static eventListeners: Map<string, (data: any) => void> = new Map();

  /**
   * Subscribe to real-time approval updates
   */
  static subscribeToUpdates(callback: (data: { type: 'approval_created' | 'approval_processed' | 'approval_updated'; approval: PendingApproval }) => void): () => void {
    const id = `approval_updates_${Date.now()}_${Math.random()}`;
    this.eventListeners.set(id, callback);

    // Simulate periodic updates in development
    const interval = setInterval(() => {
      // Simulate random approval updates for demo purposes
      if (Math.random() > 0.95) { // 5% chance every 5 seconds
        const mockUpdate = {
          type: 'approval_created' as const,
          approval: {
            id: `realtime_${Date.now()}`,
            type: 'user_registration' as const,
            requesterName: 'Real-time User',
            requestedRole: 'Manager',
            company: 'PT Real-time Company',
            submittedAt: new Date().toISOString(),
            status: 'pending' as const,
            priority: 'medium' as const,
            description: 'Real-time approval notification'
          }
        };
        callback(mockUpdate);
      }
    }, 5000);

    // Return cleanup function
    return () => {
      this.eventListeners.delete(id);
      clearInterval(interval);
    };
  }

  /**
   * Emit approval update to all subscribers
   */
  private static emitUpdate(data: { type: 'approval_created' | 'approval_processed' | 'approval_updated'; approval: PendingApproval }) {
    this.eventListeners.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in approval update callback:', error);
      }
    });
  }
  /**
   * Get pending approvals with filtering
   */
  static async getPendingApprovals(filters: ApprovalFilters = {}): Promise<ApprovalsResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.dateRange) {
      params.append('from', filters.dateRange.from.toISOString());
      params.append('to', filters.dateRange.to.toISOString());
    }

    try {
      const response = await cookieApiClient.get<ApprovalsResponse>(`/approvals/pending?${params.toString()}`);
      return (response.data || response) as ApprovalsResponse;
    } catch (error) {
      console.warn('Approval API not available, using fallback data');
      
      // Fallback: Generate mock approvals data
      const mockApprovals: PendingApproval[] = [
        {
          id: '1',
          type: 'user_registration',
          requesterName: 'John Doe',
          requestedRole: 'Manager',
          company: 'PT Kelapa Sawit Kencana',
          estate: 'Estate Sawit Jaya',
          submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          priority: 'high',
          description: 'New manager registration for Estate Sawit Jaya',
          metadata: {
            requestData: {
              username: 'john.doe',
              email: 'john.doe@ksk.com',
              fullName: 'John Doe',
              role: 'manager',
              estateId: 'estate_001'
            }
          }
        },
        {
          id: '2',
          type: 'role_change',
          requesterName: 'Jane Smith',
          currentRole: 'Asisten',
          requestedRole: 'Manager',
          company: 'PT Flores Sawit Lestari',
          submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          priority: 'medium',
          description: 'Role elevation from Asisten to Manager',
          metadata: {
            userId: 'user_456',
            targetUserId: 'user_456',
            changes: {
              role: { old: 'asisten', new: 'manager' }
            }
          }
        },
        {
          id: '3',
          type: 'multi_assignment',
          requesterName: 'Area Manager Atong',
          requestedAssignment: '2 additional companies',
          currentCompanies: 'KSK, FSL',
          requestedCompanies: 'KSK, FSL, MSL',
          submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          priority: 'medium',
          description: 'Multi-assignment request for PT Mitra Sawit Lestari',
          metadata: {
            userId: 'user_789',
            requestData: {
              assignedCompanies: ['ksk_001', 'fsl_001', 'msl_001']
            },
            originalData: {
              assignedCompanies: ['ksk_001', 'fsl_001']
            }
          }
        },
        {
          id: '4',
          type: 'permission_change',
          requesterName: 'Company Admin - FSL',
          requestedPermissions: 'ESTATE_CREATE, DIVISION_MANAGE',
          company: 'PT Flores Sawit Lestari',
          submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          priority: 'low',
          description: 'Additional permissions for estate management',
          metadata: {
            userId: 'user_101',
            requestData: {
              permissions: ['ESTATE_CREATE', 'DIVISION_MANAGE', 'USER_READ', 'USER_UPDATE']
            },
            originalData: {
              permissions: ['USER_READ', 'USER_UPDATE']
            }
          }
        }
      ];

      // Apply client-side filtering
      let filteredApprovals = mockApprovals;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredApprovals = filteredApprovals.filter(approval => 
          approval.requesterName.toLowerCase().includes(searchLower) ||
          approval.description.toLowerCase().includes(searchLower) ||
          (approval.company && approval.company.toLowerCase().includes(searchLower))
        );
      }
      
      if (filters.type && filters.type !== 'all') {
        filteredApprovals = filteredApprovals.filter(approval => approval.type === filters.type);
      }
      
      if (filters.priority && filters.priority !== 'all') {
        filteredApprovals = filteredApprovals.filter(approval => approval.priority === filters.priority);
      }

      if (filters.status && filters.status !== 'all') {
        filteredApprovals = filteredApprovals.filter(approval => approval.status === filters.status);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const total = filteredApprovals.length;
      const pages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return {
        data: filteredApprovals.slice(startIndex, endIndex),
        pagination: { page, limit, total, pages }
      };
    }
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStatistics(): Promise<ApprovalStatistics> {
    try {
      const response = await cookieApiClient.get<ApprovalStatistics>('/approvals/statistics');
      return (response.data || response) as ApprovalStatistics;
    } catch (error) {
      console.warn('Approval statistics API not available, using fallback data');
      
      // Fallback: Generate mock statistics
      return {
        totalPending: 4,
        highPriority: 1,
        thisWeek: 3,
        avgResponseTime: '2.5h',
        totalApproved: 156,
        totalRejected: 12,
        approvalRate: 92.8,
        responseTimeHours: 2.5
      };
    }
  }

  /**
   * Get approval by ID
   */
  static async getApproval(id: string): Promise<PendingApproval> {
    try {
      const response = await cookieApiClient.get<PendingApproval>(`/approvals/${id}`);
      return (response.data || response) as PendingApproval;
    } catch (error) {
      // Fallback: Find from mock data
      const mockApprovals = await this.getPendingApprovals();
      const approval = mockApprovals.data.find(a => a.id === id);
      if (!approval) {
        throw new Error('Approval not found');
      }
      return approval;
    }
  }

  /**
   * Approve or reject an approval request
   */
  static async processApproval(action: ApprovalAction): Promise<{
    success: boolean;
    message: string;
    approval: PendingApproval;
  }> {
    try {
      type ProcessApprovalResponse = { success: boolean; message: string; approval: PendingApproval };
      const response = await cookieApiClient.post<ProcessApprovalResponse>('/approvals/process', action);
      return (response.data || response) as ProcessApprovalResponse;
    } catch (error) {
      console.warn('Approval processing API not available, simulating action');
      
      // Fallback: Simulate approval processing
      const approval = await this.getApproval(action.approvalId);
      const updatedApproval: PendingApproval = {
        ...approval,
        status: action.action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: 'current_super_admin',
        reviewedAt: new Date().toISOString(),
        reviewNotes: action.notes || action.reason || ''
      };

      // Emit real-time update
      this.emitUpdate({
        type: 'approval_processed',
        approval: updatedApproval
      });

      return {
        success: true,
        message: `Request ${action.action === 'approve' ? 'approved' : 'rejected'} successfully`,
        approval: updatedApproval
      };
    }
  }

  /**
   * Process multiple approvals at once
   */
  static async processBulkApprovals(action: BulkApprovalAction): Promise<{
    success: boolean;
    message: string;
    processed: number;
    failed: number;
    results: Array<{ id: string; success: boolean; message: string }>;
  }> {
    try {
      type BulkProcessResponse = { success: boolean; message: string; processed: number; failed: number; results: Array<{ id: string; success: boolean; message: string }> };
      const response = await cookieApiClient.post<BulkProcessResponse>('/approvals/bulk-process', action);
      return (response.data || response) as BulkProcessResponse;
    } catch (error) {
      console.warn('Bulk approval processing API not available, simulating action');
      
      // Fallback: Simulate bulk processing
      const results = await Promise.all(
        action.approvalIds.map(async (id) => {
          try {
            await this.processApproval({
              approvalId: id,
              action: action.action,
              notes: action.notes,
              reason: action.reason
            });
            return { id, success: true, message: 'Processed successfully' };
          } catch (error) {
            return { id, success: false, message: 'Processing failed' };
          }
        })
      );

      const processed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        success: true,
        message: `Bulk processing completed: ${processed} processed, ${failed} failed`,
        processed,
        failed,
        results
      };
    }
  }

  /**
   * Create a new approval request
   */
  static async createApprovalRequest(request: {
    type: PendingApproval['type'];
    description: string;
    priority: PendingApproval['priority'];
    metadata: any;
    requestedRole?: string;
    targetUserId?: string;
  }): Promise<PendingApproval> {
    try {
      const response = await cookieApiClient.post<PendingApproval>('/approvals', request);
      return (response.data || response) as PendingApproval;
    } catch (error) {
      console.warn('Create approval API not available, simulating creation');
      
      // Fallback: Simulate creation
      const newApproval: PendingApproval = {
        id: `approval_${Date.now()}`,
        type: request.type,
        requesterName: 'Current User',
        requestedRole: request.requestedRole,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        priority: request.priority,
        description: request.description,
        metadata: request.metadata
      };

      return newApproval;
    }
  }

  /**
   * Get approval history
   */
  static async getApprovalHistory(
    page = 1,
    limit = 20,
    filters?: {
      status?: 'approved' | 'rejected';
      type?: string;
      dateRange?: { from: Date; to: Date };
    }
  ): Promise<{
    data: PendingApproval[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters?.dateRange) {
      params.append('from', filters.dateRange.from.toISOString());
      params.append('to', filters.dateRange.to.toISOString());
    }

    try {
      type HistoryResponse = { data: PendingApproval[]; pagination: { page: number; limit: number; total: number; pages: number } };
      const response = await cookieApiClient.get<HistoryResponse>(`/approvals/history?${params.toString()}`);
      return (response.data || response) as HistoryResponse;
    } catch (error) {
      console.warn('Approval history API not available, using fallback data');
      
      // Fallback: Generate mock history
      const mockHistory: PendingApproval[] = [
        {
          id: 'hist_1',
          type: 'user_registration',
          requesterName: 'Alice Johnson',
          requestedRole: 'Asisten',
          company: 'PT Mitra Sawit Lestari',
          submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'approved',
          priority: 'medium',
          description: 'New assistant registration',
          reviewedBy: 'super_admin_001',
          reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          reviewNotes: 'Approved - meets requirements'
        },
        {
          id: 'hist_2',
          type: 'role_change',
          requesterName: 'Bob Wilson',
          currentRole: 'Mandor',
          requestedRole: 'Asisten',
          company: 'PT Kelapa Sawit Kencana',
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'rejected',
          priority: 'low',
          description: 'Role change request',
          reviewedBy: 'super_admin_001',
          reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
          reviewNotes: 'Rejected - insufficient experience'
        }
      ];

      return {
        data: mockHistory,
        pagination: { page: 1, limit: 20, total: mockHistory.length, pages: 1 }
      };
    }
  }
}