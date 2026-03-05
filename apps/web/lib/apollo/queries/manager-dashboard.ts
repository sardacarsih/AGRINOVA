import { gql } from 'graphql-tag';

// =============================================================================
// MANAGER DASHBOARD QUERIES
// =============================================================================

export const GET_MANAGER_DASHBOARD = gql`
  query GetManagerDashboard {
    managerDashboard {
      user {
        id
        username
        name
        role
      }
      estates {
        id
        name
        code
      }
      stats {
        totalEstates
        totalDivisions
        totalBlocks
        totalEmployees
        todayProduction
        weeklyProduction
        monthlyProduction
        monthlyTarget
        targetAchievement
        pendingApprovals
        activeHarvests
      }
      actionItems {
        id
        type
        title
        description
        entityId
        priority
        dueAt
        createdAt
      }
      teamSummary {
        totalMandors
        activeMandorsToday
        totalAsistens
        topPerformers {
          userId
          name
          role
          assignment
          performanceScore
          recordsToday
          weeklyTrend
        }
        needsAttention {
          userId
          name
          role
          assignment
          performanceScore
          recordsToday
          weeklyTrend
        }
      }
      todayHighlights {
        totalHarvestsToday
        pendingApprovals
        approvedToday
        rejectedToday
        productionVsYesterday
        events {
          id
          type
          message
          entityType
          entityId
          severity
          occurredAt
        }
      }
    }
  }
`;

export const GET_MANAGER_DASHBOARD_STATS = gql`
  query GetManagerDashboardStats {
    managerDashboardStats {
      totalEstates
      totalDivisions
      totalBlocks
      totalEmployees
      todayProduction
      weeklyProduction
      monthlyProduction
      monthlyTarget
      targetAchievement
      pendingApprovals
      activeHarvests
    }
  }
`;

export const GET_MANAGER_ACTION_ITEMS = gql`
  query GetManagerActionItems($limit: Int) {
    managerActionItems(limit: $limit) {
      id
      type
      title
      description
      entityId
      priority
      dueAt
      createdAt
    }
  }
`;

export const GET_MANAGER_TEAM_SUMMARY = gql`
  query GetManagerTeamSummary {
    managerTeamSummary {
      totalMandors
      activeMandorsToday
      totalAsistens
      topPerformers {
        userId
        name
        role
        assignment
        performanceScore
        recordsToday
        weeklyTrend
      }
      needsAttention {
        userId
        name
        role
        assignment
        performanceScore
        recordsToday
        weeklyTrend
      }
    }
  }
`;

// =============================================================================
// TYPESCRIPT INTERFACES
// =============================================================================

export interface ManagerUser {
    id: string;
    username: string;
    name?: string | null;
    role: string;
}

export interface ManagerEstate {
    id: string;
    name: string;
    code?: string | null;
}

export interface ManagerDashboardStats {
    totalEstates: number;
    totalDivisions: number;
    totalBlocks: number;
    totalEmployees: number;
    todayProduction: number;
    weeklyProduction: number;
    monthlyProduction: number;
    monthlyTarget: number;
    targetAchievement: number;
    pendingApprovals: number;
    activeHarvests: number;
}

export type ManagerActionType =
    | 'VIEW_PENDING_APPROVALS'
    | 'REVIEW_HARVEST_REPORT'
    | 'CHECK_UNDERPERFORMING'
    | 'APPROVE_OVERTIME'
    | 'VIEW_ALERT';

export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ManagerActionItem {
    id: string;
    type: ManagerActionType;
    title: string;
    description?: string | null;
    entityId?: string | null;
    priority: ActionPriority;
    dueAt?: string | null;
    createdAt: string;
}

export interface TeamMemberPerformance {
    userId: string;
    name: string;
    role: string;
    assignment: string;
    performanceScore: number;
    recordsToday: number;
    weeklyTrend: number;
}

export interface ManagerTeamSummary {
    totalMandors: number;
    activeMandorsToday: number;
    totalAsistens: number;
    topPerformers: TeamMemberPerformance[];
    needsAttention: TeamMemberPerformance[];
}

export type EventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface ManagerEvent {
    id: string;
    type: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    severity: EventSeverity;
    occurredAt: string;
}

export interface ManagerTodayHighlights {
    totalHarvestsToday: number;
    pendingApprovals: number;
    approvedToday: number;
    rejectedToday: number;
    productionVsYesterday: number;
    events: ManagerEvent[];
}

export interface ManagerDashboardData {
    user: ManagerUser;
    estates: ManagerEstate[];
    stats: ManagerDashboardStats;
    actionItems: ManagerActionItem[];
    teamSummary: ManagerTeamSummary;
    todayHighlights: ManagerTodayHighlights;
}

export interface GetManagerDashboardResponse {
    managerDashboard: ManagerDashboardData;
}

export interface GetManagerDashboardStatsResponse {
    managerDashboardStats: ManagerDashboardStats;
}

export interface GetManagerActionItemsResponse {
    managerActionItems: ManagerActionItem[];
}

export interface GetManagerTeamSummaryResponse {
    managerTeamSummary: ManagerTeamSummary;
}
