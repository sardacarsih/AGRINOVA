import { gql } from 'graphql-tag';

// Get pending approvals query
export const GET_PENDING_APPROVALS = gql`
  query GetPendingApprovals($filters: ApprovalFilters) {
    pendingApprovals(filters: $filters) {
      data {
        id
        type
        status
        priority
        title
        description
        submittedBy {
          id
          username
          name
          role
        }
        assignedTo {
          id
          username
          name
          role
        }
        metadata
        attachments {
          id
          filename
          url
          type
          size
        }
        deadline
        submittedAt
        updatedAt
        company {
          id
          name
        }
        estate {
          id
          name
          lokasi
        }
        division {
          id
          name
          code
        }
      }
      pagination {
        page
        limit
        total
        pages
      }
    }
  }
`;

// Get approval statistics query
export const GET_APPROVAL_STATISTICS = gql`
  query GetApprovalStatistics {
    approvalStatistics {
      total {
        pending
        approved
        rejected
        expired
      }
      byType {
        type
        pending
        approved
        rejected
        total
      }
      byPriority {
        priority
        count
        percentage
      }
      performance {
        averageResponseTime
        averageApprovalTime
        overdueCount
        todayProcessed
        weekProcessed
        monthProcessed
      }
      trends {
        date
        submitted
        approved
        rejected
        pending
      }
    }
  }
`;

// Get approval details query
export const GET_APPROVAL_DETAILS = gql`
  query GetApprovalDetails($id: ID!) {
    approval(id: $id) {
      id
      type
      status
      priority
      title
      description
      submittedBy {
        id
        username
        name
        role
        email
      }
      assignedTo {
        id
        username
        name
        role
        email
      }
      metadata
      attachments {
        id
        filename
        url
        type
        size
        uploadedAt
        uploadedBy {
          id
          username
          name
        }
      }
      history {
        id
        action
        status
        comment
        performedBy {
          id
          username
          name
          role
        }
        performedAt
      }
      comments {
        id
        comment
        createdBy {
          id
          username
          name
        }
        createdAt
        isInternal
      }
      deadline
      submittedAt
      processedAt
      updatedAt
      company {
        id
        name
      }
      estate {
        id
        name
        lokasi
      }
      division {
        id
        name
        code
      }
    }
  }
`;

// Process approval mutation
export const PROCESS_APPROVAL = gql`
  mutation ProcessApproval($action: ApprovalAction!) {
    processApproval(action: $action) {
      id
      status
      processedAt
      processedBy {
        id
        username
        name
      }
      comment
      nextApprover {
        id
        username
        name
        role
      }
    }
  }
`;

// Bulk process approvals mutation
export const BULK_PROCESS_APPROVALS = gql`
  mutation BulkProcessApprovals($action: BulkApprovalAction!) {
    bulkProcessApprovals(action: $action) {
      successful {
        id
        status
        message
      }
      failed {
        id
        error
        message
      }
      summary {
        totalRequests
        successful
        failed
      }
    }
  }
`;

// Create approval request mutation
export const CREATE_APPROVAL_REQUEST = gql`
  mutation CreateApprovalRequest($request: CreateApprovalRequest!) {
    createApprovalRequest(request: $request) {
      id
      type
      status
      priority
      title
      description
      submittedBy {
        id
        username
        name
      }
      assignedTo {
        id
        username
        name
        role
      }
      deadline
      submittedAt
    }
  }
`;

// Get approval history query
export const GET_APPROVAL_HISTORY = gql`
  query GetApprovalHistory($filters: ApprovalHistoryFilters) {
    approvalHistory(filters: $filters) {
      data {
        id
        type
        status
        title
        description
        submittedBy {
          id
          username
          name
        }
        processedBy {
          id
          username
          name
        }
        submittedAt
        processedAt
        processingTime
        company {
          id
          name
        }
        estate {
          id
          name
        }
      }
      pagination {
        page
        limit
        total
        pages
      }
    }
  }
`;

// Add approval comment mutation
export const ADD_APPROVAL_COMMENT = gql`
  mutation AddApprovalComment($approvalId: ID!, $comment: String!, $isInternal: Boolean = false) {
    addApprovalComment(approvalId: $approvalId, comment: $comment, isInternal: $isInternal) {
      id
      comment
      createdBy {
        id
        username
        name
      }
      createdAt
      isInternal
    }
  }
`;

// Delegate approval mutation
export const DELEGATE_APPROVAL = gql`
  mutation DelegateApproval($approvalId: ID!, $delegateToId: ID!, $reason: String) {
    delegateApproval(approvalId: $approvalId, delegateToId: $delegateToId, reason: $reason) {
      id
      assignedTo {
        id
        username
        name
        role
      }
      delegatedBy {
        id
        username
        name
      }
      delegationReason
      delegatedAt
    }
  }
`;

// Escalate approval mutation
export const ESCALATE_APPROVAL = gql`
  mutation EscalateApproval($approvalId: ID!, $reason: String!) {
    escalateApproval(approvalId: $approvalId, reason: $reason) {
      id
      priority
      assignedTo {
        id
        username
        name
        role
      }
      escalatedBy {
        id
        username
        name
      }
      escalationReason
      escalatedAt
    }
  }
`;

// Get approval workflow query
export const GET_APPROVAL_WORKFLOW = gql`
  query GetApprovalWorkflow($type: String!, $companyId: ID) {
    approvalWorkflow(type: $type, companyId: $companyId) {
      id
      type
      name
      description
      steps {
        id
        order
        name
        approverRole
        isParallel
        isOptional
        timeout
        escalationRules {
          afterHours
          escalateToRole
        }
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

// Update approval workflow mutation
export const UPDATE_APPROVAL_WORKFLOW = gql`
  mutation UpdateApprovalWorkflow($id: ID!, $workflow: ApprovalWorkflowInput!) {
    updateApprovalWorkflow(id: $id, workflow: $workflow) {
      id
      type
      name
      description
      steps {
        id
        order
        name
        approverRole
        isParallel
        isOptional
        timeout
        escalationRules {
          afterHours
          escalateToRole
        }
      }
      isActive
      updatedAt
    }
  }
`;

// Subscribe to approval updates
export const APPROVAL_UPDATES_SUBSCRIPTION = gql`
  subscription ApprovalUpdates($userId: ID) {
    approvalUpdates(userId: $userId) {
      id
      type
      status
      title
      assignedTo {
        id
        username
        name
      }
      updatedAt
      changeType
      previousStatus
    }
  }
`;

// Type definitions
export interface ApprovalFilters {
  search?: string;
  type?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToMe?: boolean;
  submittedByMe?: boolean;
  companyId?: string;
  estateId?: string;
  divisionId?: string;
  startDate?: string;
  endDate?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApprovalHistoryFilters {
  userId?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ApprovalAction {
  approvalId: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  comment?: string;
  attachments?: string[];
}

export interface BulkApprovalAction {
  approvalIds: string[];
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  comment?: string;
  reason?: string;
}

export interface CreateApprovalRequest {
  type: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  metadata?: Record<string, any>;
  attachments?: string[];
  deadline?: string;
  companyId?: string;
  estateId?: string;
  divisionId?: string;
}

export interface ApprovalWorkflowInput {
  name: string;
  description?: string;
  steps: Array<{
    order: number;
    name: string;
    approverRole: string;
    isParallel?: boolean;
    isOptional?: boolean;
    timeout?: number;
    escalationRules?: {
      afterHours: number;
      escalateToRole: string;
    };
  }>;
  isActive?: boolean;
}

export interface Approval {
  id: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  submittedBy: {
    id: string;
    username: string;
    name: string;
    role: string;
    email?: string;
  };
  assignedTo: {
    id: string;
    username: string;
    name: string;
    role: string;
    email?: string;
  };
  metadata: Record<string, any>;
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    type: string;
    size: number;
    uploadedAt?: string;
    uploadedBy?: {
      id: string;
      username: string;
      name: string;
    };
  }>;
  history?: Array<{
    id: string;
    action: string;
    status: string;
    comment?: string;
    performedBy: {
      id: string;
      username: string;
      name: string;
      role: string;
    };
    performedAt: string;
  }>;
  comments?: Array<{
    id: string;
    comment: string;
    createdBy: {
      id: string;
      username: string;
      name: string;
    };
    createdAt: string;
    isInternal: boolean;
  }>;
  deadline?: string;
  submittedAt: string;
  processedAt?: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
  };
  estate?: {
    id: string;
    name: string;
    lokasi: string;
  };
  division?: {
    id: string;
    name: string;
    code: string;
  };
}