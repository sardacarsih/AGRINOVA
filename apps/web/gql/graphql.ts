import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * JSON scalar type for handling arbitrary JSON data.
   * Used for metadata and configuration fields.
   */
  JSON: { input: any; output: any; }
  /**
   * Time scalar type for handling timestamps in RFC3339 format.
   * Used for all date/time fields across the system.
   */
  Time: { input: Date; output: Date; }
  /** UUID scalar type for handling UUIDs. */
  UUID: { input: any; output: any; }
};

/**
 * APIKey represents an external application's access credentials.
 * Used for HRIS integration, Smart Mill Scale, and other system integrations.
 */
export type ApiKey = {
  __typename?: 'APIKey';
  /** When the API key was created */
  createdAt: Scalars['Time']['output'];
  /** User who created this API key */
  createdBy: User;
  /** Expiration timestamp (null for no expiration) */
  expiresAt?: Maybe<Scalars['Time']['output']>;
  /** Unique identifier for the API key */
  id: Scalars['ID']['output'];
  /** Last time this key was used for authentication */
  lastUsedAt?: Maybe<Scalars['Time']['output']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['output'];
  /** Key prefix (e.g., 'ak_live_') */
  prefix: Scalars['String']['output'];
  /** When the key was revoked (null if still active) */
  revokedAt?: Maybe<Scalars['Time']['output']>;
  /** User who revoked this key (null if still active) */
  revokedBy?: Maybe<User>;
  /** Array of granted permissions/scopes */
  scopes: Array<Scalars['String']['output']>;
  /** Current status of the API key */
  status: ApiKeyStatus;
};

/** APIKeyLog represents an audit log entry for API key operations. */
export type ApiKeyLog = {
  __typename?: 'APIKeyLog';
  /** Action performed (CREATE, ROTATE, REVOKE, AUTH_FAILURE) */
  action: Scalars['String']['output'];
  /** The API key this log entry relates to */
  apiKeyId: Scalars['String']['output'];
  /** When this log entry was created */
  createdAt: Scalars['Time']['output'];
  /** Additional details about the action (JSON format) */
  details?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the log entry */
  id: Scalars['ID']['output'];
  /** IP address from which the action was performed */
  ipAddress?: Maybe<Scalars['String']['output']>;
  /** User who performed the action (null for system actions) */
  performedBy?: Maybe<User>;
  /** User agent string of the client */
  userAgent?: Maybe<Scalars['String']['output']>;
};

/**
 * APIKeyReveal represents the response when creating a new API key.
 * Contains the full plaintext key (shown only once).
 */
export type ApiKeyReveal = {
  __typename?: 'APIKeyReveal';
  /** The newly created API key */
  apiKey: ApiKey;
  /** Plaintext API key (shown only during creation) */
  plaintextKey: Scalars['String']['output'];
};

/** APIKeyStats provides statistics about API key usage and management. */
export type ApiKeyStats = {
  __typename?: 'APIKeyStats';
  /** Number of currently active API keys */
  activeKeys: Scalars['Int']['output'];
  /** Number of API keys created in the last 30 days */
  createdLast30Days: Scalars['Int']['output'];
  /** Number of expired API keys */
  expiredKeys: Scalars['Int']['output'];
  /** Number of API keys expiring in the next 30 days */
  expiringNext30Days: Scalars['Int']['output'];
  /** Most recently created API key */
  mostRecentKey?: Maybe<ApiKey>;
  /** Most used API key (by last used timestamp) */
  mostUsedKey?: Maybe<ApiKey>;
  /** Number of revoked API keys */
  revokedKeys: Scalars['Int']['output'];
  /** Total number of API keys in the system */
  totalKeys: Scalars['Int']['output'];
};

/** APIKeyStatus represents the current status of an API key. */
export enum ApiKeyStatus {
  /** Key is active and can be used for authentication */
  Active = 'ACTIVE',
  /** Key has expired and cannot be used */
  Expired = 'EXPIRED',
  /** Key has been revoked and cannot be used */
  Revoked = 'REVOKED'
}

/** APIKeysResponse represents the response from API keys queries. */
export type ApiKeysResponse = {
  __typename?: 'APIKeysResponse';
  /** List of API keys */
  apiKeys: Array<ApiKey>;
  /** Whether there are more keys to fetch */
  hasNextPage: Scalars['Boolean']['output'];
  /** Pagination information */
  pageInfo: PageInfo;
  /** Total number of API keys */
  totalCount: Scalars['Int']['output'];
};

/** ActionItemStatus enum. */
export enum ActionItemStatus {
  Completed = 'COMPLETED',
  Deferred = 'DEFERRED',
  InProgress = 'IN_PROGRESS',
  Pending = 'PENDING'
}

/** ActionPriority enum for action priority levels. */
export enum ActionPriority {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
  Urgent = 'URGENT'
}

/** ActivityTimelineItem represents an activity in timeline. */
export type ActivityTimelineItem = {
  __typename?: 'ActivityTimelineItem';
  /** Actor name */
  actorName: Scalars['String']['output'];
  /** Description */
  description: Scalars['String']['output'];
  /** Related entity ID */
  entityId?: Maybe<Scalars['String']['output']>;
  /** Related entity type */
  entityType?: Maybe<Scalars['String']['output']>;
  /** Item ID */
  id: Scalars['ID']['output'];
  /** Timestamp */
  timestamp: Scalars['Time']['output'];
  /** Title */
  title: Scalars['String']['output'];
  /** Activity type */
  type: ActivityType;
};

/** ActivityType enum. */
export enum ActivityType {
  /** Block completed */
  BlockCompleted = 'BLOCK_COMPLETED',
  /** Block started */
  BlockStarted = 'BLOCK_STARTED',
  /** Harvest approved */
  HarvestApproved = 'HARVEST_APPROVED',
  /** Harvest rejected */
  HarvestRejected = 'HARVEST_REJECTED',
  /** Harvest submitted */
  HarvestSubmitted = 'HARVEST_SUBMITTED',
  /** Mandor ended shift */
  MandorEnded = 'MANDOR_ENDED',
  /** Mandor started shift */
  MandorStarted = 'MANDOR_STARTED'
}

/** ActorType enum. */
export enum ActorType {
  /** API client */
  ApiClient = 'API_CLIENT',
  /** Scheduled job */
  ScheduledJob = 'SCHEDULED_JOB',
  /** Super admin user */
  SuperAdmin = 'SUPER_ADMIN',
  /** System process */
  System = 'SYSTEM'
}

/** AdminActivityLog for activity logging. */
export type AdminActivityLog = {
  __typename?: 'AdminActivityLog';
  /** Actor user ID */
  actorId: Scalars['String']['output'];
  /** Actor name */
  actorName: Scalars['String']['output'];
  /** Description */
  description: Scalars['String']['output'];
  /** Entity ID */
  entityId?: Maybe<Scalars['String']['output']>;
  /** Entity type */
  entityType?: Maybe<Scalars['String']['output']>;
  /** Log ID */
  id: Scalars['ID']['output'];
  /** IP address */
  ipAddress?: Maybe<Scalars['String']['output']>;
  /** Timestamp */
  timestamp: Scalars['Time']['output'];
  /** Activity type */
  type: AdminActivityType;
};

/** AdminActivityType enum. */
export enum AdminActivityType {
  /** Division created */
  DivisionCreated = 'DIVISION_CREATED',
  /** Estate created */
  EstateCreated = 'ESTATE_CREATED',
  /** Login attempt */
  LoginAttempt = 'LOGIN_ATTEMPT',
  /** Password reset */
  PasswordReset = 'PASSWORD_RESET',
  /** Role changed */
  RoleChanged = 'ROLE_CHANGED',
  /** Settings changed */
  SettingsChanged = 'SETTINGS_CHANGED',
  /** User activated */
  UserActivated = 'USER_ACTIVATED',
  /** User created */
  UserCreated = 'USER_CREATED',
  /** User deactivated */
  UserDeactivated = 'USER_DEACTIVATED',
  /** User deleted */
  UserDeleted = 'USER_DELETED',
  /** User updated */
  UserUpdated = 'USER_UPDATED'
}

/** AlertSeverity enum. */
export enum AlertSeverity {
  Critical = 'CRITICAL',
  Info = 'INFO',
  Warning = 'WARNING'
}

/** AlertThresholds for alert configuration. */
export type AlertThresholds = {
  __typename?: 'AlertThresholds';
  /** Pending approval hours */
  pendingApprovalHours: Scalars['Int']['output'];
  /** Production below target percentage */
  productionBelowTarget: Scalars['Float']['output'];
  /** Quality below threshold */
  qualityBelowThreshold: Scalars['Float']['output'];
};

/** AnalyticsPeriod enum for time period selection. */
export enum AnalyticsPeriod {
  Daily = 'DAILY',
  Monthly = 'MONTHLY',
  Quarterly = 'QUARTERLY',
  Weekly = 'WEEKLY',
  Yearly = 'YEARLY'
}

/** ApiSettings for API configuration. */
export type ApiSettings = {
  __typename?: 'ApiSettings';
  /** API keys enabled */
  apiKeysEnabled: Scalars['Boolean']['output'];
  /** CORS enabled */
  corsEnabled: Scalars['Boolean']['output'];
  /** Default rate limit */
  defaultRateLimit: Scalars['Int']['output'];
  /** Rate limit enabled */
  rateLimitEnabled: Scalars['Boolean']['output'];
  /** Version */
  version: Scalars['String']['output'];
  /** Webhook enabled */
  webhookEnabled: Scalars['Boolean']['output'];
};

/** ApprovalFilterInput for filtering approvals. */
export type ApprovalFilterInput = {
  /** Filter by block */
  blockId?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by date range start */
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  /** Filter by date range end */
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  /** Filter by division */
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by mandor */
  mandorId?: InputMaybe<Scalars['ID']['input']>;
  /** Page number */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Page size */
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  /** Filter by priority */
  priority?: InputMaybe<ApprovalPriority>;
  /** Search query */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Sort by field */
  sortBy?: InputMaybe<ApprovalSortField>;
  /** Sort direction */
  sortDirection?: InputMaybe<SortDirection>;
  /** Filter by status */
  status?: InputMaybe<HarvestStatus>;
};

/** ApprovalItem represents a harvest record pending approval. */
export type ApprovalItem = {
  __typename?: 'ApprovalItem';
  /** Block information */
  block: Block;
  /** GPS coordinates */
  coordinates?: Maybe<Coordinates>;
  /** Division information */
  division: Division;
  /** Time elapsed since submission */
  elapsedTime: Scalars['String']['output'];
  /** Number of employees */
  employeeCount: Scalars['Int']['output'];
  /** Employee names/IDs */
  employees: Scalars['String']['output'];
  /** Harvest date */
  harvestDate: Scalars['Time']['output'];
  /** Has photo */
  hasPhoto: Scalars['Boolean']['output'];
  /** Harvest record ID */
  id: Scalars['ID']['output'];
  /** Mandor who submitted */
  mandor: User;
  /** Notes from mandor */
  notes?: Maybe<Scalars['String']['output']>;
  /** Photo URLs */
  photoUrls?: Maybe<Array<Scalars['String']['output']>>;
  /** Priority level */
  priority: ApprovalPriority;
  /** Status */
  status: HarvestStatus;
  /** Submitted time */
  submittedAt: Scalars['Time']['output'];
  /** Total TBS count */
  tbsCount: Scalars['Int']['output'];
  /** Validation issues */
  validationIssues?: Maybe<Array<Scalars['String']['output']>>;
  /** Validation status */
  validationStatus: ValidationStatus;
  /** Total weight (kg) */
  weight: Scalars['Float']['output'];
};

/** ApprovalListResponse represents paginated approval list. */
export type ApprovalListResponse = {
  __typename?: 'ApprovalListResponse';
  /** Has more pages */
  hasMore: Scalars['Boolean']['output'];
  /** Approval items */
  items: Array<ApprovalItem>;
  /** Page info */
  pageInfo: ApprovalPageInfo;
  /** Total count */
  totalCount: Scalars['Int']['output'];
};

/** ApprovalPageInfo for pagination. */
export type ApprovalPageInfo = {
  __typename?: 'ApprovalPageInfo';
  /** Current page */
  currentPage: Scalars['Int']['output'];
  /** Page size */
  pageSize: Scalars['Int']['output'];
  /** Total pages */
  totalPages: Scalars['Int']['output'];
};

/** ApprovalPriority enum. */
export enum ApprovalPriority {
  /** High priority (waiting > 2 hours) */
  High = 'HIGH',
  /** Normal priority */
  Normal = 'NORMAL',
  /** Urgent (waiting > 4 hours) */
  Urgent = 'URGENT'
}

/** ApprovalSortField enum. */
export enum ApprovalSortField {
  BlockName = 'BLOCK_NAME',
  HarvestDate = 'HARVEST_DATE',
  MandorName = 'MANDOR_NAME',
  Priority = 'PRIORITY',
  SubmittedAt = 'SUBMITTED_AT',
  TbsCount = 'TBS_COUNT',
  Weight = 'WEIGHT'
}

/** ApprovalStatsData represents approval statistics. */
export type ApprovalStatsData = {
  __typename?: 'ApprovalStatsData';
  /** Approval rate percentage */
  approvalRate: Scalars['Float']['output'];
  /** Average approval time (minutes) */
  avgApprovalTime: Scalars['Float']['output'];
  /** Stats by day */
  dailyStats: Array<DailyApprovalStats>;
  /** Fastest approval (minutes) */
  fastestApproval: Scalars['Float']['output'];
  /** Slowest approval (minutes) */
  slowestApproval: Scalars['Float']['output'];
  /** Total approved */
  totalApproved: Scalars['Int']['output'];
  /** Total rejected */
  totalRejected: Scalars['Int']['output'];
  /** Total submissions */
  totalSubmissions: Scalars['Int']['output'];
};

export type ApproveHarvestInput = {
  approvedBy: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};

/** ApproveHarvestResult represents result of approval action. */
export type ApproveHarvestResult = {
  __typename?: 'ApproveHarvestResult';
  /** Errors if any */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Updated harvest record */
  harvestRecord?: Maybe<HarvestRecord>;
  /** Message */
  message: Scalars['String']['output'];
  /** Success status */
  success: Scalars['Boolean']['output'];
};

/** AreaManagerActionItem for action items. */
export type AreaManagerActionItem = {
  __typename?: 'AreaManagerActionItem';
  /** Company ID */
  companyId?: Maybe<Scalars['String']['output']>;
  /** Description */
  description?: Maybe<Scalars['String']['output']>;
  /** Due date */
  dueDate?: Maybe<Scalars['Time']['output']>;
  /** Item ID */
  id: Scalars['ID']['output'];
  /** Priority */
  priority: ActionPriority;
  /** Status */
  status: ActionItemStatus;
  /** Title */
  title: Scalars['String']['output'];
  /** Type */
  type: AreaManagerActionType;
};

/** AreaManagerActionType enum. */
export enum AreaManagerActionType {
  /** Address compliance issue */
  AddressCompliance = 'ADDRESS_COMPLIANCE',
  /** Approve manager request */
  ApproveRequest = 'APPROVE_REQUEST',
  /** Review budget */
  ReviewBudget = 'REVIEW_BUDGET',
  /** Review company report */
  ReviewReport = 'REVIEW_REPORT',
  /** Visit site */
  SiteVisit = 'SITE_VISIT'
}

/** AreaManagerAnalyticsData for analytics. */
export type AreaManagerAnalyticsData = {
  __typename?: 'AreaManagerAnalyticsData';
  /** Efficiency comparison */
  efficiencyComparison: CompanyEfficiencyComparison;
  /** Period */
  period: AnalyticsPeriod;
  /** Production comparison */
  productionComparison: CompanyProductionComparison;
  /** Quality comparison */
  qualityComparison: CompanyQualityComparison;
  /** Regional trends */
  regionalTrends: RegionalTrends;
};

/** AreaManagerDashboardData represents dashboard for Area Manager. */
export type AreaManagerDashboardData = {
  __typename?: 'AreaManagerDashboardData';
  /** Action items */
  actionItems: Array<AreaManagerActionItem>;
  /** Regional alerts */
  alerts: Array<RegionalAlert>;
  /** Companies assigned */
  companies: Array<Company>;
  /** Company performance overview */
  companyPerformance: Array<CompanyPerformanceData>;
  /** Overall statistics */
  stats: AreaManagerStats;
  /** User information */
  user: User;
};

/** AreaManagerProfile provides multi-company monitoring access. */
export type AreaManagerProfile = {
  __typename?: 'AreaManagerProfile';
  /** Area-level performance metrics */
  areaStats?: Maybe<AreaStats>;
  /** Companies assigned to this area manager */
  companies: Array<Company>;
  /** Estates across assigned companies */
  estates: Array<Estate>;
  /** Basic user information */
  user: User;
};

/** AreaManagerStats for overall statistics. */
export type AreaManagerStats = {
  __typename?: 'AreaManagerStats';
  /** Average efficiency */
  avgEfficiency: Scalars['Float']['output'];
  /** Monthly production (tons) */
  monthlyProduction: Scalars['Float']['output'];
  /** Monthly target (tons) */
  monthlyTarget: Scalars['Float']['output'];
  /** Target achievement percentage */
  targetAchievement: Scalars['Float']['output'];
  /** Today's production (tons) */
  todayProduction: Scalars['Float']['output'];
  /** Top performing company */
  topPerformingCompany?: Maybe<Scalars['String']['output']>;
  /** Total companies managed */
  totalCompanies: Scalars['Int']['output'];
  /** Total divisions */
  totalDivisions: Scalars['Int']['output'];
  /** Total employees */
  totalEmployees: Scalars['Int']['output'];
  /** Total estates across companies */
  totalEstates: Scalars['Int']['output'];
};

/** AreaStats provides area manager performance metrics. */
export type AreaStats = {
  __typename?: 'AreaStats';
  /** Number of companies under management */
  companiesManaged: Scalars['Int']['output'];
  /** Cross-company performance summary */
  crossCompanyMetrics?: Maybe<CrossCompanyMetrics>;
  /** Total estates across managed companies */
  totalEstates: Scalars['Int']['output'];
};

/** AsistenActionType enum. */
export enum AsistenActionType {
  /** Batch approve */
  BatchApprove = 'BATCH_APPROVE',
  /** View today's history */
  ViewHistory = 'VIEW_HISTORY',
  /** Check monitoring */
  ViewMonitoring = 'VIEW_MONITORING',
  /** View all pending */
  ViewPending = 'VIEW_PENDING',
  /** View reports */
  ViewReports = 'VIEW_REPORTS'
}

/** AsistenDashboardData represents aggregated dashboard data for Asisten. */
export type AsistenDashboardData = {
  __typename?: 'AsistenDashboardData';
  /** Divisions assigned to this asisten */
  divisions: Array<Division>;
  /** Pending approval items */
  pendingItems: Array<ApprovalItem>;
  /** Quick actions */
  quickActions: Array<AsistenQuickAction>;
  /** Dashboard statistics */
  stats: AsistenDashboardStats;
  /** Today's summary */
  todaySummary: AsistenTodaySummary;
  /** Basic user information */
  user: User;
};

/** AsistenDashboardStats represents key metrics for asisten dashboard. */
export type AsistenDashboardStats = {
  __typename?: 'AsistenDashboardStats';
  /** Active mandors today */
  activeMandorsToday: Scalars['Int']['output'];
  /** Approved today */
  approvedToday: Scalars['Int']['output'];
  /** Average approval time (minutes) */
  avgApprovalTime: Scalars['Float']['output'];
  /** Pending approvals count */
  pendingApprovals: Scalars['Int']['output'];
  /** Rejected today */
  rejectedToday: Scalars['Int']['output'];
  /** Today's production (tons) */
  todayProduction: Scalars['Float']['output'];
  /** Total blocks in assigned divisions */
  totalBlocks: Scalars['Int']['output'];
  /** Total divisions assigned */
  totalDivisions: Scalars['Int']['output'];
  /** Total mandors supervised */
  totalMandors: Scalars['Int']['output'];
};

/** AsistenDivisionSummary represents division monitoring summary for asisten. */
export type AsistenDivisionSummary = {
  __typename?: 'AsistenDivisionSummary';
  /** Active blocks */
  activeBlocks: Scalars['Int']['output'];
  /** Active mandors */
  activeMandors: Scalars['Int']['output'];
  /** Daily target */
  dailyTarget: Scalars['Float']['output'];
  /** Division code */
  divisionCode: Scalars['String']['output'];
  /** Division ID */
  divisionId: Scalars['ID']['output'];
  /** Division name */
  divisionName: Scalars['String']['output'];
  /** Last activity */
  lastActivity?: Maybe<Scalars['Time']['output']>;
  /** Pending approvals */
  pendingApprovals: Scalars['Int']['output'];
  /** Progress percentage */
  progress: Scalars['Float']['output'];
  /** Status */
  status: MonitorStatus;
  /** Today's production (tons) */
  todayProduction: Scalars['Float']['output'];
  /** Total blocks */
  totalBlocks: Scalars['Int']['output'];
  /** Total mandors */
  totalMandors: Scalars['Int']['output'];
};

/** AsistenMonitoringData represents monitoring data for asisten. */
export type AsistenMonitoringData = {
  __typename?: 'AsistenMonitoringData';
  /** Timeline of activities */
  activityTimeline: Array<ActivityTimelineItem>;
  /** Block activities */
  blockActivities: Array<BlockActivity>;
  /** Division summaries */
  divisionSummaries: Array<AsistenDivisionSummary>;
  /** Last updated */
  lastUpdated: Scalars['Time']['output'];
  /** Mandor statuses */
  mandorStatuses: Array<MandorStatus>;
  /** Overall status */
  overallStatus: MonitorStatus;
  /** Real-time statistics */
  realtimeStats: AsistenRealtimeStats;
};

/** AsistenProfile provides division-level assistant management access. */
export type AsistenProfile = {
  __typename?: 'AsistenProfile';
  /** Assistant-specific work metrics */
  asistenStats?: Maybe<AsistenStats>;
  /** Company this assistant belongs to */
  company: Company;
  /** Divisions assigned to this assistant */
  divisions: Array<Division>;
  /** Estate this assistant is assigned to */
  estate: Estate;
  /** Basic user information */
  user: User;
};

/** AsistenQuickAction represents a quick action for asisten. */
export type AsistenQuickAction = {
  __typename?: 'AsistenQuickAction';
  /** Count/badge */
  count?: Maybe<Scalars['Int']['output']>;
  /** Action ID */
  id: Scalars['ID']['output'];
  /** Is urgent */
  isUrgent: Scalars['Boolean']['output'];
  /** Action title */
  title: Scalars['String']['output'];
  /** Action type */
  type: AsistenActionType;
};

/** AsistenRealtimeStats represents real-time statistics for asisten. */
export type AsistenRealtimeStats = {
  __typename?: 'AsistenRealtimeStats';
  /** Active blocks */
  activeBlocks: Scalars['Int']['output'];
  /** Active mandors */
  activeMandors: Scalars['Int']['output'];
  /** Average TBS per submission */
  avgTbsPerSubmission: Scalars['Float']['output'];
  /** Pending count */
  pendingCount: Scalars['Int']['output'];
  /** Productivity rate */
  productivityRate: Scalars['Float']['output'];
  /** Total submissions today */
  totalSubmissionsToday: Scalars['Int']['output'];
  /** Total TBS today */
  totalTbsToday: Scalars['Int']['output'];
  /** Total weight today */
  totalWeightToday: Scalars['Float']['output'];
};

/** AsistenStats provides assistant work metrics. */
export type AsistenStats = {
  __typename?: 'AsistenStats';
  /** Daily work summary */
  dailyWorkload?: Maybe<AsistenWorkload>;
  /** Number of divisions assigned */
  divisionsAssigned: Scalars['Int']['output'];
  /** Pending approvals count */
  pendingApprovals: Scalars['Int']['output'];
};

/** AsistenTodaySummary represents today's work summary for asisten. */
export type AsistenTodaySummary = {
  __typename?: 'AsistenTodaySummary';
  /** Active workers */
  activeWorkers: Scalars['Int']['output'];
  /** Approved count */
  approved: Scalars['Int']['output'];
  /** Busiest block */
  busiestBlock?: Maybe<Scalars['String']['output']>;
  /** Pending count */
  pending: Scalars['Int']['output'];
  /** Rejected count */
  rejected: Scalars['Int']['output'];
  /** Total submissions today */
  totalSubmissions: Scalars['Int']['output'];
  /** Total TBS today */
  totalTbs: Scalars['Int']['output'];
  /** Total weight today (tons) */
  totalWeight: Scalars['Float']['output'];
};

/** AsistenWorkload represents assistant daily workload metrics. */
export type AsistenWorkload = {
  __typename?: 'AsistenWorkload';
  /** Approvals completed today */
  approvalsCompleted: Scalars['Int']['output'];
  /** Average approval time in minutes */
  averageApprovalTime: Scalars['Float']['output'];
  /** Rejections made today */
  rejectionsToday: Scalars['Int']['output'];
};

/** AssignRoleFeaturesInput represents input for assigning features to a role. */
export type AssignRoleFeaturesInput = {
  /** Feature codes to assign */
  features: Array<Scalars['String']['input']>;
  /** Role to inherit features from (optional) */
  inheritFrom?: InputMaybe<Scalars['String']['input']>;
  /** Role name (e.g., 'MANDOR', 'SUPER_ADMIN') */
  roleName: Scalars['String']['input'];
};

/**
 * AuthPayload represents the response from authentication operations.
 * Contains access token, refresh token, and user information.
 */
export type AuthPayload = {
  __typename?: 'AuthPayload';
  /** JWT access token for API authentication (15 min validity) */
  accessToken: Scalars['String']['output'];
  /** User assignments for role-based access control */
  assignments: UserAssignments;
  /** Timestamp when access token expires */
  expiresAt: Scalars['Time']['output'];
  /** Token expiration time in seconds */
  expiresIn: Scalars['Int']['output'];
  /** Timestamp when offline token expires (mobile only) */
  offlineExpiresAt?: Maybe<Scalars['Time']['output']>;
  /** Optional offline token for mobile devices (30 days validity) */
  offlineToken?: Maybe<Scalars['String']['output']>;
  /** Timestamp when refresh token expires */
  refreshExpiresAt?: Maybe<Scalars['Time']['output']>;
  /** JWT refresh token for token renewal (7 days validity) */
  refreshToken: Scalars['String']['output'];
  /** Token type (always 'Bearer') */
  tokenType: Scalars['String']['output'];
  /** Authenticated user information */
  user: User;
};

/** BJR (Brondolan Janjang Rasio) calculation result. */
export type BjrCalculation = {
  __typename?: 'BJRCalculation';
  bjrRatio: Scalars['Float']['output'];
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  pksRecord: PksRecord;
  pksRecordId: Scalars['String']['output'];
  tanggalHitung: Scalars['Time']['output'];
  totalBrondolan: Scalars['Float']['output'];
  totalJanjang: Scalars['Float']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** BackupResult for backup operation. */
export type BackupResult = {
  __typename?: 'BackupResult';
  /** Backup ID */
  backupId?: Maybe<Scalars['String']['output']>;
  /** Message */
  message: Scalars['String']['output'];
  /** Started at */
  startedAt: Scalars['Time']['output'];
  /** Success */
  success: Scalars['Boolean']['output'];
};

/** BatchApprovalAction enum. */
export enum BatchApprovalAction {
  Approve = 'APPROVE',
  Reject = 'REJECT'
}

/** BatchApprovalInput for batch approve/reject. */
export type BatchApprovalInput = {
  /** Action type */
  action: BatchApprovalAction;
  /** IDs to approve/reject */
  ids: Array<Scalars['ID']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Rejection reason (required for reject) */
  rejectionReason?: InputMaybe<Scalars['String']['input']>;
};

/** BatchApprovalResult represents result of batch operation. */
export type BatchApprovalResult = {
  __typename?: 'BatchApprovalResult';
  /** Failed count */
  failedCount: Scalars['Int']['output'];
  /** Message */
  message: Scalars['String']['output'];
  /** Individual results */
  results: Array<BatchItemResult>;
  /** Success status */
  success: Scalars['Boolean']['output'];
  /** Successfully processed */
  successCount: Scalars['Int']['output'];
  /** Total processed */
  totalProcessed: Scalars['Int']['output'];
};

/** BatchFeatureCheckInput represents input for checking multiple features. */
export type BatchFeatureCheckInput = {
  /** Feature codes to check */
  features: Array<Scalars['String']['input']>;
  /** Whether all features are required (true) or any (false) */
  requireAll?: InputMaybe<Scalars['Boolean']['input']>;
  /** Scope context for the check */
  scope?: InputMaybe<FeatureScopeInput>;
  /** User ID to check */
  userId: Scalars['ID']['input'];
};

/** BatchFeatureCheckResult represents the result of checking multiple features. */
export type BatchFeatureCheckResult = {
  __typename?: 'BatchFeatureCheckResult';
  /** Features that were denied */
  deniedFeatures?: Maybe<Array<Scalars['String']['output']>>;
  /** Features being checked */
  features: Array<Scalars['String']['output']>;
  /** Features that were granted */
  grantedFeatures?: Maybe<Array<Scalars['String']['output']>>;
  /** Whether the user has access (based on requireAll setting) */
  hasAccess: Scalars['Boolean']['output'];
  /** User ID being checked */
  userId: Scalars['String']['output'];
};

/** BatchItemResult for individual batch item. */
export type BatchItemResult = {
  __typename?: 'BatchItemResult';
  /** Error message if failed */
  error?: Maybe<Scalars['String']['output']>;
  /** Record ID */
  id: Scalars['ID']['output'];
  /** Success status */
  success: Scalars['Boolean']['output'];
};

export type BatchPermissionCheckInput = {
  permissions: Array<Scalars['String']['input']>;
  requireAll?: InputMaybe<Scalars['Boolean']['input']>;
  userId: Scalars['String']['input'];
};

export type BatchPermissionCheckResult = {
  __typename?: 'BatchPermissionCheckResult';
  failedPermissions?: Maybe<Array<Scalars['String']['output']>>;
  hasAccess: Scalars['Boolean']['output'];
  permissions: Array<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

/** Block represents a plantation block within a division. */
export type Block = {
  __typename?: 'Block';
  blockCode: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  cropType?: Maybe<Scalars['String']['output']>;
  division: Division;
  divisionId: Scalars['String']['output'];
  harvestRecords: Array<HarvestRecord>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  istm: Scalars['String']['output'];
  luasHa?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  perlakuan?: Maybe<Scalars['String']['output']>;
  plantingYear?: Maybe<Scalars['Int']['output']>;
  status: Scalars['String']['output'];
  tarifBlok?: Maybe<TarifBlok>;
  tarifBlokId?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['Time']['output'];
};

/** BlockActivity represents activity in a block. */
export type BlockActivity = {
  __typename?: 'BlockActivity';
  /** Block code */
  blockCode: Scalars['String']['output'];
  /** Block ID */
  blockId: Scalars['ID']['output'];
  /** Block name */
  blockName: Scalars['String']['output'];
  /** Current TBS count */
  currentTbs: Scalars['Int']['output'];
  /** Current weight */
  currentWeight: Scalars['Float']['output'];
  /** Division name */
  divisionName: Scalars['String']['output'];
  /** Last update */
  lastUpdate?: Maybe<Scalars['Time']['output']>;
  /** Mandor assigned */
  mandorName?: Maybe<Scalars['String']['output']>;
  /** Start time */
  startTime?: Maybe<Scalars['Time']['output']>;
  /** Status */
  status: BlockActivityStatus;
  /** Workers count */
  workersCount: Scalars['Int']['output'];
};

/** BlockActivityStatus enum. */
export enum BlockActivityStatus {
  /** Harvest in progress */
  Active = 'ACTIVE',
  /** Completed for today */
  Completed = 'COMPLETED',
  /** No activity */
  Idle = 'IDLE',
  /** Paused/break */
  Paused = 'PAUSED'
}

/** BlockPaginationResponse represents a paginated list of blocks. */
export type BlockPaginationResponse = {
  __typename?: 'BlockPaginationResponse';
  /** List of blocks */
  data: Array<Block>;
  /** Pagination metadata */
  pagination: Pagination;
};

/** ChangePasswordInput represents input for changing user password. */
export type ChangePasswordInput = {
  /** Confirmation of new password */
  confirmPassword: Scalars['String']['input'];
  /** Current password for verification */
  currentPassword: Scalars['String']['input'];
  /** Whether to logout from all other devices */
  logoutOtherDevices?: InputMaybe<Scalars['Boolean']['input']>;
  /** New password */
  newPassword: Scalars['String']['input'];
};

/** Company represents a palm oil company entity. */
export type Company = {
  __typename?: 'Company';
  address?: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  companyCode: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  description?: Maybe<Scalars['String']['output']>;
  estates: Array<Estate>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  status: CompanyStatus;
  updatedAt: Scalars['Time']['output'];
};

/** CompanyAdminDashboardData represents dashboard for Company Admin. */
export type CompanyAdminDashboardData = {
  __typename?: 'CompanyAdminDashboardData';
  /** Company information */
  company: Company;
  /** Estate overview */
  estateOverview: Array<EstateOverviewData>;
  /** Recent activities */
  recentActivities: Array<AdminActivityLog>;
  /** Dashboard statistics */
  stats: CompanyAdminStats;
  /** System health */
  systemHealth: SystemHealthData;
  /** User information */
  user: User;
  /** User overview */
  userOverview: UserOverview;
};

/** CompanyAdminProfile provides company-level administrative access. */
export type CompanyAdminProfile = {
  __typename?: 'CompanyAdminProfile';
  /** Company managed by this admin */
  company: Company;
  /** Company-specific statistics */
  companyStats?: Maybe<CompanyStats>;
  /** All divisions within company estates */
  divisions: Array<Division>;
  /** All estates within the company */
  estates: Array<Estate>;
  /** Basic user information */
  user: User;
};

/** CompanyAdminStats for company admin statistics. */
export type CompanyAdminStats = {
  __typename?: 'CompanyAdminStats';
  /** Active users */
  activeUsers: Scalars['Int']['output'];
  /** Monthly production */
  monthlyProduction: Scalars['Float']['output'];
  /** System uptime */
  systemUptime: Scalars['Float']['output'];
  /** Today's production */
  todayProduction: Scalars['Float']['output'];
  /** Total blocks */
  totalBlocks: Scalars['Int']['output'];
  /** Total divisions */
  totalDivisions: Scalars['Int']['output'];
  /** Total employees */
  totalEmployees: Scalars['Int']['output'];
  /** Total estates */
  totalEstates: Scalars['Int']['output'];
  /** Total users */
  totalUsers: Scalars['Int']['output'];
  /** Users online now */
  usersOnlineNow: Scalars['Int']['output'];
};

/** CompanyDetailAdmin for admin company view. */
export type CompanyDetailAdmin = {
  __typename?: 'CompanyDetailAdmin';
  /** Address */
  address?: Maybe<Scalars['String']['output']>;
  /** Admins */
  admins: Array<CompanyUser>;
  /** Area managers */
  areaManagers: Array<CompanyUser>;
  /** Company code */
  code: Scalars['String']['output'];
  /** Created at */
  createdAt: Scalars['Time']['output'];
  /** Email */
  email?: Maybe<Scalars['String']['output']>;
  /** Company ID */
  id: Scalars['ID']['output'];
  /** Company name */
  name: Scalars['String']['output'];
  /** Phone */
  phone?: Maybe<Scalars['String']['output']>;
  /** Statistics */
  statistics: CompanyStatistics;
  /** Status */
  status: CompanyStatus;
  /** Subscription info */
  subscription: SubscriptionInfo;
  /** Usage stats */
  usage: CompanyUsageStats;
};

/** CompanyDeviceStat for device usage statistics. */
export type CompanyDeviceStat = {
  __typename?: 'CompanyDeviceStat';
  /** Company ID */
  companyId: Scalars['ID']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Device count */
  deviceCount: Scalars['Int']['output'];
  /** Last active */
  lastActive?: Maybe<Scalars['Time']['output']>;
};

/** CompanyEfficiencyComparison for efficiency comparison. */
export type CompanyEfficiencyComparison = {
  __typename?: 'CompanyEfficiencyComparison';
  /** Average efficiency */
  avgEfficiency: Scalars['Float']['output'];
  /** Company data */
  companies: Array<CompanyEfficiencyData>;
};

/** CompanyEfficiencyData for company efficiency. */
export type CompanyEfficiencyData = {
  __typename?: 'CompanyEfficiencyData';
  /** Company ID */
  companyId: Scalars['ID']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Labor efficiency */
  laborEfficiency: Scalars['Float']['output'];
  /** Overall score */
  overallScore: Scalars['Float']['output'];
  /** Rank */
  rank: Scalars['Int']['output'];
  /** Resource efficiency */
  resourceEfficiency: Scalars['Float']['output'];
};

/** CompanyHealthStatus enum. */
export enum CompanyHealthStatus {
  Critical = 'CRITICAL',
  Excellent = 'EXCELLENT',
  Good = 'GOOD',
  Warning = 'WARNING'
}

/** CompanyListResponse for company listing. */
export type CompanyListResponse = {
  __typename?: 'CompanyListResponse';
  /** Companies */
  companies: Array<CompanyDetailAdmin>;
  /** Has more */
  hasMore: Scalars['Boolean']['output'];
  /** Total count */
  totalCount: Scalars['Int']['output'];
};

/** CompanyManagementResult for operations. */
export type CompanyManagementResult = {
  __typename?: 'CompanyManagementResult';
  /** Company */
  company?: Maybe<CompanyDetailAdmin>;
  /** Errors */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Message */
  message: Scalars['String']['output'];
  /** Success */
  success: Scalars['Boolean']['output'];
};

/** CompanyPaginationResponse represents a paginated list of companies. */
export type CompanyPaginationResponse = {
  __typename?: 'CompanyPaginationResponse';
  /** List of companies */
  data: Array<Company>;
  /** Pagination metadata */
  pagination: Pagination;
};

/** CompanyPerformance represents company-level performance metrics. */
export type CompanyPerformance = {
  __typename?: 'CompanyPerformance';
  /** Average quality score */
  averageQualityScore: Scalars['Float']['output'];
  /** Estate efficiency metrics */
  estateEfficiency: Scalars['Float']['output'];
  /** Monthly harvest volume */
  monthlyHarvestVolume: Scalars['Float']['output'];
};

/** CompanyPerformanceData for company performance. */
export type CompanyPerformanceData = {
  __typename?: 'CompanyPerformanceData';
  /** Company ID */
  companyId: Scalars['ID']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Efficiency score */
  efficiencyScore: Scalars['Float']['output'];
  /** Estates count */
  estatesCount: Scalars['Int']['output'];
  /** Monthly production */
  monthlyProduction: Scalars['Float']['output'];
  /** Pending issues */
  pendingIssues: Scalars['Int']['output'];
  /** Quality score */
  qualityScore: Scalars['Float']['output'];
  /** Status */
  status: CompanyHealthStatus;
  /** Target achievement */
  targetAchievement: Scalars['Float']['output'];
  /** Today's production */
  todayProduction: Scalars['Float']['output'];
  /** Trend */
  trend: TrendDirection;
};

/** CompanyProductionComparison for production comparison. */
export type CompanyProductionComparison = {
  __typename?: 'CompanyProductionComparison';
  /** Company data */
  companies: Array<CompanyProductionData>;
  /** Total production */
  totalProduction: Scalars['Float']['output'];
  /** vs Previous period */
  vsPreviousPeriod: Scalars['Float']['output'];
};

/** CompanyProductionData for company production. */
export type CompanyProductionData = {
  __typename?: 'CompanyProductionData';
  /** Achievement */
  achievement: Scalars['Float']['output'];
  /** Company ID */
  companyId: Scalars['ID']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Production */
  production: Scalars['Float']['output'];
  /** Rank */
  rank: Scalars['Int']['output'];
  /** Target */
  target: Scalars['Float']['output'];
};

/** CompanyQualityComparison for quality comparison. */
export type CompanyQualityComparison = {
  __typename?: 'CompanyQualityComparison';
  /** Average quality */
  avgQuality: Scalars['Float']['output'];
  /** Company data */
  companies: Array<CompanyQualityData>;
};

/** CompanyQualityData for company quality. */
export type CompanyQualityData = {
  __typename?: 'CompanyQualityData';
  /** Avg BJR */
  avgBjr: Scalars['Float']['output'];
  /** Company ID */
  companyId: Scalars['ID']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Grade A percentage */
  gradeAPercentage: Scalars['Float']['output'];
  /** Quality score */
  qualityScore: Scalars['Float']['output'];
  /** Rank */
  rank: Scalars['Int']['output'];
};

/** CompanyReportDetail for company report. */
export type CompanyReportDetail = {
  __typename?: 'CompanyReportDetail';
  /** Company ID */
  companyId: Scalars['ID']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Efficiency score */
  efficiencyScore: Scalars['Float']['output'];
  /** Issues count */
  issuesCount: Scalars['Int']['output'];
  /** Production */
  production: Scalars['Float']['output'];
  /** Quality score */
  qualityScore: Scalars['Float']['output'];
  /** Recommendations */
  recommendations: Array<Scalars['String']['output']>;
  /** Target achievement */
  targetAchievement: Scalars['Float']['output'];
};

/** CompanySettings for company configuration. */
export type CompanySettings = {
  __typename?: 'CompanySettings';
  /** Company ID */
  companyId: Scalars['ID']['output'];
  /** General settings */
  general: GeneralSettings;
  /** Notification settings */
  notifications: NotificationSettings;
  /** Operational settings */
  operational: OperationalSettings;
  /** Security settings */
  security: SecuritySettings;
};

/** CompanyStatistics for company stats. */
export type CompanyStatistics = {
  __typename?: 'CompanyStatistics';
  /** Active users today */
  activeUsersToday: Scalars['Int']['output'];
  /** Harvests this month */
  harvestsThisMonth: Scalars['Int']['output'];
  /** Production this month (tons) */
  productionThisMonth: Scalars['Float']['output'];
  /** Total blocks */
  totalBlocks: Scalars['Int']['output'];
  /** Total divisions */
  totalDivisions: Scalars['Int']['output'];
  /** Total estates */
  totalEstates: Scalars['Int']['output'];
  /** Total users */
  totalUsers: Scalars['Int']['output'];
};

/** CompanyStats provides company-level administrative metrics. */
export type CompanyStats = {
  __typename?: 'CompanyStats';
  /** Company performance metrics */
  performanceMetrics?: Maybe<CompanyPerformance>;
  /** Number of divisions across all estates */
  totalDivisions: Scalars['Int']['output'];
  /** Number of estates in the company */
  totalEstates: Scalars['Int']['output'];
  /** Number of active users in the company */
  totalUsers: Scalars['Int']['output'];
};

export enum CompanyStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED'
}

/** CompanyStatusCount for status breakdown. */
export type CompanyStatusCount = {
  __typename?: 'CompanyStatusCount';
  /** Count */
  count: Scalars['Int']['output'];
  /** Status */
  status: Scalars['String']['output'];
};

/** CompanyUsageStats for usage statistics. */
export type CompanyUsageStats = {
  __typename?: 'CompanyUsageStats';
  /** API calls this month */
  apiCallsThisMonth: Scalars['Int']['output'];
  /** Current estates */
  currentEstates: Scalars['Int']['output'];
  /** Current users */
  currentUsers: Scalars['Int']['output'];
  /** Max estates */
  maxEstates: Scalars['Int']['output'];
  /** Max storage (GB) */
  maxStorageGb: Scalars['Float']['output'];
  /** Max users */
  maxUsers: Scalars['Int']['output'];
  /** Storage used (GB) */
  storageUsedGb: Scalars['Float']['output'];
};

/** CompanyUser for user data. */
export type CompanyUser = {
  __typename?: 'CompanyUser';
  /** Assignments */
  assignments: UserAssignmentSummary;
  /** Created at */
  createdAt: Scalars['Time']['output'];
  /** Email */
  email?: Maybe<Scalars['String']['output']>;
  /** Full name */
  fullName: Scalars['String']['output'];
  /** User ID */
  id: Scalars['ID']['output'];
  /** Is active */
  isActive: Scalars['Boolean']['output'];
  /** Is online */
  isOnline: Scalars['Boolean']['output'];
  /** Last login */
  lastLogin?: Maybe<Scalars['Time']['output']>;
  /** Phone */
  phone?: Maybe<Scalars['String']['output']>;
  /** Role */
  role: Scalars['String']['output'];
  /** Username */
  username: Scalars['String']['output'];
};

/** CompanyUserListResponse for user listing. */
export type CompanyUserListResponse = {
  __typename?: 'CompanyUserListResponse';
  /** Has more */
  hasMore: Scalars['Boolean']['output'];
  /** Total count */
  totalCount: Scalars['Int']['output'];
  /** Users */
  users: Array<CompanyUser>;
};

/** ComparisonMetrics represents comparison with previous periods. */
export type ComparisonMetrics = {
  __typename?: 'ComparisonMetrics';
  /** Change percentage */
  changePercentage: Scalars['Float']['output'];
  /** Current period value */
  currentValue: Scalars['Float']['output'];
  /** Previous period value */
  previousValue: Scalars['Float']['output'];
  /** Target achievement percentage */
  targetAchievement: Scalars['Float']['output'];
  /** Target value */
  targetValue: Scalars['Float']['output'];
  /** vs Same period last year */
  vsLastYear?: Maybe<Scalars['Float']['output']>;
};

/** ConflictResolution represents conflict resolution strategies. */
export enum ConflictResolution {
  /** Latest timestamp wins */
  LatestWins = 'LATEST_WINS',
  /** Local version wins */
  LocalWins = 'LOCAL_WINS',
  /** Manual resolution required */
  Manual = 'MANUAL',
  /** Attempt to merge changes */
  Merge = 'MERGE',
  /** Remote/server version wins */
  RemoteWins = 'REMOTE_WINS'
}

/** Coordinates holds GPS location data. */
export type Coordinates = {
  __typename?: 'Coordinates';
  /** GPS latitude */
  latitude: Scalars['Float']['output'];
  /** GPS longitude */
  longitude: Scalars['Float']['output'];
};

/** CreateAPIKeyInput represents the input for creating a new API key. */
export type CreateApiKeyInput = {
  /** Number of days until the key expires (null for no expiration) */
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  /** Human-readable name for the API key */
  name: Scalars['String']['input'];
  /** Array of permissions/scopes to grant */
  scopes: Array<Scalars['String']['input']>;
};

export type CreateBlockInput = {
  blockCode: Scalars['String']['input'];
  cropType?: InputMaybe<Scalars['String']['input']>;
  divisionId: Scalars['String']['input'];
  istm?: InputMaybe<Scalars['String']['input']>;
  luasHa?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  plantingYear?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tarifBlokId?: InputMaybe<Scalars['ID']['input']>;
};

/** CreateCompanyAdminInput for creating company. */
export type CreateCompanyAdminInput = {
  /** Address */
  address?: InputMaybe<Scalars['String']['input']>;
  /** Initial admin email */
  adminEmail: Scalars['String']['input'];
  /** Initial admin password */
  adminPassword: Scalars['String']['input'];
  /** Initial admin username */
  adminUsername: Scalars['String']['input'];
  /** Company code */
  code: Scalars['String']['input'];
  /** Email */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Features enabled */
  featuresEnabled?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Max estates */
  maxEstates: Scalars['Int']['input'];
  /** Max storage (GB) */
  maxStorageGb: Scalars['Float']['input'];
  /** Max users */
  maxUsers: Scalars['Int']['input'];
  /** Company name */
  name: Scalars['String']['input'];
  /** Phone */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Plan type */
  planType: PlanType;
  /** Trial days (if trial) */
  trialDays?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateCompanyInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  companyCode: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CompanyStatus>;
};

/** CreateCompanyUserInput for creating user. */
export type CreateCompanyUserInput = {
  /** Division assignments (for asisten/mandor) */
  divisionIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Email */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Estate assignments (for manager) */
  estateIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Full name */
  fullName: Scalars['String']['input'];
  /** Manager/Supervisor identifier */
  managerId?: InputMaybe<Scalars['ID']['input']>;
  /** Initial password */
  password: Scalars['String']['input'];
  /** Phone */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** PKS assignment */
  pksId?: InputMaybe<Scalars['ID']['input']>;
  /** Role */
  role: Scalars['String']['input'];
  /** Send welcome email */
  sendWelcomeEmail?: InputMaybe<Scalars['Boolean']['input']>;
  /** Username */
  username: Scalars['String']['input'];
};

export type CreateDivisionInput = {
  code: Scalars['String']['input'];
  estateId: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateEmployeeInput = {
  companyId: Scalars['ID']['input'];
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  nik: Scalars['String']['input'];
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  role: Scalars['String']['input'];
};

export type CreateEstateInput = {
  code: Scalars['String']['input'];
  companyId: Scalars['String']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  luasHa?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
};

/** CreateFeatureInput represents input for creating a new feature. */
export type CreateFeatureInput = {
  /** Detailed description */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Human-readable display name */
  displayName: Scalars['String']['input'];
  /** Whether this feature is active */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Additional metadata (JSON) */
  metadata?: InputMaybe<FeatureMetadataInput>;
  /** Module this feature belongs to */
  module: Scalars['String']['input'];
  /** Feature code (alphanumeric, dots, underscores only) */
  name: Scalars['String']['input'];
  /** Parent feature ID (for hierarchical features) */
  parentId?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateGradingRecordInput = {
  brondolanPercentage: Scalars['Float']['input'];
  dirtPercentage: Scalars['Float']['input'];
  gradingDate: Scalars['Time']['input'];
  gradingNotes?: InputMaybe<Scalars['String']['input']>;
  harvestRecordId: Scalars['ID']['input'];
  looseFruitPercentage: Scalars['Float']['input'];
  maturityLevel: Scalars['String']['input'];
  qualityScore: Scalars['Int']['input'];
};

/** CreateGuestRegistrationInput for registering new guest. */
export type CreateGuestRegistrationInput = {
  /** Cargo owner */
  cargoOwner?: InputMaybe<Scalars['String']['input']>;
  /** Cargo volume */
  cargoVolume?: InputMaybe<Scalars['String']['input']>;
  /** Client timestamp */
  clientTimestamp: Scalars['Time']['input'];
  /** Delivery order number */
  deliveryOrderNumber?: InputMaybe<Scalars['String']['input']>;
  /** Destination within estate */
  destination?: InputMaybe<Scalars['String']['input']>;
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Driver name */
  driverName: Scalars['String']['input'];
  /** Estimated weight */
  estimatedWeight?: InputMaybe<Scalars['Float']['input']>;
  /** Gate position */
  gatePosition: Scalars['String']['input'];
  /** ID card number */
  idCardNumber?: InputMaybe<Scalars['String']['input']>;
  /** GPS latitude */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** Load type */
  loadType?: InputMaybe<Scalars['String']['input']>;
  /** Local ID for offline-first */
  localId: Scalars['String']['input'];
  /** GPS longitude */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Registration source */
  registrationSource?: InputMaybe<RegistrationSource>;
  /** Second cargo */
  secondCargo?: InputMaybe<Scalars['String']['input']>;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['input'];
  /** Vehicle type */
  vehicleType: VehicleType;
};

export type CreateHarvestRecordInput = {
  beratTbs: Scalars['Float']['input'];
  blockId: Scalars['String']['input'];
  jumlahJanjang: Scalars['Int']['input'];
  karyawan: Scalars['String']['input'];
  localId?: InputMaybe<Scalars['String']['input']>;
  mandorId: Scalars['String']['input'];
  tanggal: Scalars['Time']['input'];
};

export type CreateHerbisidaUsageInput = {
  hargaPerLiter: Scalars['Float']['input'];
  jenisHerbisida: Scalars['String']['input'];
  jumlahLiter: Scalars['Float']['input'];
  perawatanRecordId: Scalars['String']['input'];
};

/** CreateMandorHarvestInput represents input for creating harvest record. */
export type CreateMandorHarvestInput = {
  /** Asisten ID */
  asistenId?: InputMaybe<Scalars['String']['input']>;
  /** Weight in kg (optional, can be calculated) */
  beratTbs?: InputMaybe<Scalars['Float']['input']>;
  /** Block ID */
  blockId: Scalars['String']['input'];
  /** Client timestamp for offline sync */
  clientTimestamp: Scalars['Time']['input'];
  /** Company ID */
  companyId?: InputMaybe<Scalars['String']['input']>;
  /** Device ID for offline tracking */
  deviceId: Scalars['String']['input'];
  /** TBS count (janjang) */
  jumlahJanjang: Scalars['Int']['input'];
  /** Employee selection (comma-separated IDs or names) */
  karyawan: Scalars['String']['input'];
  /** GPS latitude */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** Local UUID for offline-first */
  localId: Scalars['String']['input'];
  /** GPS longitude */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** Manager ID */
  managerId?: InputMaybe<Scalars['String']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Photo paths (local) */
  photoPaths?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Harvest date */
  tanggal: Scalars['Time']['input'];
};

export type CreatePksRecordInput = {
  beratTimbang: Scalars['Float']['input'];
  bjrPercentage: Scalars['Float']['input'];
  harvestRecordId: Scalars['String']['input'];
  kualitas: PksKualitas;
  nomorDo: Scalars['String']['input'];
  tanggalTimbang: Scalars['Time']['input'];
};

export type CreatePerawatanRecordInput = {
  blockId: Scalars['String']['input'];
  catatan?: InputMaybe<Scalars['String']['input']>;
  herbisidaDigunakan?: InputMaybe<Scalars['String']['input']>;
  jenisPerawatan: JenisPerawatan;
  luasArea: Scalars['Float']['input'];
  pekerjaId: Scalars['String']['input'];
  pupukDigunakan?: InputMaybe<Scalars['String']['input']>;
  tanggalPerawatan: Scalars['Time']['input'];
};

export type CreatePupukUsageInput = {
  hargaPerKg: Scalars['Float']['input'];
  jenisPupuk: Scalars['String']['input'];
  jumlahKg: Scalars['Float']['input'];
  perawatanRecordId: Scalars['String']['input'];
};

export type CreateTarifBlokInput = {
  basis?: InputMaybe<Scalars['Float']['input']>;
  companyId: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  perlakuan: Scalars['String']['input'];
  premi?: InputMaybe<Scalars['Float']['input']>;
  tarifLebaran?: InputMaybe<Scalars['Float']['input']>;
  tarifLibur?: InputMaybe<Scalars['Float']['input']>;
  tarifPremi1?: InputMaybe<Scalars['Float']['input']>;
  tarifPremi2?: InputMaybe<Scalars['Float']['input']>;
  tarifUpah?: InputMaybe<Scalars['Float']['input']>;
};

/** CreateUserInput represents the input for creating a new user with comprehensive validation. */
export type CreateUserInput = {
  /** Company identifiers this user belongs to (supports multi-company assignment, optional for SUPER_ADMIN) */
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Division identifiers (optional, for field roles) */
  divisionIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Optional email address for notifications */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Estate identifiers (optional, for field roles) */
  estateIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Whether the user account should be active immediately */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Manager/Supervisor identifier */
  managerId?: InputMaybe<Scalars['String']['input']>;
  /** Display name of the user */
  name: Scalars['String']['input'];
  /** Initial password for the user */
  password: Scalars['String']['input'];
  /** Optional phone number */
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  /** Role defining user permissions and access level */
  role: UserRole;
  /** Unique username for authentication */
  username: Scalars['String']['input'];
};

export type CreateVehicleInput = {
  assignedDriverName?: InputMaybe<Scalars['String']['input']>;
  brand: Scalars['String']['input'];
  chassisNumber: Scalars['String']['input'];
  companyId?: InputMaybe<Scalars['ID']['input']>;
  engineNumber: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  kirExpiryDate?: InputMaybe<Scalars['Time']['input']>;
  manufactureYear: Scalars['Int']['input'];
  model: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  registrationPlate: Scalars['String']['input'];
  registrationRegion?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  stnkExpiryDate?: InputMaybe<Scalars['Time']['input']>;
  vehicleCategory: Scalars['String']['input'];
  vehicleType: Scalars['String']['input'];
};

export type CreateVehicleTaxDocumentInput = {
  documentType: Scalars['String']['input'];
  filePath: Scalars['String']['input'];
  vehicleTaxId: Scalars['ID']['input'];
};

export type CreateVehicleTaxInput = {
  adminAmount: Scalars['Float']['input'];
  dueDate: Scalars['Time']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  paymentDate?: InputMaybe<Scalars['Time']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
  penaltyAmount: Scalars['Float']['input'];
  pkbAmount: Scalars['Float']['input'];
  swdklljAmount: Scalars['Float']['input'];
  taxStatus?: InputMaybe<Scalars['String']['input']>;
  taxYear: Scalars['Int']['input'];
  totalAmount?: InputMaybe<Scalars['Float']['input']>;
  vehicleId: Scalars['ID']['input'];
};

/** CreateWeighingRecordInput for creating weighing records directly (internal use). */
export type CreateWeighingRecordInput = {
  /** Cargo type */
  cargoType?: InputMaybe<Scalars['String']['input']>;
  /** Company ID */
  companyId: Scalars['String']['input'];
  /** Driver name */
  driverName?: InputMaybe<Scalars['String']['input']>;
  /** Gross weight (kg) */
  grossWeight: Scalars['Float']['input'];
  /** Net weight (kg) */
  netWeight: Scalars['Float']['input'];
  /** Tare weight (kg) */
  tareWeight: Scalars['Float']['input'];
  /** Ticket number */
  ticketNumber: Scalars['String']['input'];
  /** Vehicle number/plate */
  vehicleNumber: Scalars['String']['input'];
  /** Vendor name */
  vendorName?: InputMaybe<Scalars['String']['input']>;
  /** Weighing time */
  weighingTime: Scalars['Time']['input'];
};

/** CrossCompanyMetrics represents area manager cross-company metrics. */
export type CrossCompanyMetrics = {
  __typename?: 'CrossCompanyMetrics';
  /** Average performance across companies */
  averagePerformance: Scalars['Float']['output'];
  /** Best performing company */
  bestPerformingCompany: Scalars['String']['output'];
  /** Total production across all companies */
  totalProduction: Scalars['Float']['output'];
};

/** DailyApprovalStats for daily breakdown. */
export type DailyApprovalStats = {
  __typename?: 'DailyApprovalStats';
  /** Approved */
  approved: Scalars['Int']['output'];
  /** Date */
  date: Scalars['Time']['output'];
  /** Rejected */
  rejected: Scalars['Int']['output'];
  /** Submissions */
  submissions: Scalars['Int']['output'];
  /** Total TBS */
  totalTbs: Scalars['Int']['output'];
  /** Total weight */
  totalWeight: Scalars['Float']['output'];
};

/** DatabaseHealthInfo shows database connection and RLS policy status. */
export type DatabaseHealthInfo = {
  __typename?: 'DatabaseHealthInfo';
  /** Number of active connections */
  activeConnections?: Maybe<Scalars['Int']['output']>;
  /** Whether database connection is healthy */
  connected: Scalars['Boolean']['output'];
  /** Whether RLS is enabled on critical tables */
  rlsEnabled: Scalars['Boolean']['output'];
  /** List of tables with RLS enabled */
  rlsTablesCount?: Maybe<Scalars['Int']['output']>;
  /** PostgreSQL version */
  version?: Maybe<Scalars['String']['output']>;
};

/** DenyUserFeatureInput represents input for denying a feature to a user. */
export type DenyUserFeatureInput = {
  /** When this denial becomes effective */
  effectiveFrom?: InputMaybe<Scalars['Time']['input']>;
  /** When this denial expires */
  expiresAt?: InputMaybe<Scalars['Time']['input']>;
  /** Feature code to deny */
  feature: Scalars['String']['input'];
  /** Reason for denying */
  reason?: InputMaybe<Scalars['String']['input']>;
  /** Scope for this denial (optional) */
  scope?: InputMaybe<FeatureScopeInput>;
  /** User ID to deny feature for */
  userId: Scalars['ID']['input'];
};

/**
 * Device represents a bound device for mobile authentication.
 * Supports trust levels and device fingerprinting for security.
 */
export type Device = {
  __typename?: 'Device';
  /** When device was first bound */
  createdAt: Scalars['Time']['output'];
  /** Device fingerprint for security validation */
  deviceFingerprint: Scalars['String']['output'];
  /** User-friendly device ID */
  deviceId: Scalars['String']['output'];
  /** Device information */
  deviceInfo: DeviceInfo;
  /** Unique device identifier */
  id: Scalars['ID']['output'];
  /** Whether device is authorized to access the system */
  isAuthorized: Scalars['Boolean']['output'];
  /** Whether device is trusted */
  isTrusted: Scalars['Boolean']['output'];
  /** Last time this device was used */
  lastSeenAt: Scalars['Time']['output'];
  /** Platform this device runs on */
  platform: PlatformType;
  /** Trust level assigned to this device */
  trustLevel: Scalars['String']['output'];
  /** When device binding was last updated */
  updatedAt: Scalars['Time']['output'];
};

/** DeviceBindInput represents input for binding a device. */
export type DeviceBindInput = {
  /** Biometric hash for additional security */
  biometricHash?: InputMaybe<Scalars['String']['input']>;
  /** Device fingerprint */
  deviceFingerprint: Scalars['String']['input'];
  /** Device ID to bind */
  deviceId: Scalars['String']['input'];
  /** Device information */
  deviceInfo: DeviceInfoInput;
  /** Device platform */
  platform: PlatformType;
};

/** DeviceContextInput provides context about the device for logout operations. */
export type DeviceContextInput = {
  /** Version of the application */
  appVersion: Scalars['String']['input'];
  /** Unique identifier for the device */
  deviceId: Scalars['String']['input'];
  /** Platform the device is running on */
  platform: PlatformType;
};

/** DeviceInfo contains detailed information about a device. */
export type DeviceInfo = {
  __typename?: 'DeviceInfo';
  /** Application version */
  appVersion: Scalars['String']['output'];
  /** Device language */
  deviceLanguage?: Maybe<Scalars['String']['output']>;
  /** Device name set by user */
  deviceName?: Maybe<Scalars['String']['output']>;
  /** Device model/name */
  model: Scalars['String']['output'];
  /** Operating system version */
  osVersion: Scalars['String']['output'];
  /** Screen resolution */
  screenResolution?: Maybe<Scalars['String']['output']>;
};

/** DeviceInfoInput contains device information for registration. */
export type DeviceInfoInput = {
  /** Application version */
  appVersion: Scalars['String']['input'];
  /** Device language */
  deviceLanguage?: InputMaybe<Scalars['String']['input']>;
  /** Device name set by user */
  deviceName?: InputMaybe<Scalars['String']['input']>;
  /** Device model/name */
  model: Scalars['String']['input'];
  /** Operating system version */
  osVersion: Scalars['String']['input'];
  /** Screen resolution */
  screenResolution?: InputMaybe<Scalars['String']['input']>;
};

/** DeviceResponse represents the response from device operations. */
export type DeviceResponse = {
  __typename?: 'DeviceResponse';
  /** Device information */
  device?: Maybe<Device>;
  /** Result message */
  message: Scalars['String']['output'];
  /** Whether the operation was successful */
  success: Scalars['Boolean']['output'];
  /** Trust level assigned */
  trustLevel?: Maybe<Scalars['String']['output']>;
};

/** Division represents a division within an estate for organizational structure. */
export type Division = {
  __typename?: 'Division';
  blocks: Array<Block>;
  code: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  estate: Estate;
  estateId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** DivisionMonitorSummary represents division-level monitoring summary. */
export type DivisionMonitorSummary = {
  __typename?: 'DivisionMonitorSummary';
  /** Active blocks */
  activeBlocks: Scalars['Int']['output'];
  /** Division ID */
  divisionId: Scalars['ID']['output'];
  /** Division name */
  divisionName: Scalars['String']['output'];
  /** Estate ID */
  estateId: Scalars['ID']['output'];
  /** Last activity timestamp */
  lastActivity?: Maybe<Scalars['Time']['output']>;
  /** Mandor on duty */
  mandorName?: Maybe<Scalars['String']['output']>;
  /** Progress percentage */
  progress: Scalars['Float']['output'];
  /** Status */
  status: MonitorStatus;
  /** Today's production */
  todayProduction: Scalars['Float']['output'];
  /** Total blocks */
  totalBlocks: Scalars['Int']['output'];
};

/** DivisionPerformanceData represents division performance breakdown. */
export type DivisionPerformanceData = {
  __typename?: 'DivisionPerformanceData';
  /** Achievement percentage */
  achievement: Scalars['Float']['output'];
  /** Division ID */
  divisionId: Scalars['ID']['output'];
  /** Division name */
  divisionName: Scalars['String']['output'];
  /** Production value */
  production: Scalars['Float']['output'];
  /** Rank among divisions */
  rank: Scalars['Int']['output'];
  /** Target value */
  target: Scalars['Float']['output'];
};

/** DoDetails for DO information. */
export type DoDetails = {
  __typename?: 'DoDetails';
  /** DO number */
  doNumber: Scalars['String']['output'];
  /** Expected weight */
  expectedWeight?: Maybe<Scalars['Float']['output']>;
  /** Harvest date */
  harvestDate?: Maybe<Scalars['Time']['output']>;
  /** Mandor name */
  mandorName?: Maybe<Scalars['String']['output']>;
  /** Source division */
  sourceDivision?: Maybe<Scalars['String']['output']>;
  /** Source estate */
  sourceEstate: Scalars['String']['output'];
};

/** DoValidationResult for DO validation. */
export type DoValidationResult = {
  __typename?: 'DoValidationResult';
  /** DO details if valid */
  doDetails?: Maybe<DoDetails>;
  /** Is valid */
  isValid: Scalars['Boolean']['output'];
  /** Message */
  message: Scalars['String']['output'];
};

/** EfficiencyMetrics represents efficiency analysis. */
export type EfficiencyMetrics = {
  __typename?: 'EfficiencyMetrics';
  /** Cost efficiency */
  costEfficiency?: Maybe<Scalars['Float']['output']>;
  /** Labor efficiency */
  laborEfficiency: Scalars['Float']['output'];
  /** Overall efficiency score */
  overallScore: Scalars['Float']['output'];
  /** Productivity per worker */
  productivityPerWorker: Scalars['Float']['output'];
  /** Resource utilization */
  resourceUtilization: Scalars['Float']['output'];
  /** Time efficiency */
  timeEfficiency: Scalars['Float']['output'];
};

/** EmailSettings for email configuration. */
export type EmailSettings = {
  __typename?: 'EmailSettings';
  /** From email */
  fromEmail?: Maybe<Scalars['String']['output']>;
  /** From name */
  fromName?: Maybe<Scalars['String']['output']>;
  /** SMTP enabled */
  smtpEnabled: Scalars['Boolean']['output'];
  /** SMTP host */
  smtpHost?: Maybe<Scalars['String']['output']>;
  /** SMTP port */
  smtpPort?: Maybe<Scalars['Int']['output']>;
};

/** EmailSettingsInput for email. */
export type EmailSettingsInput = {
  /** From email */
  fromEmail?: InputMaybe<Scalars['String']['input']>;
  /** From name */
  fromName?: InputMaybe<Scalars['String']['input']>;
  /** SMTP enabled */
  smtpEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** SMTP host */
  smtpHost?: InputMaybe<Scalars['String']['input']>;
  /** SMTP port */
  smtpPort?: InputMaybe<Scalars['Int']['input']>;
};

export type Employee = {
  __typename?: 'Employee';
  companyId: Scalars['ID']['output'];
  createdAt: Scalars['Time']['output'];
  divisionId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  nik: Scalars['String']['output'];
  photoUrl?: Maybe<Scalars['String']['output']>;
  role: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** EmployeeLogSyncInput for employee access log sync. */
export type EmployeeLogSyncInput = {
  /** Client timestamp */
  clientTimestamp: Scalars['Time']['input'];
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Log record */
  record: EmployeeLogSyncRecord;
};

/** EmployeeLogSyncRecord data. */
export type EmployeeLogSyncRecord = {
  /** Action (ENTRY/EXIT) */
  action: Scalars['String']['input'];
  /** Company ID */
  companyId?: InputMaybe<Scalars['String']['input']>;
  /** Department */
  departement?: InputMaybe<Scalars['String']['input']>;
  /** Device ID */
  deviceId?: InputMaybe<Scalars['String']['input']>;
  /** Gate Position */
  gatePosition: Scalars['String']['input'];
  /** ID Data (QR content) */
  iddata?: InputMaybe<Scalars['String']['input']>;
  /** Local ID */
  localId: Scalars['String']['input'];
  /** Local version */
  localVersion?: InputMaybe<Scalars['Int']['input']>;
  /** Name */
  nama?: InputMaybe<Scalars['String']['input']>;
  /** NIK / Employee ID */
  nik?: InputMaybe<Scalars['String']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Photo path */
  photoPath?: InputMaybe<Scalars['String']['input']>;
  /** QR timestamp */
  qrTimestamp?: InputMaybe<Scalars['String']['input']>;
  /** Scanned at timestamp */
  scannedAt?: InputMaybe<Scalars['String']['input']>;
  /** Scanned by ID */
  scannedById?: InputMaybe<Scalars['String']['input']>;
  /** Server ID */
  serverId?: InputMaybe<Scalars['String']['input']>;
};

/** EmployeeLogSyncResult response. */
export type EmployeeLogSyncResult = {
  __typename?: 'EmployeeLogSyncResult';
  /** Server Record ID */
  employeeLogId?: Maybe<Scalars['String']['output']>;
  /** Message */
  message: Scalars['String']['output'];
  /** Server Timestamp */
  serverTimestamp: Scalars['Time']['output'];
  /** Success */
  success: Scalars['Boolean']['output'];
};

export type EmployeePaginationResponse = {
  __typename?: 'EmployeePaginationResponse';
  data: Array<Employee>;
  pagination: Pagination;
};

/** Estate represents a plantation estate. */
export type Estate = {
  __typename?: 'Estate';
  code: Scalars['String']['output'];
  company: Company;
  companyId: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  divisions: Array<Division>;
  id: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  luasHa?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** EstateMonitorSummary represents estate-level monitoring summary. */
export type EstateMonitorSummary = {
  __typename?: 'EstateMonitorSummary';
  /** Achievement percentage */
  achievement: Scalars['Float']['output'];
  /** Active divisions */
  activeDivisions: Scalars['Int']['output'];
  /** Active workers */
  activeWorkers: Scalars['Int']['output'];
  /** Daily target */
  dailyTarget: Scalars['Float']['output'];
  /** Estate ID */
  estateId: Scalars['ID']['output'];
  /** Estate name */
  estateName: Scalars['String']['output'];
  /** Status */
  status: MonitorStatus;
  /** Today's production */
  todayProduction: Scalars['Float']['output'];
  /** Total divisions */
  totalDivisions: Scalars['Int']['output'];
};

/** EstateOverviewData for estate overview. */
export type EstateOverviewData = {
  __typename?: 'EstateOverviewData';
  /** Divisions count */
  divisionsCount: Scalars['Int']['output'];
  /** Estate ID */
  estateId: Scalars['ID']['output'];
  /** Estate name */
  estateName: Scalars['String']['output'];
  /** Manager name */
  managerName?: Maybe<Scalars['String']['output']>;
  /** Status */
  status: EstateStatus;
  /** Today's production */
  todayProduction: Scalars['Float']['output'];
  /** Users count */
  usersCount: Scalars['Int']['output'];
};

/** EstatePerformance represents estate-level performance metrics. */
export type EstatePerformance = {
  __typename?: 'EstatePerformance';
  /** Actual production achieved */
  actualProduction: Scalars['Float']['output'];
  /** Production efficiency percentage */
  efficiency: Scalars['Float']['output'];
  /** Monthly production target */
  monthlyTarget: Scalars['Float']['output'];
};

/** EstateStatus enum. */
export enum EstateStatus {
  Maintenance = 'MAINTENANCE',
  Offline = 'OFFLINE',
  Operational = 'OPERATIONAL',
  Partial = 'PARTIAL'
}

/** EstateWeighingSummary for per-estate summary. */
export type EstateWeighingSummary = {
  __typename?: 'EstateWeighingSummary';
  /** Avg BJR */
  avgBjr: Scalars['Float']['output'];
  /** Count */
  count: Scalars['Int']['output'];
  /** Estate name */
  estateName: Scalars['String']['output'];
  /** Total weight (tons) */
  totalWeight: Scalars['Float']['output'];
};

/** EventSeverity enum. */
export enum EventSeverity {
  Critical = 'CRITICAL',
  Error = 'ERROR',
  Info = 'INFO',
  Warning = 'WARNING'
}

/** ExecutiveSummary for executive summary. */
export type ExecutiveSummary = {
  __typename?: 'ExecutiveSummary';
  /** Key achievements */
  keyAchievements: Array<Scalars['String']['output']>;
  /** Key challenges */
  keyChallenges: Array<Scalars['String']['output']>;
  /** Total production */
  totalProduction: Scalars['Float']['output'];
  /** vs Last period */
  vsLastPeriod: Scalars['Float']['output'];
  /** vs Target */
  vsTarget: Scalars['Float']['output'];
};

/** ExitIdentifierType enum. */
export enum ExitIdentifierType {
  /** Guest log ID */
  GuestLogId = 'GUEST_LOG_ID',
  /** QR token */
  QrToken = 'QR_TOKEN',
  /** Vehicle plate */
  VehiclePlate = 'VEHICLE_PLATE'
}

/**
 * Feature represents a specific functionality or capability in the system.
 * Features can be hierarchically organized (e.g., harvest.view, harvest.create).
 * Features are more granular than permissions and compose into capabilities.
 */
export type Feature = {
  __typename?: 'Feature';
  /** Child features under this feature */
  children?: Maybe<Array<Feature>>;
  /** When this feature was created */
  createdAt: Scalars['Time']['output'];
  /** Detailed description of what this feature enables */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name */
  displayName: Scalars['String']['output'];
  /** Unique identifier for the feature */
  id: Scalars['ID']['output'];
  /** Whether this feature is currently active */
  isActive: Scalars['Boolean']['output'];
  /** Whether this is a system feature (cannot be deleted) */
  isSystem: Scalars['Boolean']['output'];
  /** Additional metadata for feature configuration */
  metadata?: Maybe<FeatureMetadata>;
  /** Module/domain this feature belongs to (harvest, gatecheck, user, etc.) */
  module: Scalars['String']['output'];
  /** Feature code/name (e.g., 'harvest.view', 'gatecheck.approve') */
  name: Scalars['String']['output'];
  /** Parent feature object */
  parent?: Maybe<Feature>;
  /** Parent feature ID for hierarchical organization */
  parentId?: Maybe<Scalars['ID']['output']>;
  /** When this feature was last updated */
  updatedAt: Scalars['Time']['output'];
};

/** FeatureCheckInput represents input for checking a single feature. */
export type FeatureCheckInput = {
  /** Feature code to check */
  feature: Scalars['String']['input'];
  /** Scope context for the check */
  scope?: InputMaybe<FeatureScopeInput>;
  /** User ID to check */
  userId: Scalars['ID']['input'];
};

/** FeatureCheckResult represents the result of checking if a user has a feature. */
export type FeatureCheckResult = {
  __typename?: 'FeatureCheckResult';
  /** Reason for granting access */
  accessReason?: Maybe<Scalars['String']['output']>;
  /** When this check was performed */
  checkedAt: Scalars['Time']['output'];
  /** Reason for denying access */
  denialReason?: Maybe<Scalars['String']['output']>;
  /** Feature code being checked */
  feature: Scalars['String']['output'];
  /** Whether the user has access to this feature */
  hasAccess: Scalars['Boolean']['output'];
  /** User ID being checked */
  userId: Scalars['String']['output'];
};

/** FeatureFilterInput represents filters for listing features. */
export type FeatureFilterInput = {
  /** Filter by active status */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by system/custom */
  isSystem?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by module */
  module?: InputMaybe<Scalars['String']['input']>;
  /** Filter by parent feature ID */
  parentId?: InputMaybe<Scalars['ID']['input']>;
  /** Search by name or display name */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** FeatureFlag for feature toggles. */
export type FeatureFlag = {
  __typename?: 'FeatureFlag';
  /** Companies with access (empty = all) */
  companiesWithAccess?: Maybe<Array<Scalars['String']['output']>>;
  /** Description */
  description?: Maybe<Scalars['String']['output']>;
  /** Is enabled */
  enabled: Scalars['Boolean']['output'];
  /** Is beta */
  isBeta: Scalars['Boolean']['output'];
  /** Feature key */
  key: Scalars['String']['output'];
  /** Feature name */
  name: Scalars['String']['output'];
};

/**
 * FeatureHierarchy represents a feature tree for UI rendering.
 * Includes parent-child relationships and depth information.
 */
export type FeatureHierarchy = {
  __typename?: 'FeatureHierarchy';
  /** Child features under this feature */
  children?: Maybe<Array<FeatureHierarchy>>;
  /** Depth in the hierarchy (0 = root) */
  depth: Scalars['Int']['output'];
  /** The feature at this node */
  feature: Feature;
};

/**
 * FeatureMetadata stores additional configuration for features.
 * Includes resource types, actions, scope requirements, and UI hints.
 */
export type FeatureMetadata = {
  __typename?: 'FeatureMetadata';
  /** Actions this feature enables (read, create, update, delete, approve, etc.) */
  actions?: Maybe<Array<Scalars['String']['output']>>;
  /** Conditions that must be met for this feature to be enabled */
  conditions?: Maybe<Scalars['JSON']['output']>;
  /** Required scope level for this feature (company, estate, division, block) */
  requiredScope?: Maybe<Scalars['String']['output']>;
  /** Resource type this feature applies to (harvest_record, gate_check, etc.) */
  resourceType?: Maybe<Scalars['String']['output']>;
  /** UI metadata for frontend rendering (icons, colors, tooltips, etc.) */
  uiMetadata?: Maybe<Scalars['JSON']['output']>;
};

/** FeatureMetadataInput represents input for feature metadata. */
export type FeatureMetadataInput = {
  /** Actions list */
  actions?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Conditions (JSON) */
  conditions?: InputMaybe<Scalars['JSON']['input']>;
  /** Required scope */
  requiredScope?: InputMaybe<Scalars['String']['input']>;
  /** Resource type */
  resourceType?: InputMaybe<Scalars['String']['input']>;
  /** UI metadata (JSON) */
  uiMetadata?: InputMaybe<Scalars['JSON']['input']>;
};

/**
 * FeatureScope represents the context in which a feature is being checked.
 * Enables scoped authorization (e.g., user can harvest.create in Estate A but not Estate B).
 */
export type FeatureScope = {
  __typename?: 'FeatureScope';
  /** UUID of the scoped resource */
  id: Scalars['String']['output'];
  /** Scope type (company, estate, division, block, global) */
  type: Scalars['String']['output'];
};

/** FeatureScopeInput represents input for feature scope. */
export type FeatureScopeInput = {
  /** Scoped resource UUID */
  id: Scalars['String']['input'];
  /** Scope type (company, estate, division, block, global) */
  type: Scalars['String']['input'];
};

/** FeatureStats provides statistics about the feature system. */
export type FeatureStats = {
  __typename?: 'FeatureStats';
  /** Number of active features */
  activeFeatures: Scalars['Int']['output'];
  /** Average feature check latency in milliseconds */
  averageCheckLatencyMs: Scalars['Float']['output'];
  /** Cache hit rate percentage */
  cacheHitRate: Scalars['Float']['output'];
  /** Additional cache statistics */
  cacheStats?: Maybe<Scalars['JSON']['output']>;
  /** Number of custom (user-created) features */
  customFeatures: Scalars['Int']['output'];
  /** Features grouped by module */
  featuresByModule: Scalars['JSON']['output'];
  /** Number of system features (cannot be deleted) */
  systemFeatures: Scalars['Int']['output'];
  /** Total number of features in the system */
  totalFeatures: Scalars['Int']['output'];
  /** Total role-feature assignments */
  totalRoleFeatures: Scalars['Int']['output'];
  /** Total user feature overrides */
  totalUserOverrides: Scalars['Int']['output'];
};

/** FeatureUpdateEvent represents a feature modification event. */
export type FeatureUpdateEvent = {
  __typename?: 'FeatureUpdateEvent';
  /** Event type (CREATED, UPDATED, DELETED) */
  eventType: Scalars['String']['output'];
  /** The feature that was modified */
  feature: Feature;
  /** User who performed the action */
  performedBy: Scalars['ID']['output'];
  /** When the event occurred */
  timestamp: Scalars['Time']['output'];
};

/** FeaturesResponse represents paginated feature list response. */
export type FeaturesResponse = {
  __typename?: 'FeaturesResponse';
  /** List of features */
  features: Array<Feature>;
  /** Whether there are more pages */
  hasNextPage: Scalars['Boolean']['output'];
  /** Pagination information */
  pageInfo: PageInfo;
  /** Total number of features (without pagination) */
  totalCount: Scalars['Int']['output'];
};

/** ForceLogoutResponse represents the result of a force logout operation. */
export type ForceLogoutResponse = {
  __typename?: 'ForceLogoutResponse';
  /** Number of sessions affected */
  count?: Maybe<Scalars['Int']['output']>;
  /** Message describing the result */
  message: Scalars['String']['output'];
  /** Whether the operation was successful */
  success: Scalars['Boolean']['output'];
};

/** GateIntent represents the direction of gate operation. */
export enum GateIntent {
  /** Entry into estate */
  Entry = 'ENTRY',
  /** Exit from estate */
  Exit = 'EXIT'
}

/** GateSecuritySummary represents gate security operation summary. */
export type GateSecuritySummary = {
  __typename?: 'GateSecuritySummary';
  /** Average processing time in minutes */
  averageProcessingTime: Scalars['Float']['output'];
  /** Security incidents reported */
  securityIncidents: Scalars['Int']['output'];
  /** Vehicles processed today */
  vehiclesProcessed: Scalars['Int']['output'];
};

/** GateStats provides security gate check metrics. */
export type GateStats = {
  __typename?: 'GateStats';
  /** Daily gate check count */
  dailyGateChecks: Scalars['Int']['output'];
  /** Pending vehicle approvals */
  pendingApprovals: Scalars['Int']['output'];
  /** Gate security summary */
  securitySummary?: Maybe<GateSecuritySummary>;
};

/** GeneralSettings for general configuration. */
export type GeneralSettings = {
  __typename?: 'GeneralSettings';
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Currency */
  currency: Scalars['String']['output'];
  /** Date format */
  dateFormat: Scalars['String']['output'];
  /** Language */
  language: Scalars['String']['output'];
  /** Timezone */
  timezone: Scalars['String']['output'];
};

/** GeneralSettingsInput for general settings. */
export type GeneralSettingsInput = {
  /** Currency */
  currency?: InputMaybe<Scalars['String']['input']>;
  /** Date format */
  dateFormat?: InputMaybe<Scalars['String']['input']>;
  /** Language */
  language?: InputMaybe<Scalars['String']['input']>;
  /** Timezone */
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type GradingApprovalInput = {
  approved: Scalars['Boolean']['input'];
  rejectionReason?: InputMaybe<Scalars['String']['input']>;
};

export type GradingRecord = {
  __typename?: 'GradingRecord';
  approvedAt?: Maybe<Scalars['Time']['output']>;
  approvedBy?: Maybe<Scalars['ID']['output']>;
  brondolanPercentage: Scalars['Float']['output'];
  createdAt: Scalars['Time']['output'];
  dirtPercentage: Scalars['Float']['output'];
  graderId: Scalars['ID']['output'];
  gradingDate: Scalars['Time']['output'];
  gradingNotes?: Maybe<Scalars['String']['output']>;
  harvestRecordId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isApproved: Scalars['Boolean']['output'];
  looseFruitPercentage: Scalars['Float']['output'];
  maturityLevel: Scalars['String']['output'];
  qualityScore: Scalars['Int']['output'];
  rejectionReason?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Time']['output'];
};

/** GrantUserFeatureInput represents input for granting a feature to a user. */
export type GrantUserFeatureInput = {
  /** When this grant becomes effective */
  effectiveFrom?: InputMaybe<Scalars['Time']['input']>;
  /** When this grant expires */
  expiresAt?: InputMaybe<Scalars['Time']['input']>;
  /** Feature code to grant */
  feature: Scalars['String']['input'];
  /** Reason for granting */
  reason?: InputMaybe<Scalars['String']['input']>;
  /** Scope for this grant (optional) */
  scope?: InputMaybe<FeatureScopeInput>;
  /** User ID to grant feature to */
  userId: Scalars['ID']['input'];
};

/** GuestLogStatus represents the direction of a guest visit (raw from mobile). */
export enum GuestLogStatus {
  /** Guest entry into estate */
  Entry = 'ENTRY',
  /** Guest exit from estate */
  Exit = 'EXIT'
}

/** GuestRegistrationResult for registration operation. */
export type GuestRegistrationResult = {
  __typename?: 'GuestRegistrationResult';
  /** Errors */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Created guest log */
  guestLog?: Maybe<SatpamGuestLog>;
  /** Message */
  message: Scalars['String']['output'];
  /** Generated QR token */
  qrToken?: Maybe<SatpamQrToken>;
  /** Success status */
  success: Scalars['Boolean']['output'];
};

/** HarvestActivity represents active harvest activity. */
export type HarvestActivity = {
  __typename?: 'HarvestActivity';
  /** Block name */
  blockName: Scalars['String']['output'];
  /** Current TBS count */
  currentTbs: Scalars['Int']['output'];
  /** Current weight */
  currentWeight: Scalars['Float']['output'];
  /** Division name */
  divisionName: Scalars['String']['output'];
  /** Activity ID */
  id: Scalars['ID']['output'];
  /** Mandor name */
  mandorName: Scalars['String']['output'];
  /** Start time */
  startTime: Scalars['Time']['output'];
  /** Status */
  status: Scalars['String']['output'];
  /** Workers count */
  workersCount: Scalars['Int']['output'];
};

/** HarvestPhoto represents a photo attached to harvest. */
export type HarvestPhoto = {
  __typename?: 'HarvestPhoto';
  /** Photo ID */
  id: Scalars['ID']['output'];
  /** Local path */
  localPath?: Maybe<Scalars['String']['output']>;
  /** Server URL */
  serverUrl?: Maybe<Scalars['String']['output']>;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Taken at */
  takenAt: Scalars['Time']['output'];
};

/** HarvestRecord represents a harvest entry made by Mandor. */
export type HarvestRecord = {
  __typename?: 'HarvestRecord';
  approvedAt?: Maybe<Scalars['Time']['output']>;
  approvedBy?: Maybe<Scalars['String']['output']>;
  beratTbs: Scalars['Float']['output'];
  block: Block;
  blockId: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  jjgBusukAbnormal: Scalars['Int']['output'];
  jjgLewatMatang: Scalars['Int']['output'];
  jjgMatang: Scalars['Int']['output'];
  jjgMentah: Scalars['Int']['output'];
  jjgTangkaiPanjang: Scalars['Int']['output'];
  jumlahJanjang: Scalars['Int']['output'];
  karyawan: Scalars['String']['output'];
  localId?: Maybe<Scalars['String']['output']>;
  mandor: User;
  mandorId: Scalars['String']['output'];
  nik?: Maybe<Scalars['String']['output']>;
  photoUrl?: Maybe<Scalars['String']['output']>;
  rejectedReason?: Maybe<Scalars['String']['output']>;
  status: HarvestStatus;
  tanggal: Scalars['Time']['output'];
  totalBrondolan: Scalars['Float']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** Input for individual harvest record sync. */
export type HarvestRecordSyncInput = {
  /** Asisten/Supervisor ID */
  asistenId?: InputMaybe<Scalars['String']['input']>;
  /** Total Weight (kg) */
  beratTbs: Scalars['Float']['input'];
  /** Block ID */
  blockId: Scalars['String']['input'];
  /** Company ID */
  companyId?: InputMaybe<Scalars['String']['input']>;
  /** Division ID */
  divisionId?: InputMaybe<Scalars['String']['input']>;
  /** Estate ID */
  estateId?: InputMaybe<Scalars['String']['input']>;
  /** Jumlah janjang busuk/abnormal */
  jjgBusukAbnormal?: InputMaybe<Scalars['Int']['input']>;
  /** Jumlah janjang lewat matang */
  jjgLewatMatang?: InputMaybe<Scalars['Int']['input']>;
  /** Jumlah janjang matang */
  jjgMatang?: InputMaybe<Scalars['Int']['input']>;
  /** Jumlah janjang mentah */
  jjgMentah?: InputMaybe<Scalars['Int']['input']>;
  /** Jumlah janjang bertangkai panjang */
  jjgTangkaiPanjang?: InputMaybe<Scalars['Int']['input']>;
  /** Total Bunches (Quantity) */
  jumlahJanjang: Scalars['Int']['input'];
  /** Employee ID */
  karyawanId: Scalars['String']['input'];
  /** Last local update timestamp */
  lastUpdated: Scalars['Time']['input'];
  /** GPS latitude coordinate */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** Local record ID from mobile device */
  localId: Scalars['String']['input'];
  /** Local version number */
  localVersion: Scalars['Int']['input'];
  /** GPS longitude coordinate */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** Mandor User ID */
  mandorId: Scalars['String']['input'];
  /** Employee NIK */
  nik: Scalars['String']['input'];
  /** Optional notes or remarks */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Photo URL or path */
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  /** Server record ID (if exists) */
  serverId?: InputMaybe<Scalars['String']['input']>;
  /** Status */
  status: HarvestStatus;
  /** Date of harvest */
  tanggal: Scalars['Time']['input'];
  /** Total brondolan */
  totalBrondolan?: InputMaybe<Scalars['Float']['input']>;
};

/** Harvest status enum representing approval workflow. */
export enum HarvestStatus {
  /** Approved by asisten */
  Approved = 'APPROVED',
  /** Corrections requested */
  CorrectionRequested = 'CORRECTION_REQUESTED',
  /** Draft - not yet submitted */
  Draft = 'DRAFT',
  /** Pending approval */
  Pending = 'PENDING',
  /** Rejected by asisten */
  Rejected = 'REJECTED'
}

/** Input for syncing harvest records from mobile device. */
export type HarvestSyncInput = {
  /** Batch identifier for grouping */
  batchId?: InputMaybe<Scalars['String']['input']>;
  /** Sync timestamp from mobile device */
  clientTimestamp: Scalars['Time']['input'];
  /** Device performing the sync */
  deviceId: Scalars['String']['input'];
  /** Records to sync */
  records: Array<HarvestRecordSyncInput>;
};

/** Herbisida (Herbicide) usage record. */
export type HerbisidaUsage = {
  __typename?: 'HerbisidaUsage';
  createdAt: Scalars['Time']['output'];
  hargaPerLiter: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  jenisHerbisida: Scalars['String']['output'];
  jumlahLiter: Scalars['Float']['output'];
  perawatanRecord: PerawatanRecord;
  perawatanRecordId: Scalars['String']['output'];
  totalBiaya: Scalars['Float']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** JWTTokenFilterInput allows filtering JWT token records. */
export type JwtTokenFilterInput = {
  /** Filter only currently active tokens */
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by device ID */
  deviceId?: InputMaybe<Scalars['String']['input']>;
  /** Filter by revoked status */
  isRevoked?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by token type */
  tokenType?: InputMaybe<Scalars['String']['input']>;
  /** Filter by user ID */
  userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** JWTTokenRecord represents a token record stored in jwt_tokens table. */
export type JwtTokenRecord = {
  __typename?: 'JWTTokenRecord';
  /** Record creation time */
  createdAt: Scalars['Time']['output'];
  /** Device identifier */
  deviceId: Scalars['String']['output'];
  /** Access token expiry */
  expiresAt: Scalars['Time']['output'];
  /** Token record UUID */
  id: Scalars['UUID']['output'];
  /** Whether token is revoked */
  isRevoked: Scalars['Boolean']['output'];
  /** Last usage timestamp */
  lastUsedAt?: Maybe<Scalars['Time']['output']>;
  /** Offline token expiry (if available) */
  offlineExpiresAt?: Maybe<Scalars['Time']['output']>;
  /** Refresh token expiry (if available) */
  refreshExpiresAt?: Maybe<Scalars['Time']['output']>;
  /** Time token was revoked */
  revokedAt?: Maybe<Scalars['Time']['output']>;
  /** Token type (JWT, REFRESH, OFFLINE) */
  tokenType: Scalars['String']['output'];
  /** Record update time */
  updatedAt: Scalars['Time']['output'];
  /** User who owns the token */
  user: User;
  /** User ID */
  userId: Scalars['UUID']['output'];
};

/** Maintenance activity types. */
export enum JenisPerawatan {
  Lainnya = 'LAINNYA',
  Pemangkasan = 'PEMANGKASAN',
  PembersihanGulma = 'PEMBERSIHAN_GULMA',
  PembersihanParit = 'PEMBERSIHAN_PARIT',
  Pemupukan = 'PEMUPUKAN',
  PenyemprotanHerbisida = 'PENYEMPROTAN_HERBISIDA',
  PerawatanJalan = 'PERAWATAN_JALAN'
}

/** LogoutAllDevicesResponse represents the result of a multi-device logout operation. */
export type LogoutAllDevicesResponse = {
  __typename?: 'LogoutAllDevicesResponse';
  /** Audit log identifier for tracking */
  auditLogId?: Maybe<Scalars['String']['output']>;
  /** Result message */
  message: Scalars['String']['output'];
  /** Server timestamp of the operation */
  serverTimestamp: Scalars['Time']['output'];
  /** Number of sessions successfully terminated */
  sessionsTerminated: Scalars['Int']['output'];
  /** Whether the operation was successful */
  success: Scalars['Boolean']['output'];
};

/** LogoutType represents the reason/context for a logout operation. */
export enum LogoutType {
  /** Administrator forced logout */
  AdminForced = 'ADMIN_FORCED',
  /** Device reported as compromised */
  DeviceCompromised = 'DEVICE_COMPROMISED',
  /** Emergency system-wide logout */
  Emergency = 'EMERGENCY',
  /** Security violation detected */
  SecurityViolation = 'SECURITY_VIOLATION',
  /** Session expired due to inactivity */
  SessionTimeout = 'SESSION_TIMEOUT',
  /** Access token expired */
  TokenExpired = 'TOKEN_EXPIRED',
  /** User manually initiated logout */
  UserInitiated = 'USER_INITIATED'
}

/** ManagerActionItem represents a quick action for the manager. */
export type ManagerActionItem = {
  __typename?: 'ManagerActionItem';
  /** Creation timestamp */
  createdAt: Scalars['Time']['output'];
  /** Action description */
  description?: Maybe<Scalars['String']['output']>;
  /** Due date/time */
  dueAt?: Maybe<Scalars['Time']['output']>;
  /** Related entity ID */
  entityId?: Maybe<Scalars['String']['output']>;
  /** Action identifier */
  id: Scalars['ID']['output'];
  /** Priority level */
  priority: ActionPriority;
  /** Action title */
  title: Scalars['String']['output'];
  /** Action type */
  type: ManagerActionType;
};

/** ManagerActionType enum for different action types. */
export enum ManagerActionType {
  /** Approve overtime request */
  ApproveOvertime = 'APPROVE_OVERTIME',
  /** Check underperforming division */
  CheckUnderperforming = 'CHECK_UNDERPERFORMING',
  /** Review harvest report */
  ReviewHarvestReport = 'REVIEW_HARVEST_REPORT',
  /** View system alert */
  ViewAlert = 'VIEW_ALERT',
  /** View pending approvals */
  ViewPendingApprovals = 'VIEW_PENDING_APPROVALS'
}

/** ManagerAnalyticsData represents analytics data for manager dashboard. */
export type ManagerAnalyticsData = {
  __typename?: 'ManagerAnalyticsData';
  /** Comparison metrics */
  comparison: ComparisonMetrics;
  /** Division performance breakdown */
  divisionPerformance: Array<DivisionPerformanceData>;
  /** Efficiency metrics */
  efficiencyMetrics: EfficiencyMetrics;
  /** Selected period */
  period: AnalyticsPeriod;
  /** Production trend data */
  productionTrend: ProductionTrendData;
  /** Quality analysis */
  qualityAnalysis: QualityAnalysisData;
};

/** ManagerDashboardData represents aggregated dashboard data for Manager. */
export type ManagerDashboardData = {
  __typename?: 'ManagerDashboardData';
  /** Quick action items */
  actionItems: Array<ManagerActionItem>;
  /** Estates assigned to this manager */
  estates: Array<Estate>;
  /** Performance metrics */
  stats: ManagerDashboardStats;
  /** Team summary */
  teamSummary: ManagerTeamSummary;
  /** Today's highlights */
  todayHighlights: ManagerTodayHighlights;
  /** Basic user information */
  user: User;
};

/** ManagerDashboardStats represents key performance indicators for manager dashboard. */
export type ManagerDashboardStats = {
  __typename?: 'ManagerDashboardStats';
  /** Active harvest count today */
  activeHarvests: Scalars['Int']['output'];
  /** This month's production (tons) */
  monthlyProduction: Scalars['Float']['output'];
  /** Monthly target (tons) */
  monthlyTarget: Scalars['Float']['output'];
  /** Pending approvals count */
  pendingApprovals: Scalars['Int']['output'];
  /** Target achievement percentage */
  targetAchievement: Scalars['Float']['output'];
  /** Today's production (tons) */
  todayProduction: Scalars['Float']['output'];
  /** Total blocks across divisions */
  totalBlocks: Scalars['Int']['output'];
  /** Total divisions across estates */
  totalDivisions: Scalars['Int']['output'];
  /** Total active employees */
  totalEmployees: Scalars['Int']['output'];
  /** Total estates managed */
  totalEstates: Scalars['Int']['output'];
  /** This week's production (tons) */
  weeklyProduction: Scalars['Float']['output'];
};

/** ManagerEvent represents a notable event for the manager. */
export type ManagerEvent = {
  __typename?: 'ManagerEvent';
  /** Related entity ID */
  entityId?: Maybe<Scalars['String']['output']>;
  /** Related entity */
  entityType?: Maybe<Scalars['String']['output']>;
  /** Event ID */
  id: Scalars['ID']['output'];
  /** Event message */
  message: Scalars['String']['output'];
  /** Timestamp */
  occurredAt: Scalars['Time']['output'];
  /** Severity */
  severity: EventSeverity;
  /** Event type */
  type: Scalars['String']['output'];
};

/** ManagerMonitorData represents real-time monitoring data for manager. */
export type ManagerMonitorData = {
  __typename?: 'ManagerMonitorData';
  /** Active harvest activities */
  activeActivities: Array<HarvestActivity>;
  /** Division monitoring summaries */
  divisionMonitors: Array<DivisionMonitorSummary>;
  /** Estate monitoring summaries */
  estateMonitors: Array<EstateMonitorSummary>;
  /** Last updated timestamp */
  lastUpdated: Scalars['Time']['output'];
  /** Overall status */
  overallStatus: MonitorStatus;
  /** Real-time statistics */
  realtimeStats: RealtimeStats;
};

/** ManagerProfile provides estate-level management access. */
export type ManagerProfile = {
  __typename?: 'ManagerProfile';
  /** Company this manager belongs to */
  company: Company;
  /** Estates assigned to this manager */
  estates: Array<Estate>;
  /** Manager-specific performance metrics */
  managerStats?: Maybe<ManagerStats>;
  /** Basic user information */
  user: User;
};

/** ManagerStats provides estate manager performance metrics. */
export type ManagerStats = {
  __typename?: 'ManagerStats';
  /** Estate performance summary */
  estatePerformance?: Maybe<EstatePerformance>;
  /** Number of estates managed */
  estatesManaged: Scalars['Int']['output'];
  /** Total divisions across managed estates */
  totalDivisions: Scalars['Int']['output'];
};

/** ManagerTeamSummary represents team performance summary. */
export type ManagerTeamSummary = {
  __typename?: 'ManagerTeamSummary';
  /** Active mandors today */
  activeMandorsToday: Scalars['Int']['output'];
  /** Mandors needing attention */
  needsAttention: Array<TeamMemberPerformance>;
  /** Top performing mandors */
  topPerformers: Array<TeamMemberPerformance>;
  /** Total asistens */
  totalAsistens: Scalars['Int']['output'];
  /** Total mandors */
  totalMandors: Scalars['Int']['output'];
};

/** ManagerTodayHighlights represents today's notable events. */
export type ManagerTodayHighlights = {
  __typename?: 'ManagerTodayHighlights';
  /** Approved today */
  approvedToday: Scalars['Int']['output'];
  /** Notable events */
  events: Array<ManagerEvent>;
  /** Pending approval count */
  pendingApprovals: Scalars['Int']['output'];
  /** Production vs yesterday */
  productionVsYesterday: Scalars['Float']['output'];
  /** Rejected today */
  rejectedToday: Scalars['Int']['output'];
  /** Total harvests submitted today */
  totalHarvestsToday: Scalars['Int']['output'];
};

/** MandorActivity represents a recent mandor activity. */
export type MandorActivity = {
  __typename?: 'MandorActivity';
  /** Block name */
  blockName?: Maybe<Scalars['String']['output']>;
  /** Description */
  description: Scalars['String']['output'];
  /** Related harvest ID */
  harvestId?: Maybe<Scalars['String']['output']>;
  /** Activity ID */
  id: Scalars['ID']['output'];
  /** Status */
  status: Scalars['String']['output'];
  /** Timestamp */
  timestamp: Scalars['Time']['output'];
  /** Activity title */
  title: Scalars['String']['output'];
  /** Activity type */
  type: MandorActivityType;
};

/** MandorActivityType enum. */
export enum MandorActivityType {
  /** Harvest approved */
  HarvestApproved = 'HARVEST_APPROVED',
  /** Harvest created */
  HarvestCreated = 'HARVEST_CREATED',
  /** Harvest rejected */
  HarvestRejected = 'HARVEST_REJECTED',
  /** Harvest synced */
  HarvestSynced = 'HARVEST_SYNCED',
  /** Photo uploaded */
  PhotoUploaded = 'PHOTO_UPLOADED'
}

/** MandorDashboardData represents aggregated dashboard data for Mandor. */
export type MandorDashboardData = {
  __typename?: 'MandorDashboardData';
  /** Divisions assigned to this mandor */
  divisions: Array<Division>;
  /** Pending submissions */
  pendingSubmissions: Array<MandorHarvestSummary>;
  /** Recent activities */
  recentActivities: Array<MandorActivity>;
  /** Dashboard statistics */
  stats: MandorDashboardStats;
  /** Sync status */
  syncStatus: MandorSyncStatus;
  /** Today's work summary */
  todayWork: MandorTodayWork;
  /** Basic user information */
  user: User;
};

/** MandorDashboardStats represents key metrics for mandor dashboard. */
export type MandorDashboardStats = {
  __typename?: 'MandorDashboardStats';
  /** Active workers today */
  activeWorkers: Scalars['Int']['output'];
  /** Approved today */
  approvedToday: Scalars['Int']['output'];
  /** Blocks worked today */
  blocksWorkedToday: Scalars['Int']['output'];
  /** Pending approval count */
  pendingCount: Scalars['Int']['output'];
  /** Rejected today */
  rejectedToday: Scalars['Int']['output'];
  /** Today's harvest count */
  todayHarvestCount: Scalars['Int']['output'];
  /** Today's TBS count */
  todayTbsCount: Scalars['Int']['output'];
  /** Today's total weight (kg) */
  todayWeight: Scalars['Float']['output'];
  /** Weekly TBS total */
  weeklyTbs: Scalars['Int']['output'];
  /** Weekly weight total */
  weeklyWeight: Scalars['Float']['output'];
};

/** MandorHarvestRecord represents a full harvest record for mandor. */
export type MandorHarvestRecord = {
  __typename?: 'MandorHarvestRecord';
  /** Approval date */
  approvedAt?: Maybe<Scalars['Time']['output']>;
  /** Approved by ID */
  approvedBy?: Maybe<Scalars['String']['output']>;
  /** Approved by name */
  approvedByName?: Maybe<Scalars['String']['output']>;
  /** Asisten ID */
  asistenId?: Maybe<Scalars['String']['output']>;
  /** Weight (kg) */
  beratTbs: Scalars['Float']['output'];
  /** Block ID */
  blockId: Scalars['String']['output'];
  /** Block name */
  blockName: Scalars['String']['output'];
  /** Company ID */
  companyId?: Maybe<Scalars['String']['output']>;
  /** GPS coordinates */
  coordinates?: Maybe<Coordinates>;
  /** Created at */
  createdAt: Scalars['Time']['output'];
  /** Division ID */
  divisionId: Scalars['String']['output'];
  /** Division name */
  divisionName: Scalars['String']['output'];
  /** Estate ID */
  estateId: Scalars['String']['output'];
  /** Estate name */
  estateName: Scalars['String']['output'];
  /** Server ID */
  id: Scalars['ID']['output'];
  /** Jumlah janjang busuk/abnormal */
  jjgBusukAbnormal: Scalars['Int']['output'];
  /** Jumlah janjang lewat matang */
  jjgLewatMatang: Scalars['Int']['output'];
  /** Jumlah janjang matang */
  jjgMatang: Scalars['Int']['output'];
  /** Jumlah janjang mentah */
  jjgMentah: Scalars['Int']['output'];
  /** Jumlah janjang bertangkai panjang */
  jjgTangkaiPanjang: Scalars['Int']['output'];
  /** TBS count */
  jumlahJanjang: Scalars['Int']['output'];
  /** Employees involved */
  karyawan: Scalars['String']['output'];
  /** Local ID (from device) */
  localId?: Maybe<Scalars['String']['output']>;
  /** Manager ID */
  managerId?: Maybe<Scalars['String']['output']>;
  /** Mandor who created */
  mandorId: Scalars['String']['output'];
  /** Mandor name */
  mandorName: Scalars['String']['output'];
  /** Notes */
  notes?: Maybe<Scalars['String']['output']>;
  /** Panen number */
  panenNumber?: Maybe<Scalars['String']['output']>;
  /** Photos */
  photos?: Maybe<Array<HarvestPhoto>>;
  /** Rejection reason */
  rejectedReason?: Maybe<Scalars['String']['output']>;
  /** Server version */
  serverVersion: Scalars['Int']['output'];
  /** Status */
  status: HarvestStatus;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Harvest date */
  tanggal: Scalars['Time']['output'];
  /** Total brondolan */
  totalBrondolan: Scalars['Float']['output'];
  /** Updated at */
  updatedAt: Scalars['Time']['output'];
};

/** MandorHarvestResult represents result of harvest operation. */
export type MandorHarvestResult = {
  __typename?: 'MandorHarvestResult';
  /** Errors if any */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Created/updated harvest record */
  harvestRecord?: Maybe<MandorHarvestRecord>;
  /** Message */
  message: Scalars['String']['output'];
  /** Server ID assigned */
  serverId?: Maybe<Scalars['String']['output']>;
  /** Server version */
  serverVersion?: Maybe<Scalars['Int']['output']>;
  /** Success status */
  success: Scalars['Boolean']['output'];
};

/** MandorHarvestSummary represents a harvest summary item. */
export type MandorHarvestSummary = {
  __typename?: 'MandorHarvestSummary';
  /** Block name */
  blockName: Scalars['String']['output'];
  /** Division name */
  divisionName: Scalars['String']['output'];
  /** Harvest date */
  harvestDate: Scalars['Time']['output'];
  /** Has photo */
  hasPhoto: Scalars['Boolean']['output'];
  /** Harvest ID */
  id: Scalars['ID']['output'];
  /** Status */
  status: HarvestStatus;
  /** Submitted at */
  submittedAt: Scalars['Time']['output'];
  /** TBS count */
  tbsCount: Scalars['Int']['output'];
  /** Weight (kg) */
  weight: Scalars['Float']['output'];
};

/** MandorHarvestSyncData for sync payload. */
export type MandorHarvestSyncData = {
  /** Weight */
  beratTbs: Scalars['Float']['input'];
  /** Block ID */
  blockId: Scalars['String']['input'];
  /** TBS count */
  jumlahJanjang: Scalars['Int']['input'];
  /** Employees */
  karyawan: Scalars['String']['input'];
  /** GPS latitude */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** GPS longitude */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Status */
  status: HarvestStatus;
  /** Harvest date */
  tanggal: Scalars['Time']['input'];
};

/** MandorHarvestSyncRecord for individual sync item. */
export type MandorHarvestSyncRecord = {
  /** Harvest data */
  data: MandorHarvestSyncData;
  /** Last updated locally */
  lastUpdated: Scalars['Time']['input'];
  /** Local ID */
  localId: Scalars['String']['input'];
  /** Local version */
  localVersion: Scalars['Int']['input'];
  /** Operation type */
  operation: SyncOperation;
  /** Photo IDs to sync */
  photoIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Server ID (if exists) */
  serverId?: InputMaybe<Scalars['String']['input']>;
};

/** MandorHistoryFilter for filtering harvest history. */
export type MandorHistoryFilter = {
  /** Filter by block */
  blockId?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by date from */
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  /** Filter by date to */
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  /** Filter by division */
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  /** Page */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Page size */
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  /** Search query */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Sort by */
  sortBy?: InputMaybe<MandorHistorySortField>;
  /** Sort direction */
  sortDirection?: InputMaybe<SortDirection>;
  /** Filter by status */
  status?: InputMaybe<HarvestStatus>;
};

/** MandorHistoryResponse represents paginated history. */
export type MandorHistoryResponse = {
  __typename?: 'MandorHistoryResponse';
  /** Has more */
  hasMore: Scalars['Boolean']['output'];
  /** History items */
  items: Array<MandorHarvestRecord>;
  /** Summary stats */
  summary: MandorHistorySummary;
  /** Total count */
  totalCount: Scalars['Int']['output'];
};

/** MandorHistorySortField enum. */
export enum MandorHistorySortField {
  CreatedAt = 'CREATED_AT',
  HarvestDate = 'HARVEST_DATE',
  Status = 'STATUS',
  TbsCount = 'TBS_COUNT',
  Weight = 'WEIGHT'
}

/** MandorHistorySummary for history page. */
export type MandorHistorySummary = {
  __typename?: 'MandorHistorySummary';
  /** Approved count */
  approved: Scalars['Int']['output'];
  /** Pending count */
  pending: Scalars['Int']['output'];
  /** Rejected count */
  rejected: Scalars['Int']['output'];
  /** Total harvests */
  totalHarvests: Scalars['Int']['output'];
  /** Total TBS */
  totalTbs: Scalars['Int']['output'];
  /** Total weight */
  totalWeight: Scalars['Float']['output'];
};

/** MandorPendingSyncData represents sync data returned from server. */
export type MandorPendingSyncData = {
  __typename?: 'MandorPendingSyncData';
  /** Weight */
  beratTbs: Scalars['Float']['output'];
  /** Block ID */
  blockId: Scalars['String']['output'];
  /** TBS count */
  jumlahJanjang: Scalars['Int']['output'];
  /** Employees */
  karyawan: Scalars['String']['output'];
  /** GPS latitude */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** GPS longitude */
  longitude?: Maybe<Scalars['Float']['output']>;
  /** Notes */
  notes?: Maybe<Scalars['String']['output']>;
  /** Status */
  status: HarvestStatus;
  /** Harvest date */
  tanggal: Scalars['Time']['output'];
};

/** MandorPendingSyncItem represents a pending sync item returned from server. */
export type MandorPendingSyncItem = {
  __typename?: 'MandorPendingSyncItem';
  /** Harvest data */
  data?: Maybe<MandorPendingSyncData>;
  /** Last updated locally */
  lastUpdated: Scalars['Time']['output'];
  /** Local ID */
  localId: Scalars['String']['output'];
  /** Local version */
  localVersion: Scalars['Int']['output'];
  /** Operation type */
  operation: SyncOperation;
  /** Photo IDs to sync */
  photoIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Server ID (if exists) */
  serverId?: Maybe<Scalars['String']['output']>;
};

/** MandorPhotoSyncInput for syncing photos. */
export type MandorPhotoSyncInput = {
  /** Batch ID */
  batchId?: InputMaybe<Scalars['String']['input']>;
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Photos to sync */
  photos: Array<MandorPhotoSyncRecord>;
};

/** MandorPhotoSyncRecord for individual photo. */
export type MandorPhotoSyncRecord = {
  /** File hash */
  fileHash: Scalars['String']['input'];
  /** File name */
  fileName: Scalars['String']['input'];
  /** File size */
  fileSize: Scalars['Int']['input'];
  /** Related harvest ID */
  harvestId: Scalars['String']['input'];
  /** Local photo ID */
  localId: Scalars['String']['input'];
  /** Local path */
  localPath: Scalars['String']['input'];
  /** Photo data (base64) */
  photoData: Scalars['String']['input'];
  /** Taken at */
  takenAt: Scalars['Time']['input'];
};

/** MandorPhotoSyncResult for photo sync result. */
export type MandorPhotoSyncResult = {
  __typename?: 'MandorPhotoSyncResult';
  /** Errors */
  errors: Array<PhotoUploadError>;
  /** Failed uploads */
  failedUploads: Scalars['Int']['output'];
  /** Photos processed */
  photosProcessed: Scalars['Int']['output'];
  /** Successful uploads */
  successfulUploads: Scalars['Int']['output'];
  /** Synced at */
  syncedAt: Scalars['Time']['output'];
  /** Total bytes uploaded */
  totalBytesUploaded: Scalars['Int']['output'];
};

/** MandorProfile provides field-level supervisor access. */
export type MandorProfile = {
  __typename?: 'MandorProfile';
  /** Company this supervisor belongs to */
  company: Company;
  /** Divisions assigned to this supervisor */
  divisions: Array<Division>;
  /** Estate this supervisor works in */
  estate: Estate;
  /** Supervisor-specific work metrics */
  mandorStats?: Maybe<MandorStats>;
  /** Basic user information */
  user: User;
};

/** MandorStats provides supervisor work metrics. */
export type MandorStats = {
  __typename?: 'MandorStats';
  /** Daily harvest records created */
  dailyHarvestRecords: Scalars['Int']['output'];
  /** Number of divisions supervised */
  divisionsSupervised: Scalars['Int']['output'];
  /** Field work summary */
  fieldWorkSummary?: Maybe<MandorWorkload>;
};

/** MandorStatus represents mandor activity status. */
export type MandorStatus = {
  __typename?: 'MandorStatus';
  /** Approved submissions */
  approvedSubmissions: Scalars['Int']['output'];
  /** Current block */
  currentBlock?: Maybe<Scalars['String']['output']>;
  /** Online/offline status */
  isOnline: Scalars['Boolean']['output'];
  /** Last seen timestamp */
  lastSeen: Scalars['Time']['output'];
  /** Mandor user ID */
  mandorId: Scalars['ID']['output'];
  /** Mandor name */
  mandorName: Scalars['String']['output'];
  /** Pending submissions */
  pendingSubmissions: Scalars['Int']['output'];
  /** Today's submissions */
  todaySubmissions: Scalars['Int']['output'];
  /** Today's TBS */
  todayTbs: Scalars['Int']['output'];
  /** Today's weight */
  todayWeight: Scalars['Float']['output'];
};

/** MandorSyncInput for syncing harvest records. */
export type MandorSyncInput = {
  /** Batch ID */
  batchId?: InputMaybe<Scalars['String']['input']>;
  /** Client timestamp */
  clientTimestamp: Scalars['Time']['input'];
  /** Conflict resolution strategy */
  conflictResolution?: InputMaybe<ConflictResolution>;
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Harvests to sync */
  harvests: Array<MandorHarvestSyncRecord>;
};

/** MandorSyncItemResult for individual sync item result. */
export type MandorSyncItemResult = {
  __typename?: 'MandorSyncItemResult';
  /** Conflict data */
  conflictData?: Maybe<Scalars['String']['output']>;
  /** Error message */
  error?: Maybe<Scalars['String']['output']>;
  /** Has conflict */
  hasConflict: Scalars['Boolean']['output'];
  /** Local ID */
  localId: Scalars['String']['output'];
  /** Server ID (assigned or existing) */
  serverId?: Maybe<Scalars['String']['output']>;
  /** Server version */
  serverVersion?: Maybe<Scalars['Int']['output']>;
  /** Success */
  success: Scalars['Boolean']['output'];
};

/** MandorSyncResult for sync operation result. */
export type MandorSyncResult = {
  __typename?: 'MandorSyncResult';
  /** Conflicts detected */
  conflictsDetected: Scalars['Int']['output'];
  /** Message */
  message: Scalars['String']['output'];
  /** Records failed */
  recordsFailed: Scalars['Int']['output'];
  /** Records processed */
  recordsProcessed: Scalars['Int']['output'];
  /** Records successful */
  recordsSuccessful: Scalars['Int']['output'];
  /** Sync results per record */
  results: Array<MandorSyncItemResult>;
  /** Server timestamp */
  serverTimestamp: Scalars['Time']['output'];
  /** Success status */
  success: Scalars['Boolean']['output'];
  /** Transaction ID */
  transactionId: Scalars['String']['output'];
};

/** MandorSyncStatus represents offline sync status. */
export type MandorSyncStatus = {
  __typename?: 'MandorSyncStatus';
  /** Failed sync count */
  failedSyncCount: Scalars['Int']['output'];
  /** Is online */
  isOnline: Scalars['Boolean']['output'];
  /** Last sync timestamp */
  lastSyncAt?: Maybe<Scalars['Time']['output']>;
  /** Last sync result */
  lastSyncResult?: Maybe<Scalars['String']['output']>;
  /** Pending sync count */
  pendingSyncCount: Scalars['Int']['output'];
  /** Photos pending upload */
  photosPendingUpload: Scalars['Int']['output'];
};

/** MandorTodayWork represents today's work summary. */
export type MandorTodayWork = {
  __typename?: 'MandorTodayWork';
  /** Blocks completed */
  blocksCompleted: Scalars['Int']['output'];
  /** Current block */
  currentBlock?: Maybe<Scalars['String']['output']>;
  /** Harvests created */
  harvestsCreated: Scalars['Int']['output'];
  /** Work start time */
  startTime?: Maybe<Scalars['Time']['output']>;
  /** Total TBS */
  totalTbs: Scalars['Int']['output'];
  /** Total weight */
  totalWeight: Scalars['Float']['output'];
  /** Workers involved */
  workersInvolved: Scalars['Int']['output'];
};

/** MandorWorkload represents supervisor field work metrics. */
export type MandorWorkload = {
  __typename?: 'MandorWorkload';
  /** Blocks supervised */
  blocksSupervised: Scalars['Int']['output'];
  /** Quality score average */
  qualityScoreAverage: Scalars['Float']['output'];
  /** Harvest records created today */
  recordsCreated: Scalars['Int']['output'];
};

/**
 * MobileLoginInput represents simplified input for mobile authentication.
 * Automatically detects user role and provides role-appropriate response.
 */
export type MobileLoginInput = {
  /** Device fingerprint for security validation (optional, auto-generated if not provided) */
  deviceFingerprint?: InputMaybe<Scalars['String']['input']>;
  /** Device ID for binding (optional, auto-generated if not provided) */
  deviceId?: InputMaybe<Scalars['String']['input']>;
  /** Username or email address for authentication */
  identifier: Scalars['String']['input'];
  /** User password */
  password: Scalars['String']['input'];
  /** Client platform (ANDROID, IOS) */
  platform: PlatformType;
};

/** MonitorStatus represents the monitoring status. */
export enum MonitorStatus {
  /** Alert - attention required */
  Alert = 'ALERT',
  /** Critical - immediate action required */
  Critical = 'CRITICAL',
  /** All systems normal */
  Normal = 'NORMAL',
  /** Offline or unavailable */
  Offline = 'OFFLINE',
  /** Warning - attention needed */
  Warning = 'WARNING'
}

export type Mutation = {
  __typename?: 'Mutation';
  /** Acknowledge system alert */
  acknowledgeAlert: SystemAlert;
  /** Activate company */
  activateCompany: CompanyManagementResult;
  /** Activate user */
  activateUser: UserManagementResult;
  /** Add vehicle to queue */
  addToWeighingQueue: WeighingQueueItem;
  /** Reset user password (admin) */
  adminResetUserPassword: UserManagementResult;
  approveGrading: GradingRecord;
  /** Approve single harvest record */
  approveHarvest: ApproveHarvestResult;
  approveHarvestRecord: HarvestRecord;
  /**
   * Assign features to a role.
   * Only SUPER_ADMIN can assign role features.
   */
  assignRoleFeatures: Array<RoleFeature>;
  /** Assign permissions to a role */
  assignRolePermissions: Role;
  /** Assign permission override to a user */
  assignUserPermission: UserPermissionAssignment;
  /** Batch assign user permissions */
  assignUserPermissions: Array<UserPermissionAssignment>;
  /** Assign Area Manager to multiple companies (Super Admin only) */
  assignUserToCompany: UserCompanyAssignment;
  /** Assign Asisten to multiple divisions */
  assignUserToDivision: UserDivisionAssignment;
  /** Assign user to division */
  assignUserToDivisionAdmin: UserManagementResult;
  /** Assign Manager to multiple estates */
  assignUserToEstate: UserEstateAssignment;
  /** Assign user to estate */
  assignUserToEstateAdmin: UserManagementResult;
  /** Batch approve/reject harvest records */
  batchApproval: BatchApprovalResult;
  /** Bind device for trusted authentication */
  bindDevice: DeviceResponse;
  /**
   * Bulk grant features to multiple users.
   * Useful for batch operations.
   * Requires SUPER_ADMIN role.
   */
  bulkGrantUserFeatures: Array<UserFeature>;
  calculateBJR: BjrCalculation;
  /** Cancel weighing */
  cancelWeighing: WeighingResult;
  /** Change user password with security validation */
  changePassword: Scalars['Boolean']['output'];
  /**
   * Clear all user-specific feature overrides for a user.
   * Requires SUPER_ADMIN role.
   */
  clearUserFeatures: Scalars['Boolean']['output'];
  /** Remove all permission overrides for a user */
  clearUserPermissions: Scalars['Boolean']['output'];
  /** Create a new API key (SUPER_ADMIN only) */
  createAPIKey: ApiKeyReveal;
  /** Create action item */
  createAreaManagerActionItem: AreaManagerActionItem;
  createBlock: Block;
  createCompany: Company;
  /** Create new company */
  createCompanyAdmin: CompanyManagementResult;
  /** Create company user */
  createCompanyUser: UserManagementResult;
  createDivision: Division;
  createEmployee: Employee;
  createEstate: Estate;
  /**
   * Create a new custom feature.
   * Only SUPER_ADMIN can create features.
   */
  createFeature: Feature;
  createGradingRecord: GradingRecord;
  createHarvestRecord: HarvestRecord;
  createHerbisidaUsage: HerbisidaUsage;
  /** Create new harvest record */
  createMandorHarvest: MandorHarvestResult;
  createPKSRecord: PksRecord;
  createPerawatanRecord: PerawatanRecord;
  /** Create a new permission */
  createPermission: Permission;
  createPupukUsage: PupukUsage;
  /** Create a new role */
  createRole: Role;
  /** Create super admin */
  createSuperAdmin: User;
  createTarifBlok: TarifBlok;
  /** Create a new user with role-based authorization */
  createUser: UserMutationResponse;
  createVehicle: Vehicle;
  createVehicleTax: VehicleTax;
  createVehicleTaxDocument: VehicleTaxDocument;
  /** Deactivate user */
  deactivateUser: UserManagementResult;
  deleteBlock: Scalars['Boolean']['output'];
  deleteCompany: Scalars['Boolean']['output'];
  /** Delete company */
  deleteCompanyAdmin: CompanyManagementResult;
  /** Delete company user */
  deleteCompanyUser: UserManagementResult;
  deleteDivision: Scalars['Boolean']['output'];
  deleteEstate: Scalars['Boolean']['output'];
  /**
   * Delete a feature.
   * System features cannot be deleted.
   * Only SUPER_ADMIN can delete features.
   */
  deleteFeature: Scalars['Boolean']['output'];
  deleteHarvestRecord: Scalars['Boolean']['output'];
  /** Delete harvest record (only pending) */
  deleteMandorHarvest: MandorHarvestResult;
  deletePKSRecord: Scalars['Boolean']['output'];
  deletePerawatanRecord: Scalars['Boolean']['output'];
  /** Delete a permission */
  deletePermission: Scalars['Boolean']['output'];
  /** Delete a role */
  deleteRole: Scalars['Boolean']['output'];
  deleteTarifBlok: Scalars['Boolean']['output'];
  /** Delete a user with cascade handling */
  deleteUser: UserMutationResponse;
  deleteVehicle: Scalars['Boolean']['output'];
  deleteVehicleTax: Scalars['Boolean']['output'];
  deleteVehicleTaxDocument: Scalars['Boolean']['output'];
  /**
   * Deny a feature to a specific user.
   * Creates a user-level feature denial that overrides role-based features.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role (with appropriate scope).
   */
  denyUserFeature: UserFeature;
  /** Extend company trial */
  extendCompanyTrial: CompanyManagementResult;
  /** Force logout all sessions for a user (Super Admin only) */
  forceLogoutAllSessions: ForceLogoutResponse;
  /** Force logout a specific session (Super Admin only) */
  forceLogoutSession: ForceLogoutResponse;
  /** Generate QR token for guest */
  generateGuestQR: SatpamQrToken;
  /**
   * Grant a feature to a specific user.
   * Creates a user-level feature grant that can override role-based features.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role (with appropriate scope).
   */
  grantUserFeature: UserFeature;
  /** Logout user and revoke current device token */
  logout: Scalars['Boolean']['output'];
  /** Logout from all devices and revoke all user tokens */
  logoutAllDevices: Scalars['Boolean']['output'];
  /** Mark alert as read */
  markAlertRead: Scalars['Boolean']['output'];
  /** Mark sync completed */
  markMandorSyncCompleted: Scalars['Boolean']['output'];
  /** Mark vehicle as overstay */
  markOverstay: SatpamGuestLog;
  /** Mark sync completed */
  markSatpamSyncCompleted: Scalars['Boolean']['output'];
  /** Migrate static permissions to RBAC system */
  migrateStaticPermissions: Scalars['Boolean']['output'];
  /** Mobile authentication with simplified input for mobile apps */
  mobileLogin: AuthPayload;
  /** Perform first weighing */
  performFirstWeighing: WeighingResult;
  /** Perform second weighing */
  performSecondWeighing: WeighingResult;
  /** Process guest exit */
  processGuestExit: ProcessExitResult;
  /** Refresh access token using standard AuthPayload */
  refreshToken: AuthPayload;
  /** Register FCM token for push notifications (called after login) */
  registerFCMToken: Scalars['Boolean']['output'];
  /** Register new guest */
  registerGuest: GuestRegistrationResult;
  rejectGrading: GradingRecord;
  /** Reject single harvest record */
  rejectHarvest: ApproveHarvestResult;
  rejectHarvestRecord: HarvestRecord;
  /** Remove company assignment */
  removeCompanyAssignment: Scalars['Boolean']['output'];
  /** Remove division assignment */
  removeDivisionAssignment: Scalars['Boolean']['output'];
  /** Remove estate assignment */
  removeEstateAssignment: Scalars['Boolean']['output'];
  /**
   * Remove features from a role.
   * Only SUPER_ADMIN can remove role features.
   */
  removeRoleFeatures: Scalars['Boolean']['output'];
  /** Remove permissions from a role */
  removeRolePermissions: Role;
  /** Remove user from division */
  removeUserFromDivisionAdmin: UserManagementResult;
  /** Remove user from estate */
  removeUserFromEstateAdmin: UserManagementResult;
  /** Remove user permission override */
  removeUserPermission: Scalars['Boolean']['output'];
  /** Request correction from mandor */
  requestCorrection: ApproveHarvestResult;
  /** Request reweighing */
  requestReweighing: WeighingResult;
  /** Reset user password (admin only) */
  resetUserPassword: UserMutationResponse;
  /** Revoke an existing API key (SUPER_ADMIN only) */
  revokeAPIKey: Scalars['Boolean']['output'];
  /** Revoke one JWT token by token record ID (SUPER_ADMIN only) */
  revokeJWTToken: RevokeJwtTokenResponse;
  /**
   * Revoke a user-specific feature assignment (grant or denial).
   * Requires SUPER_ADMIN or COMPANY_ADMIN role (with appropriate scope).
   */
  revokeUserFeature: Scalars['Boolean']['output'];
  /** Rotate an API key (revoke old, create new) (SUPER_ADMIN only) */
  rotateAPIKey: ApiKeyReveal;
  /** Set company target */
  setCompanyTarget: Scalars['Boolean']['output'];
  /** Set feature for companies */
  setFeatureForCompanies: FeatureFlag;
  /** Set maintenance mode */
  setMaintenanceMode: Scalars['Boolean']['output'];
  /** Suspend company */
  suspendCompany: CompanyManagementResult;
  /** Sync employee access log */
  syncEmployeeLog: EmployeeLogSyncResult;
  syncEmployees: Array<Employee>;
  /** Sync harvest records from mobile device (Mandor) */
  syncHarvestRecords: MandorSyncResult;
  /** Sync harvest records from mobile */
  syncMandorHarvests: MandorSyncResult;
  /** Sync photos from mobile */
  syncMandorPhotos: MandorPhotoSyncResult;
  /** Sync satpam photos */
  syncSatpamPhotos: SatpamPhotoSyncResult;
  /** Sync satpam records */
  syncSatpamRecords: SatpamSyncResult;
  /** Toggle feature flag */
  toggleFeatureFlag: FeatureFlag;
  /** Toggle user active status */
  toggleUserStatus: UserMutationResponse;
  /** Trigger system backup */
  triggerSystemBackup: BackupResult;
  /** Unbind device and revoke access */
  unbindDevice: Scalars['Boolean']['output'];
  /** Unlock user account */
  unlockUserAccount: UserManagementResult;
  /** Unregister FCM token (called before logout or token refresh) */
  unregisterFCMToken: Scalars['Boolean']['output'];
  /** Update action item status */
  updateActionItemStatus: AreaManagerActionItem;
  updateBlock: Block;
  updateCompany: Company;
  /** Update company */
  updateCompanyAdmin: CompanyManagementResult;
  /** Update company plan */
  updateCompanyPlan: CompanyManagementResult;
  /** Update company settings */
  updateCompanySettings: CompanySettings;
  /** Update company user */
  updateCompanyUser: UserManagementResult;
  updateDivision: Division;
  updateEmployee: Employee;
  updateEstate: Estate;
  /**
   * Update an existing feature.
   * System features can only be updated by SUPER_ADMIN.
   * Only SUPER_ADMIN can update features.
   */
  updateFeature: Feature;
  updateGradingRecord: GradingRecord;
  updateHarvestRecord: HarvestRecord;
  /** Update existing harvest record */
  updateMandorHarvest: MandorHarvestResult;
  updatePKSRecord: PksRecord;
  updatePerawatanRecord: PerawatanRecord;
  /** Update an existing permission */
  updatePermission: Permission;
  /** Update an existing role */
  updateRole: Role;
  /** Update system settings */
  updateSystemSettings: SystemSettings;
  updateTarifBlok: TarifBlok;
  /** Update an existing user with proper validation */
  updateUser: UserMutationResponse;
  updateVehicle: Vehicle;
  updateVehicleTax: VehicleTax;
  /** Web authentication with cookie-based session management */
  webLogin: WebLoginPayload;
};


export type MutationAcknowledgeAlertArgs = {
  alertId: Scalars['ID']['input'];
};


export type MutationActivateCompanyArgs = {
  companyId: Scalars['ID']['input'];
};


export type MutationActivateUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationAddToWeighingQueueArgs = {
  doNumber?: InputMaybe<Scalars['String']['input']>;
  driverName: Scalars['String']['input'];
  estimatedWeight?: InputMaybe<Scalars['Float']['input']>;
  priority?: InputMaybe<QueuePriority>;
  sourceDivision?: InputMaybe<Scalars['String']['input']>;
  sourceEstate: Scalars['String']['input'];
  vehiclePlate: Scalars['String']['input'];
};


export type MutationAdminResetUserPasswordArgs = {
  newPassword?: InputMaybe<Scalars['String']['input']>;
  sendEmail?: InputMaybe<Scalars['Boolean']['input']>;
  userId: Scalars['ID']['input'];
};


export type MutationApproveGradingArgs = {
  id: Scalars['ID']['input'];
  input: GradingApprovalInput;
};


export type MutationApproveHarvestArgs = {
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApproveHarvestRecordArgs = {
  input: ApproveHarvestInput;
};


export type MutationAssignRoleFeaturesArgs = {
  input: AssignRoleFeaturesInput;
};


export type MutationAssignRolePermissionsArgs = {
  input: RolePermissionInput;
};


export type MutationAssignUserPermissionArgs = {
  input: UserPermissionInput;
};


export type MutationAssignUserPermissionsArgs = {
  permissions: Array<UserPermissionInput>;
  userId: Scalars['String']['input'];
};


export type MutationAssignUserToCompanyArgs = {
  companyId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAssignUserToDivisionArgs = {
  divisionId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAssignUserToDivisionAdminArgs = {
  divisionId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAssignUserToEstateArgs = {
  estateId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAssignUserToEstateAdminArgs = {
  estateId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationBatchApprovalArgs = {
  input: BatchApprovalInput;
};


export type MutationBindDeviceArgs = {
  input: DeviceBindInput;
};


export type MutationBulkGrantUserFeaturesArgs = {
  features: Array<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  scope?: InputMaybe<FeatureScopeInput>;
  userIds: Array<Scalars['ID']['input']>;
};


export type MutationCalculateBjrArgs = {
  pksRecordId: Scalars['String']['input'];
};


export type MutationCancelWeighingArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationChangePasswordArgs = {
  input: ChangePasswordInput;
};


export type MutationClearUserFeaturesArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationClearUserPermissionsArgs = {
  userId: Scalars['String']['input'];
};


export type MutationCreateApiKeyArgs = {
  input: CreateApiKeyInput;
};


export type MutationCreateAreaManagerActionItemArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['Time']['input']>;
  priority: ActionPriority;
  title: Scalars['String']['input'];
  type: AreaManagerActionType;
};


export type MutationCreateBlockArgs = {
  input: CreateBlockInput;
};


export type MutationCreateCompanyArgs = {
  input: CreateCompanyInput;
};


export type MutationCreateCompanyAdminArgs = {
  input: CreateCompanyAdminInput;
};


export type MutationCreateCompanyUserArgs = {
  input: CreateCompanyUserInput;
};


export type MutationCreateDivisionArgs = {
  input: CreateDivisionInput;
};


export type MutationCreateEmployeeArgs = {
  input: CreateEmployeeInput;
};


export type MutationCreateEstateArgs = {
  input: CreateEstateInput;
};


export type MutationCreateFeatureArgs = {
  input: CreateFeatureInput;
};


export type MutationCreateGradingRecordArgs = {
  input: CreateGradingRecordInput;
};


export type MutationCreateHarvestRecordArgs = {
  input: CreateHarvestRecordInput;
};


export type MutationCreateHerbisidaUsageArgs = {
  input: CreateHerbisidaUsageInput;
};


export type MutationCreateMandorHarvestArgs = {
  input: CreateMandorHarvestInput;
};


export type MutationCreatePksRecordArgs = {
  input: CreatePksRecordInput;
};


export type MutationCreatePerawatanRecordArgs = {
  input: CreatePerawatanRecordInput;
};


export type MutationCreatePermissionArgs = {
  action: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  resource: Scalars['String']['input'];
};


export type MutationCreatePupukUsageArgs = {
  input: CreatePupukUsageInput;
};


export type MutationCreateRoleArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  displayName: Scalars['String']['input'];
  level: Scalars['Int']['input'];
  name: Scalars['String']['input'];
};


export type MutationCreateSuperAdminArgs = {
  email: Scalars['String']['input'];
  fullName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationCreateTarifBlokArgs = {
  input: CreateTarifBlokInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationCreateVehicleArgs = {
  input: CreateVehicleInput;
};


export type MutationCreateVehicleTaxArgs = {
  input: CreateVehicleTaxInput;
};


export type MutationCreateVehicleTaxDocumentArgs = {
  input: CreateVehicleTaxDocumentInput;
};


export type MutationDeactivateUserArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};


export type MutationDeleteBlockArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCompanyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCompanyAdminArgs = {
  companyId: Scalars['ID']['input'];
  confirmPhrase: Scalars['String']['input'];
};


export type MutationDeleteCompanyUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationDeleteDivisionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteEstateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteFeatureArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteHarvestRecordArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMandorHarvestArgs = {
  deviceId: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDeletePksRecordArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePerawatanRecordArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePermissionArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteRoleArgs = {
  name: Scalars['String']['input'];
};


export type MutationDeleteTarifBlokArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteVehicleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteVehicleTaxArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteVehicleTaxDocumentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDenyUserFeatureArgs = {
  input: DenyUserFeatureInput;
};


export type MutationExtendCompanyTrialArgs = {
  companyId: Scalars['ID']['input'];
  days: Scalars['Int']['input'];
};


export type MutationForceLogoutAllSessionsArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['UUID']['input'];
};


export type MutationForceLogoutSessionArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['UUID']['input'];
};


export type MutationGenerateGuestQrArgs = {
  deviceId: Scalars['String']['input'];
  expiryMinutes?: InputMaybe<Scalars['Int']['input']>;
  guestLogId: Scalars['String']['input'];
  intent: GateIntent;
};


export type MutationGrantUserFeatureArgs = {
  input: GrantUserFeatureInput;
};


export type MutationMarkAlertReadArgs = {
  alertId: Scalars['ID']['input'];
};


export type MutationMarkMandorSyncCompletedArgs = {
  deviceId: Scalars['String']['input'];
  transactionId: Scalars['String']['input'];
};


export type MutationMarkOverstayArgs = {
  guestLogId: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkSatpamSyncCompletedArgs = {
  deviceId: Scalars['String']['input'];
  transactionId: Scalars['String']['input'];
};


export type MutationMobileLoginArgs = {
  input: MobileLoginInput;
};


export type MutationPerformFirstWeighingArgs = {
  input: PerformFirstWeighingInput;
};


export type MutationPerformSecondWeighingArgs = {
  input: PerformSecondWeighingInput;
};


export type MutationProcessGuestExitArgs = {
  input: ProcessExitInput;
};


export type MutationRefreshTokenArgs = {
  input: RefreshTokenInput;
};


export type MutationRegisterFcmTokenArgs = {
  input: RegisterFcmTokenInput;
};


export type MutationRegisterGuestArgs = {
  input: CreateGuestRegistrationInput;
};


export type MutationRejectGradingArgs = {
  id: Scalars['ID']['input'];
  input: GradingApprovalInput;
};


export type MutationRejectHarvestArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationRejectHarvestRecordArgs = {
  input: RejectHarvestInput;
};


export type MutationRemoveCompanyAssignmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveDivisionAssignmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveEstateAssignmentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveRoleFeaturesArgs = {
  features: Array<Scalars['String']['input']>;
  roleName: Scalars['String']['input'];
};


export type MutationRemoveRolePermissionsArgs = {
  permissions: Array<Scalars['String']['input']>;
  roleName: Scalars['String']['input'];
};


export type MutationRemoveUserFromDivisionAdminArgs = {
  divisionId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationRemoveUserFromEstateAdminArgs = {
  estateId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationRemoveUserPermissionArgs = {
  permission: Scalars['String']['input'];
  scope?: InputMaybe<PermissionScopeInput>;
  userId: Scalars['String']['input'];
};


export type MutationRequestCorrectionArgs = {
  corrections: Array<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationRequestReweighingArgs = {
  id: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationResetUserPasswordArgs = {
  input: ResetPasswordInput;
};


export type MutationRevokeApiKeyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeJwtTokenArgs = {
  tokenId: Scalars['UUID']['input'];
};


export type MutationRevokeUserFeatureArgs = {
  input: RevokeUserFeatureInput;
};


export type MutationRotateApiKeyArgs = {
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationSetCompanyTargetArgs = {
  companyId: Scalars['ID']['input'];
  period: Scalars['String']['input'];
  targetType: Scalars['String']['input'];
  targetValue: Scalars['Float']['input'];
};


export type MutationSetFeatureForCompaniesArgs = {
  companyIds: Array<Scalars['ID']['input']>;
  key: Scalars['String']['input'];
};


export type MutationSetMaintenanceModeArgs = {
  enabled: Scalars['Boolean']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSuspendCompanyArgs = {
  companyId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationSyncEmployeeLogArgs = {
  input: EmployeeLogSyncInput;
};


export type MutationSyncEmployeesArgs = {
  input: Array<SyncEmployeeInput>;
};


export type MutationSyncHarvestRecordsArgs = {
  input: HarvestSyncInput;
};


export type MutationSyncMandorHarvestsArgs = {
  input: MandorSyncInput;
};


export type MutationSyncMandorPhotosArgs = {
  input: MandorPhotoSyncInput;
};


export type MutationSyncSatpamPhotosArgs = {
  input: SatpamPhotoSyncInput;
};


export type MutationSyncSatpamRecordsArgs = {
  input: SatpamSyncInput;
};


export type MutationToggleFeatureFlagArgs = {
  enabled: Scalars['Boolean']['input'];
  key: Scalars['String']['input'];
};


export type MutationToggleUserStatusArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnbindDeviceArgs = {
  deviceId: Scalars['ID']['input'];
};


export type MutationUnlockUserAccountArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationUnregisterFcmTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationUpdateActionItemStatusArgs = {
  itemId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  status: ActionItemStatus;
};


export type MutationUpdateBlockArgs = {
  input: UpdateBlockInput;
};


export type MutationUpdateCompanyArgs = {
  input: UpdateCompanyInput;
};


export type MutationUpdateCompanyAdminArgs = {
  input: UpdateCompanyAdminInput;
};


export type MutationUpdateCompanyPlanArgs = {
  companyId: Scalars['ID']['input'];
  maxEstates?: InputMaybe<Scalars['Int']['input']>;
  maxStorageGb?: InputMaybe<Scalars['Float']['input']>;
  maxUsers?: InputMaybe<Scalars['Int']['input']>;
  planType: PlanType;
};


export type MutationUpdateCompanySettingsArgs = {
  input: UpdateCompanySettingsInput;
};


export type MutationUpdateCompanyUserArgs = {
  input: UpdateCompanyUserInput;
};


export type MutationUpdateDivisionArgs = {
  input: UpdateDivisionInput;
};


export type MutationUpdateEmployeeArgs = {
  input: UpdateEmployeeInput;
};


export type MutationUpdateEstateArgs = {
  input: UpdateEstateInput;
};


export type MutationUpdateFeatureArgs = {
  input: UpdateFeatureInput;
};


export type MutationUpdateGradingRecordArgs = {
  id: Scalars['ID']['input'];
  input: UpdateGradingRecordInput;
};


export type MutationUpdateHarvestRecordArgs = {
  input: UpdateHarvestRecordInput;
};


export type MutationUpdateMandorHarvestArgs = {
  input: UpdateMandorHarvestInput;
};


export type MutationUpdatePksRecordArgs = {
  input: UpdatePksRecordInput;
};


export type MutationUpdatePerawatanRecordArgs = {
  input: UpdatePerawatanRecordInput;
};


export type MutationUpdatePermissionArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};


export type MutationUpdateRoleArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};


export type MutationUpdateSystemSettingsArgs = {
  input: UpdateSystemSettingsInput;
};


export type MutationUpdateTarifBlokArgs = {
  input: UpdateTarifBlokInput;
};


export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};


export type MutationUpdateVehicleArgs = {
  input: UpdateVehicleInput;
};


export type MutationUpdateVehicleTaxArgs = {
  input: UpdateVehicleTaxInput;
};


export type MutationWebLoginArgs = {
  input: WebLoginInput;
};

/** NotificationSettings for notifications. */
export type NotificationSettings = {
  __typename?: 'NotificationSettings';
  /** Alert thresholds */
  alertThresholds: AlertThresholds;
  /** Daily report enabled */
  dailyReportEnabled: Scalars['Boolean']['output'];
  /** Email notifications enabled */
  emailEnabled: Scalars['Boolean']['output'];
  /** Push notifications enabled */
  pushEnabled: Scalars['Boolean']['output'];
  /** SMS notifications enabled */
  smsEnabled: Scalars['Boolean']['output'];
};

/** NotificationSettingsInput for notifications. */
export type NotificationSettingsInput = {
  /** Daily report enabled */
  dailyReportEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Email enabled */
  emailEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Push enabled */
  pushEnabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** SMS enabled */
  smsEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

/** OperationalSettings for operations. */
export type OperationalSettings = {
  __typename?: 'OperationalSettings';
  /** Auto approve threshold */
  autoApproveThreshold?: Maybe<Scalars['Float']['output']>;
  /** Default shift end */
  defaultShiftEnd: Scalars['String']['output'];
  /** Default shift start */
  defaultShiftStart: Scalars['String']['output'];
  /** Require GPS for harvest */
  requireGpsForHarvest: Scalars['Boolean']['output'];
  /** Require photo for harvest */
  requirePhotoForHarvest: Scalars['Boolean']['output'];
};

/** OperationalSettingsInput for operations. */
export type OperationalSettingsInput = {
  /** Default shift end */
  defaultShiftEnd?: InputMaybe<Scalars['String']['input']>;
  /** Default shift start */
  defaultShiftStart?: InputMaybe<Scalars['String']['input']>;
  /** Require GPS */
  requireGpsForHarvest?: InputMaybe<Scalars['Boolean']['input']>;
  /** Require photo */
  requirePhotoForHarvest?: InputMaybe<Scalars['Boolean']['input']>;
};

/** PKSInfo represents PKS (Palm Kernel Station) information. */
export type PksInfo = {
  __typename?: 'PKSInfo';
  /** Company ID */
  companyId: Scalars['String']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Is operational */
  isOperational: Scalars['Boolean']['output'];
  /** PKS code */
  pksCode: Scalars['String']['output'];
  /** PKS ID */
  pksId: Scalars['ID']['output'];
  /** PKS name */
  pksName: Scalars['String']['output'];
  /** Scale capacity (kg) */
  scaleCapacity: Scalars['Float']['output'];
  /** Scale type */
  scaleType: Scalars['String']['output'];
};

/** PKS quality classification. */
export enum PksKualitas {
  A = 'A',
  B = 'B',
  C = 'C',
  Reject = 'REJECT'
}

/** PKSRecord represents records from palm oil processing factory. */
export type PksRecord = {
  __typename?: 'PKSRecord';
  beratTimbang: Scalars['Float']['output'];
  bjrPercentage: Scalars['Float']['output'];
  createdAt: Scalars['Time']['output'];
  harvestRecord: HarvestRecord;
  harvestRecordId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kualitas: PksKualitas;
  nomorDo: Scalars['String']['output'];
  tanggalTimbang: Scalars['Time']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** POSInfo represents gate position information. */
export type PosInfo = {
  __typename?: 'POSInfo';
  /** Company ID */
  companyId: Scalars['String']['output'];
  /** Company name */
  companyName: Scalars['String']['output'];
  /** Is active gate */
  isActive: Scalars['Boolean']['output'];
  /** POS name */
  posName: Scalars['String']['output'];
  /** POS number */
  posNumber: Scalars['String']['output'];
};

/** PageInfo provides pagination information for list queries. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** Current page number */
  currentPage: Scalars['Int']['output'];
  /** Ending cursor for the current page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether there are more pages available */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are previous pages available */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Starting cursor for the current page */
  startCursor?: Maybe<Scalars['String']['output']>;
  /** Total number of pages */
  totalPages: Scalars['Int']['output'];
};

/** Pagination metadata for list responses. */
export type Pagination = {
  __typename?: 'Pagination';
  /** Number of items per page */
  limit: Scalars['Int']['output'];
  /** Current page number */
  page: Scalars['Int']['output'];
  /** Total number of pages */
  pages: Scalars['Int']['output'];
  /** Total number of items */
  total: Scalars['Int']['output'];
};

/** PerawatanRecord represents maintenance activities on plantation blocks. */
export type PerawatanRecord = {
  __typename?: 'PerawatanRecord';
  block: Block;
  blockId: Scalars['String']['output'];
  catatan?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Time']['output'];
  herbisidaDigunakan?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  jenisPerawatan: JenisPerawatan;
  luasArea: Scalars['Float']['output'];
  pekerja: User;
  pekerjaId: Scalars['String']['output'];
  pupukDigunakan?: Maybe<Scalars['String']['output']>;
  status: StatusPerawatan;
  tanggalPerawatan: Scalars['Time']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** PerformFirstWeighingInput for first weighing. */
export type PerformFirstWeighingInput = {
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** DO number verification */
  doNumber?: InputMaybe<Scalars['String']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Photo path */
  photoPath?: InputMaybe<Scalars['String']['input']>;
  /** Queue item ID */
  queueItemId: Scalars['ID']['input'];
  /** Measured weight (kg) */
  weight: Scalars['Float']['input'];
};

/** PerformSecondWeighingInput for second weighing. */
export type PerformSecondWeighingInput = {
  /** Brondolan weight (kg) */
  brondolanWeight?: InputMaybe<Scalars['Float']['input']>;
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Grading notes */
  gradingNotes?: InputMaybe<Scalars['String']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Photo path */
  photoPath?: InputMaybe<Scalars['String']['input']>;
  /** Quality grade */
  qualityGrade?: InputMaybe<Scalars['String']['input']>;
  /** TBS count */
  tbsCount?: InputMaybe<Scalars['Int']['input']>;
  /** Weighing record ID */
  weighingRecordId: Scalars['ID']['input'];
  /** Measured weight (kg) */
  weight: Scalars['Float']['input'];
};

export type Permission = {
  __typename?: 'Permission';
  action: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  deletedAt?: Maybe<Scalars['Time']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  resource: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

export type PermissionCheckInput = {
  permission: Scalars['String']['input'];
  scope?: InputMaybe<PermissionScopeInput>;
  userId: Scalars['String']['input'];
};

export type PermissionCheckResult = {
  __typename?: 'PermissionCheckResult';
  hasAccess: Scalars['Boolean']['output'];
  permission: Scalars['String']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

export type PermissionScope = {
  __typename?: 'PermissionScope';
  id: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type PermissionScopeInput = {
  id: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

/** PhotoType represents the purpose/context of a photo. */
export enum PhotoType {
  /** Vehicle back photo */
  Back = 'BACK',
  /** Document photo */
  Document = 'DOCUMENT',
  /** Entry photo */
  Entry = 'ENTRY',
  /** Exit photo */
  Exit = 'EXIT',
  /** Vehicle front photo */
  Front = 'FRONT',
  /** General purpose photo */
  General = 'GENERAL',
  /** Vehicle photo */
  Vehicle = 'VEHICLE'
}

/** PhotoUploadError represents an error during photo upload. */
export type PhotoUploadError = {
  __typename?: 'PhotoUploadError';
  /** Error code */
  code?: Maybe<Scalars['String']['output']>;
  /** Error message */
  error: Scalars['String']['output'];
  /** Photo ID that failed */
  photoId: Scalars['String']['output'];
};

/** PlanType enum. */
export enum PlanType {
  Basic = 'BASIC',
  Custom = 'CUSTOM',
  Enterprise = 'ENTERPRISE',
  Premium = 'PREMIUM',
  Standard = 'STANDARD',
  Trial = 'TRIAL'
}

/** PlatformStats for platform statistics. */
export type PlatformStats = {
  __typename?: 'PlatformStats';
  /** API calls today */
  apiCallsToday: Scalars['Int']['output'];
  /** Storage limit (GB) */
  storageLimitGb: Scalars['Float']['output'];
  /** Storage used (GB) */
  storageUsedGb: Scalars['Float']['output'];
  /** Total blocks */
  totalBlocks: Scalars['Int']['output'];
  /** Total divisions */
  totalDivisions: Scalars['Int']['output'];
  /** Total estates */
  totalEstates: Scalars['Int']['output'];
  /** Total gate checks this month */
  totalGateChecksThisMonth: Scalars['Int']['output'];
  /** Total harvests this month */
  totalHarvestsThisMonth: Scalars['Int']['output'];
  /** Total production this month (tons) */
  totalProductionThisMonth: Scalars['Float']['output'];
};

/** Platform Type represents the client platform accessing the API. */
export enum PlatformType {
  /** Android mobile client */
  Android = 'ANDROID',
  /** iOS mobile client */
  Ios = 'IOS',
  /** Web browser client */
  Web = 'WEB'
}

/** ProcessExitInput for processing guest exit. */
export type ProcessExitInput = {
  /** Client timestamp */
  clientTimestamp: Scalars['Time']['input'];
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Exit gate */
  exitGate: Scalars['String']['input'];
  /** Guest log ID or QR token */
  identifier: Scalars['String']['input'];
  /** Identifier type */
  identifierType: ExitIdentifierType;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** Second cargo (Muatan Sekunder) */
  secondCargo?: InputMaybe<Scalars['String']['input']>;
};

/** ProcessExitResult for exit operation. */
export type ProcessExitResult = {
  __typename?: 'ProcessExitResult';
  /** Errors */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Updated guest log */
  guestLog?: Maybe<SatpamGuestLog>;
  /** Message */
  message: Scalars['String']['output'];
  /** Success status */
  success: Scalars['Boolean']['output'];
  /** Was overstay */
  wasOverstay: Scalars['Boolean']['output'];
};

/** ProductionTrendData represents production trend over time. */
export type ProductionTrendData = {
  __typename?: 'ProductionTrendData';
  /** Average production */
  average: Scalars['Float']['output'];
  /** Data points */
  dataPoints: Array<TrendDataPoint>;
  /** Maximum production */
  maximum: Scalars['Float']['output'];
  /** Minimum production */
  minimum: Scalars['Float']['output'];
  /** Trend direction */
  trendDirection: TrendDirection;
  /** Trend percentage */
  trendPercentage: Scalars['Float']['output'];
};

/** Pupuk (Fertilizer) usage record. */
export type PupukUsage = {
  __typename?: 'PupukUsage';
  createdAt: Scalars['Time']['output'];
  hargaPerKg: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  jenisPupuk: Scalars['String']['output'];
  jumlahKg: Scalars['Float']['output'];
  perawatanRecord: PerawatanRecord;
  perawatanRecordId: Scalars['String']['output'];
  totalBiaya: Scalars['Float']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** QRTokenStatus represents the current state of a QR token. */
export enum QrTokenStatus {
  /** Token is active and can be used */
  Active = 'ACTIVE',
  /** Token has been cancelled */
  Cancelled = 'CANCELLED',
  /** Token has expired */
  Expired = 'EXPIRED',
  /** Token is invalid */
  Invalid = 'INVALID',
  /** Token has been used and cannot be reused */
  Used = 'USED'
}

/** QRValidationResult for validation operation. */
export type QrValidationResult = {
  __typename?: 'QRValidationResult';
  /** Allowed operations */
  allowedOperations: Array<GateIntent>;
  /** Validation errors */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Guest log if found */
  guestLog?: Maybe<SatpamGuestLog>;
  /** Is valid */
  isValid: Scalars['Boolean']['output'];
  /** Validation message */
  message: Scalars['String']['output'];
  /** Token info if valid */
  tokenInfo?: Maybe<SatpamQrToken>;
};

/** QualityAnalysisData represents quality breakdown analysis. */
export type QualityAnalysisData = {
  __typename?: 'QualityAnalysisData';
  /** Average quality score */
  averageScore: Scalars['Float']['output'];
  /** Quality distribution */
  distribution: Array<QualityDistribution>;
  /** Quality trend */
  trend: TrendDirection;
};

/** QualityDistribution represents quality grade distribution. */
export type QualityDistribution = {
  __typename?: 'QualityDistribution';
  /** Color code for UI */
  colorCode: Scalars['String']['output'];
  /** Count */
  count: Scalars['Int']['output'];
  /** Grade name */
  grade: Scalars['String']['output'];
  /** Percentage */
  percentage: Scalars['Float']['output'];
};

export type Query = {
  __typename?: 'Query';
  /** Get active harvest activities */
  activeHarvestActivities: Array<HarvestActivity>;
  /** Get activity timeline */
  activityTimeline: Array<ActivityTimelineItem>;
  /** Get admin activity logs */
  adminActivityLogs: Array<AdminActivityLog>;
  /** Get device statistics per company */
  adminDeviceStats: Array<CompanyDeviceStat>;
  /** Get all companies (admin view) */
  allCompanies: CompanyListResponse;
  /** Get all roles in hierarchical order */
  allRoles: Array<RoleInfo>;
  /** Get audit log for API key operations (SUPER_ADMIN only) */
  apiKeyLog: Array<ApiKeyLog>;
  /** Get API key statistics and metrics (SUPER_ADMIN only) */
  apiKeyStats: ApiKeyStats;
  /** Get all API keys in the system (SUPER_ADMIN only) */
  apiKeys: Array<ApiKey>;
  /** Get approval history */
  approvalHistory: ApprovalListResponse;
  /** Get single approval item detail */
  approvalItem: ApprovalItem;
  /** Get approval statistics */
  approvalStats: ApprovalStatsData;
  /** Get area manager analytics */
  areaManagerAnalytics: AreaManagerAnalyticsData;
  /** Get company details for area manager */
  areaManagerCompanyDetail: CompanyPerformanceData;
  /** Get area manager dashboard */
  areaManagerDashboard: AreaManagerDashboardData;
  /** Get asisten dashboard data */
  asistenDashboard: AsistenDashboardData;
  /** Get asisten dashboard stats */
  asistenDashboardStats: AsistenDashboardStats;
  /** Get asisten monitoring data */
  asistenMonitoring: AsistenMonitoringData;
  /** Get asisten today summary */
  asistenTodaySummary: AsistenTodaySummary;
  /** Get BJR calculation by PKS record */
  bjrCalculationByPKS?: Maybe<BjrCalculation>;
  /** Retrieve all BJR calculations */
  bjrCalculations: Array<BjrCalculation>;
  /** Get a specific block by ID */
  block?: Maybe<Block>;
  /** Get block activities for a division */
  blockActivities: Array<BlockActivity>;
  /** Retrieve all plantation blocks */
  blocks: Array<Block>;
  /** Retrieve plantation blocks with pagination and optional filters */
  blocksPaginated: BlockPaginationResponse;
  /** Check if current user can manage users with target role */
  canManageRole: Scalars['Boolean']['output'];
  /** Check if a user has a specific permission */
  checkPermission: PermissionCheckResult;
  /** Check multiple permissions for a user */
  checkPermissions: BatchPermissionCheckResult;
  /** Check if a role can access another role */
  checkRoleAccess: RoleAccessCheck;
  /** Check if a role has a specific permission */
  checkRolePermission: RolePermissionCheck;
  /**
   * Check if a user has a specific feature.
   * Can be called by the user themselves or by admins.
   */
  checkUserFeature: FeatureCheckResult;
  /**
   * Check if a user has multiple features.
   * Can be called by the user themselves or by admins.
   */
  checkUserFeatures: BatchFeatureCheckResult;
  /** Get all companies with optional filtering and pagination */
  companies: CompanyPaginationResponse;
  /** Get specific company by ID */
  company?: Maybe<Company>;
  /** Get company admin dashboard */
  companyAdminDashboard: CompanyAdminDashboardData;
  /** Get all company assignments for Area Manager role */
  companyAssignments: Array<UserCompanyAssignment>;
  /** Get company detail (admin view) */
  companyDetail?: Maybe<CompanyDetailAdmin>;
  /** Get company settings */
  companySettings: CompanySettings;
  /** Get company user detail */
  companyUser?: Maybe<CompanyUser>;
  /** Get company users */
  companyUsers: CompanyUserListResponse;
  /** Get current user with full company context and permissions */
  currentUser?: Maybe<WebLoginPayload>;
  /**
   * Get database health and RLS status.
   * Requires authentication (SUPER_ADMIN only for sensitive info).
   */
  databaseHealth: DatabaseHealthInfo;
  /** Get a specific division by ID */
  division?: Maybe<Division>;
  /** Get all division assignments for Asisten role */
  divisionAssignments: Array<UserDivisionAssignment>;
  /** Get division monitoring detail */
  divisionMonitoring: AsistenDivisionSummary;
  /** Get division monitor summaries for an estate */
  divisionMonitors: Array<DivisionMonitorSummary>;
  /** Get division performance ranking */
  divisionPerformanceRanking: Array<DivisionPerformanceData>;
  /** Retrieve all divisions */
  divisions: Array<Division>;
  employee?: Maybe<Employee>;
  employeeByNIK?: Maybe<Employee>;
  employees: Array<Employee>;
  employeesByCompany: Array<Employee>;
  employeesPaginated: EmployeePaginationResponse;
  /** Get a specific estate by ID */
  estate?: Maybe<Estate>;
  /** Get all estate assignments for Manager role */
  estateAssignments: Array<UserEstateAssignment>;
  /** Get estate monitor summary */
  estateMonitor: EstateMonitorSummary;
  /** Retrieve all estates across companies */
  estates: Array<Estate>;
  /** Get feature flags */
  featureFlags: Array<FeatureFlag>;
  /** Get all roles that a requester can access */
  getAccessibleRoles: Array<UserRole>;
  /** Get all roles that a requester can assign */
  getAssignableRoles: Array<UserRole>;
  /**
   * Get a specific feature by ID.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role.
   */
  getFeature?: Maybe<Feature>;
  /**
   * Get a feature by its code/name.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role.
   */
  getFeatureByName?: Maybe<Feature>;
  /**
   * Get the complete feature hierarchy tree.
   * Useful for rendering feature trees in the UI.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role.
   */
  getFeatureHierarchy: Array<FeatureHierarchy>;
  /**
   * Get feature system statistics.
   * Requires SUPER_ADMIN role.
   */
  getFeatureStats: FeatureStats;
  /** Get all roles hierarchically subordinate to a given role */
  getHierarchicalSubordinates: Array<UserRole>;
  /** Get all roles hierarchically superior to a given role */
  getHierarchicalSuperiors: Array<UserRole>;
  /** Get all roles that a requester can manage */
  getManageableRoles: Array<UserRole>;
  /**
   * Get all features assigned to a role.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role.
   */
  getRoleFeatures: Array<RoleFeature>;
  /**
   * Get all user-specific feature overrides for a user.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role.
   */
  getUserFeatureOverrides: Array<UserFeature>;
  /**
   * Get all features for a specific user.
   * Returns the computed feature set including role and user-level features.
   * Can be called by the user themselves or by admins.
   */
  getUserFeatures: UserFeatureSet;
  gradingRecord?: Maybe<GradingRecord>;
  gradingRecords: Array<GradingRecord>;
  gradingRecordsByHarvest: Array<GradingRecord>;
  /** Get a specific harvest record by ID */
  harvestRecord?: Maybe<HarvestRecord>;
  /** Retrieve all harvest records */
  harvestRecords: Array<HarvestRecord>;
  /** Filter harvest records by approval status */
  harvestRecordsByStatus: Array<HarvestRecord>;
  /** Get herbicide usage records */
  herbisidaUsageRecords: Array<HerbisidaUsage>;
  /** List jwt_tokens records (SUPER_ADMIN only) */
  jwtTokens: Array<JwtTokenRecord>;
  /**
   * List all features with optional filtering and pagination.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role.
   */
  listFeatures: FeaturesResponse;
  /** Get manager action items */
  managerActionItems: Array<ManagerActionItem>;
  /** Get manager analytics data */
  managerAnalytics: ManagerAnalyticsData;
  /** Get manager dashboard data */
  managerDashboard: ManagerDashboardData;
  /** Get manager dashboard stats */
  managerDashboardStats: ManagerDashboardStats;
  /** Get manager monitoring data */
  managerMonitor: ManagerMonitorData;
  /** Get manager team summary */
  managerTeamSummary: ManagerTeamSummary;
  /** Get all managers under area manager */
  managersUnderArea: Array<User>;
  /** Get mandor recent activities */
  mandorActivities: Array<MandorActivity>;
  /** Get blocks available for mandor */
  mandorBlocks: Array<Block>;
  /** Get mandor dashboard data */
  mandorDashboard: MandorDashboardData;
  /** Get mandor dashboard stats */
  mandorDashboardStats: MandorDashboardStats;
  /** Get employees available for mandor */
  mandorEmployees: Array<Employee>;
  /** Get single harvest record */
  mandorHarvestRecord?: Maybe<MandorHarvestRecord>;
  /** Get mandor harvest history */
  mandorHistory: MandorHistoryResponse;
  /** Get pending sync items for mandor */
  mandorPendingSyncItems: Array<MandorPendingSyncItem>;
  /** Get server updates since last sync */
  mandorServerUpdates: Array<MandorHarvestRecord>;
  /** Get mandor statuses */
  mandorStatuses: Array<MandorStatus>;
  /** Get mandor sync status */
  mandorSyncStatus: MandorSyncStatus;
  /** Get current authenticated user information with session validation */
  me?: Maybe<User>;
  /** Get current user's assignment scope for role-based access */
  myAssignments: UserAssignments;
  /** Get current user's bound devices */
  myDevices: Array<Device>;
  /** Get pending approvals list */
  pendingApprovals: ApprovalListResponse;
  pendingGradingApprovals: Array<GradingRecord>;
  /** Get a specific maintenance record by ID */
  perawatanRecord?: Maybe<PerawatanRecord>;
  /** Retrieve all maintenance records */
  perawatanRecords: Array<PerawatanRecord>;
  /** Filter maintenance records by status */
  perawatanRecordsByStatus: Array<PerawatanRecord>;
  /** Filter maintenance records by type */
  perawatanRecordsByType: Array<PerawatanRecord>;
  /** Get permission by name */
  permission?: Maybe<Permission>;
  /** Get all permissions */
  permissions: Array<Permission>;
  /** Get a specific PKS record by ID */
  pksRecord?: Maybe<PksRecord>;
  /** Retrieve all PKS records */
  pksRecords: Array<PksRecord>;
  /** Filter PKS records by quality */
  pksRecordsByQuality: Array<PksRecord>;
  /** Get platform statistics */
  platformStatistics: PlatformStats;
  /** Get production trend data */
  productionTrend: ProductionTrendData;
  /** Get fertilizer usage records */
  pupukUsageRecords: Array<PupukUsage>;
  /** Get quality analysis data */
  qualityAnalysis: QualityAnalysisData;
  /** Check if source role can manage target role based on hierarchy */
  rbacCanRoleManage: Scalars['Boolean']['output'];
  /** Get role permissions including inherited permissions from role hierarchy */
  rbacEffectivePermissions: Array<Scalars['String']['output']>;
  /** Get complete RBAC role hierarchy as a tree structure */
  rbacHierarchyTree: Array<RoleHierarchyNode>;
  /** Get detailed relationship between two roles */
  rbacRoleRelationship: RoleRelationship;
  /** Get all roles above (higher authority than) a specific role */
  rbacRolesAbove: Array<Role>;
  /** Get all roles at a specific hierarchy level */
  rbacRolesAtLevel: Array<Role>;
  /** Get all roles below (lower authority than) a specific role */
  rbacRolesBelow: Array<Role>;
  /** Get all roles within a level range (inclusive) */
  rbacRolesByLevelRange: Array<Role>;
  /** Get RBAC system statistics */
  rbacStats: RbacStats;
  /** Get direct subordinate roles (roles one level below) */
  rbacSubordinateRoles: Array<Role>;
  /** Get direct superior roles (roles one level above) */
  rbacSuperiorRoles: Array<Role>;
  /** Get regional alerts */
  regionalAlerts: Array<RegionalAlert>;
  /** Get regional report */
  regionalReport: RegionalReportData;
  /**
   * Get current PostgreSQL RLS context for the authenticated user.
   * Requires authentication. Shows session variables set by RLS middleware.
   */
  rlsContext: RlsContextInfo;
  /** Get role by name */
  role?: Maybe<Role>;
  /** Get role hierarchy from highest to lowest authority */
  roleHierarchy: Array<Role>;
  /** Get the complete role hierarchy tree organized by levels */
  roleHierarchyTree: Array<RoleHierarchyTree>;
  /** Get information about a specific role */
  roleInfo?: Maybe<RoleInfo>;
  /** Get all permissions for a role including inherited permissions */
  rolePermissions: Array<Scalars['String']['output']>;
  /** Get all roles */
  roles: Array<Role>;
  /** Get satpam dashboard data */
  satpamDashboard: SatpamDashboardData;
  /** Get satpam dashboard stats */
  satpamDashboardStats: SatpamDashboardStats;
  /** Get single guest log */
  satpamGuestLog?: Maybe<SatpamGuestLog>;
  /** Get satpam history */
  satpamHistory: SatpamHistoryResponse;
  /** Get pending sync items */
  satpamPendingSyncItems: Array<SatpamPendingSyncItem>;
  /** Get server updates since last sync */
  satpamServerUpdates: Array<SatpamGuestLog>;
  /** Get satpam sync status */
  satpamSyncStatus: SatpamSyncStatus;
  /** Search guest by plate or name */
  searchGuest: Array<SatpamGuestLog>;
  /** Get super admin dashboard */
  superAdminDashboard: SuperAdminDashboardData;
  /** Get all super admins */
  superAdmins: Array<User>;
  /** Get system activity logs */
  systemActivityLogs: Array<SystemActivityLog>;
  /** Get system alerts */
  systemAlerts: Array<SystemAlert>;
  /** Get system settings */
  systemSettings: SystemSettings;
  /** Retrieve master tariff/treatment data for blocks */
  tarifBloks: Array<TarifBlok>;
  /** Get timbangan dashboard */
  timbanganDashboard: TimbanganDashboardData;
  /** Get timbangan history */
  timbanganHistory: TimbanganHistoryResponse;
  /** Get a specific user by ID */
  user?: Maybe<User>;
  /** Get user permission overrides */
  userPermissionOverrides: Array<UserPermissionAssignment>;
  /** Get all permissions for a specific user including overrides */
  userPermissions?: Maybe<UserPermissions>;
  /** List user sessions with optional filtering (Super Admin only) */
  userSessions: Array<UserSession>;
  /** Get user statistics */
  userStatistics: UserOverview;
  /** Retrieve all users in the system with optional filtering */
  users: UserListResponse;
  /** Get users by company with role-based access control */
  usersByCompany: Array<User>;
  /** Get users by role with proper authorization */
  usersByRole: Array<User>;
  /** Validate DO number */
  validateDoNumber: DoValidationResult;
  /** Validate QR code */
  validateSatpamQR: QrValidationResult;
  vehicle?: Maybe<Vehicle>;
  vehicleTax?: Maybe<VehicleTax>;
  vehicleTaxDocuments: Array<VehicleTaxDocument>;
  vehicleTaxes: Array<VehicleTax>;
  vehicles: Array<Vehicle>;
  /** Get vehicles currently inside */
  vehiclesInside: Array<VehicleInsideInfo>;
  /** Get vehicles currently outside (exited today, no same-day entry) */
  vehiclesOutside: Array<VehicleOutsideInfo>;
  vehiclesPaginated: VehiclePaginationResponse;
  /** Get weighing queue */
  weighingQueue: Array<WeighingQueueItem>;
  /** Get weighing record */
  weighingRecord?: Maybe<WeighingRecord>;
};


export type QueryActiveHarvestActivitiesArgs = {
  estateId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryActivityTimelineArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  since?: InputMaybe<Scalars['Time']['input']>;
};


export type QueryAdminActivityLogsArgs = {
  activityType?: InputMaybe<AdminActivityType>;
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAllCompaniesArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  planType?: InputMaybe<PlanType>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CompanyStatus>;
};


export type QueryApiKeyLogArgs = {
  action?: InputMaybe<Scalars['String']['input']>;
  apiKeyId?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryApprovalHistoryArgs = {
  filter?: InputMaybe<ApprovalFilterInput>;
};


export type QueryApprovalItemArgs = {
  id: Scalars['ID']['input'];
};


export type QueryApprovalStatsArgs = {
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  dateTo?: InputMaybe<Scalars['Time']['input']>;
};


export type QueryAreaManagerAnalyticsArgs = {
  companyIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  period: AnalyticsPeriod;
};


export type QueryAreaManagerCompanyDetailArgs = {
  companyId: Scalars['ID']['input'];
};


export type QueryBjrCalculationByPksArgs = {
  pksRecordId: Scalars['String']['input'];
};


export type QueryBlockArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBlockActivitiesArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryBlocksPaginatedArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCanManageRoleArgs = {
  targetRoleName: Scalars['String']['input'];
};


export type QueryCheckPermissionArgs = {
  input: PermissionCheckInput;
};


export type QueryCheckPermissionsArgs = {
  input: BatchPermissionCheckInput;
};


export type QueryCheckRoleAccessArgs = {
  requesterRole: UserRole;
  targetRole: UserRole;
};


export type QueryCheckRolePermissionArgs = {
  permission: Scalars['String']['input'];
  role: UserRole;
};


export type QueryCheckUserFeatureArgs = {
  input: FeatureCheckInput;
};


export type QueryCheckUserFeaturesArgs = {
  input: BatchFeatureCheckInput;
};


export type QueryCompaniesArgs = {
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCompanyArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCompanyDetailArgs = {
  companyId: Scalars['ID']['input'];
};


export type QueryCompanyUserArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryCompanyUsersArgs = {
  filter?: InputMaybe<UserFilterInput>;
};


export type QueryDivisionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDivisionMonitoringArgs = {
  divisionId: Scalars['ID']['input'];
};


export type QueryDivisionMonitorsArgs = {
  estateId: Scalars['ID']['input'];
};


export type QueryDivisionPerformanceRankingArgs = {
  estateId?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEmployeeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEmployeeByNikArgs = {
  companyId: Scalars['ID']['input'];
  nik: Scalars['String']['input'];
};


export type QueryEmployeesByCompanyArgs = {
  companyId: Scalars['ID']['input'];
};


export type QueryEmployeesPaginatedArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  employeeType?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
};


export type QueryEstateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEstateMonitorArgs = {
  estateId: Scalars['ID']['input'];
};


export type QueryGetAccessibleRolesArgs = {
  requesterRole: UserRole;
};


export type QueryGetAssignableRolesArgs = {
  requesterRole: UserRole;
};


export type QueryGetFeatureArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetFeatureByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryGetFeatureHierarchyArgs = {
  module?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetHierarchicalSubordinatesArgs = {
  role: UserRole;
};


export type QueryGetHierarchicalSuperiorsArgs = {
  role: UserRole;
};


export type QueryGetManageableRolesArgs = {
  requesterRole: UserRole;
};


export type QueryGetRoleFeaturesArgs = {
  roleName: Scalars['String']['input'];
};


export type QueryGetUserFeatureOverridesArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetUserFeaturesArgs = {
  scope?: InputMaybe<FeatureScopeInput>;
  userId: Scalars['ID']['input'];
};


export type QueryGradingRecordArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGradingRecordsByHarvestArgs = {
  harvestRecordId: Scalars['ID']['input'];
};


export type QueryHarvestRecordArgs = {
  id: Scalars['ID']['input'];
};


export type QueryHarvestRecordsByStatusArgs = {
  status: HarvestStatus;
};


export type QueryJwtTokensArgs = {
  filter?: InputMaybe<JwtTokenFilterInput>;
};


export type QueryListFeaturesArgs = {
  filter?: InputMaybe<FeatureFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryManagerActionItemsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryManagerAnalyticsArgs = {
  endDate?: InputMaybe<Scalars['Time']['input']>;
  estateId?: InputMaybe<Scalars['ID']['input']>;
  period: AnalyticsPeriod;
  startDate?: InputMaybe<Scalars['Time']['input']>;
};


export type QueryManagersUnderAreaArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMandorActivitiesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMandorBlocksArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMandorEmployeesArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMandorHarvestRecordArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMandorHistoryArgs = {
  filter?: InputMaybe<MandorHistoryFilter>;
};


export type QueryMandorPendingSyncItemsArgs = {
  deviceId: Scalars['String']['input'];
};


export type QueryMandorServerUpdatesArgs = {
  deviceId: Scalars['String']['input'];
  since: Scalars['Time']['input'];
};


export type QueryMandorStatusesArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPendingApprovalsArgs = {
  filter?: InputMaybe<ApprovalFilterInput>;
};


export type QueryPerawatanRecordArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPerawatanRecordsByStatusArgs = {
  status: StatusPerawatan;
};


export type QueryPerawatanRecordsByTypeArgs = {
  jenisPerawatan: JenisPerawatan;
};


export type QueryPermissionArgs = {
  name: Scalars['String']['input'];
};


export type QueryPermissionsArgs = {
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryPksRecordArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPksRecordsByQualityArgs = {
  kualitas: PksKualitas;
};


export type QueryPlatformStatisticsArgs = {
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  dateTo?: InputMaybe<Scalars['Time']['input']>;
};


export type QueryProductionTrendArgs = {
  estateId?: InputMaybe<Scalars['ID']['input']>;
  period: AnalyticsPeriod;
};


export type QueryQualityAnalysisArgs = {
  estateId?: InputMaybe<Scalars['ID']['input']>;
  period: AnalyticsPeriod;
};


export type QueryRbacCanRoleManageArgs = {
  sourceRole: Scalars['String']['input'];
  targetRole: Scalars['String']['input'];
};


export type QueryRbacEffectivePermissionsArgs = {
  roleName: Scalars['String']['input'];
};


export type QueryRbacRoleRelationshipArgs = {
  sourceRole: Scalars['String']['input'];
  targetRole: Scalars['String']['input'];
};


export type QueryRbacRolesAboveArgs = {
  roleName: Scalars['String']['input'];
};


export type QueryRbacRolesAtLevelArgs = {
  level: Scalars['Int']['input'];
};


export type QueryRbacRolesBelowArgs = {
  roleName: Scalars['String']['input'];
};


export type QueryRbacRolesByLevelRangeArgs = {
  maxLevel: Scalars['Int']['input'];
  minLevel: Scalars['Int']['input'];
};


export type QueryRbacSubordinateRolesArgs = {
  roleName: Scalars['String']['input'];
};


export type QueryRbacSuperiorRolesArgs = {
  roleName: Scalars['String']['input'];
};


export type QueryRegionalAlertsArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  severity?: InputMaybe<AlertSeverity>;
  unreadOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryRegionalReportArgs = {
  month?: InputMaybe<Scalars['Int']['input']>;
  period: AnalyticsPeriod;
  year?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRoleArgs = {
  name: Scalars['String']['input'];
};


export type QueryRoleInfoArgs = {
  role: UserRole;
};


export type QueryRolePermissionsArgs = {
  roleName: Scalars['String']['input'];
};


export type QueryRolesArgs = {
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QuerySatpamGuestLogArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySatpamHistoryArgs = {
  filter?: InputMaybe<SatpamHistoryFilter>;
};


export type QuerySatpamPendingSyncItemsArgs = {
  deviceId: Scalars['String']['input'];
};


export type QuerySatpamServerUpdatesArgs = {
  deviceId: Scalars['String']['input'];
  since: Scalars['Time']['input'];
};


export type QuerySearchGuestArgs = {
  query: Scalars['String']['input'];
};


export type QuerySystemActivityLogsArgs = {
  activityType?: InputMaybe<SystemActivityType>;
  companyId?: InputMaybe<Scalars['ID']['input']>;
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySystemAlertsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  severity?: InputMaybe<AlertSeverity>;
  unacknowledgedOnly?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryTimbanganHistoryArgs = {
  filter?: InputMaybe<TimbanganHistoryFilter>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserPermissionOverridesArgs = {
  userId: Scalars['String']['input'];
};


export type QueryUserPermissionsArgs = {
  userId: Scalars['String']['input'];
};


export type QueryUserSessionsArgs = {
  filter?: InputMaybe<SessionFilterInput>;
};


export type QueryUsersArgs = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  role?: InputMaybe<UserRole>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryUsersByCompanyArgs = {
  companyId: Scalars['String']['input'];
};


export type QueryUsersByRoleArgs = {
  role: UserRole;
};


export type QueryValidateDoNumberArgs = {
  doNumber: Scalars['String']['input'];
};


export type QueryValidateSatpamQrArgs = {
  input: ValidateQrInput;
};


export type QueryVehicleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryVehicleTaxArgs = {
  id: Scalars['ID']['input'];
};


export type QueryVehicleTaxDocumentsArgs = {
  vehicleTaxId: Scalars['ID']['input'];
};


export type QueryVehicleTaxesArgs = {
  taxStatus?: InputMaybe<Scalars['String']['input']>;
  taxYear?: InputMaybe<Scalars['Int']['input']>;
  vehicleId: Scalars['ID']['input'];
};


export type QueryVehiclesArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVehiclesInsideArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVehiclesOutsideArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryVehiclesPaginatedArgs = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryWeighingQueueArgs = {
  queueType?: InputMaybe<WeighingQueueType>;
};


export type QueryWeighingRecordArgs = {
  id: Scalars['ID']['input'];
};

/** QueuePriority enum. */
export enum QueuePriority {
  High = 'HIGH',
  Normal = 'NORMAL',
  Urgent = 'URGENT'
}

export type RbacStats = {
  __typename?: 'RBACStats';
  activePermissions: Scalars['Int']['output'];
  activeRoles: Scalars['Int']['output'];
  cacheStats?: Maybe<Scalars['JSON']['output']>;
  totalPermissions: Scalars['Int']['output'];
  totalRolePermissions: Scalars['Int']['output'];
  totalRoles: Scalars['Int']['output'];
  totalUserOverrides: Scalars['Int']['output'];
};

/**
 * RLSContextInfo shows the current PostgreSQL Row-Level Security context.
 * Used for debugging and verification of RLS middleware functionality.
 */
export type RlsContextInfo = {
  __typename?: 'RLSContextInfo';
  /** IP address of the client */
  clientIp?: Maybe<Scalars['String']['output']>;
  /** Company IDs the user has access to */
  companyIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Division IDs the user has access to */
  divisionIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Estate IDs the user has access to */
  estateIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Whether RLS context is currently set */
  isSet: Scalars['Boolean']['output'];
  /** Timestamp when context was set */
  setAt?: Maybe<Scalars['Time']['output']>;
  /** Current authenticated user ID from PostgreSQL session */
  userId?: Maybe<Scalars['String']['output']>;
  /** Current user role from PostgreSQL session */
  userRole?: Maybe<Scalars['String']['output']>;
};

/** RealtimeStats represents real-time statistics. */
export type RealtimeStats = {
  __typename?: 'RealtimeStats';
  /** Active blocks */
  activeBlocks: Scalars['Int']['output'];
  /** Active workers */
  activeWorkers: Scalars['Int']['output'];
  /** Estimated completion time */
  estimatedCompletion?: Maybe<Scalars['Time']['output']>;
  /** Productivity rate (TBS/hour) */
  productivityRate: Scalars['Float']['output'];
  /** Total TBS today */
  totalTbsToday: Scalars['Int']['output'];
  /** Total weight today (tons) */
  totalWeightToday: Scalars['Float']['output'];
};

/** RefreshTokenInput represents the input for token refresh operations. */
export type RefreshTokenInput = {
  /** Device fingerprint for security validation */
  deviceFingerprint?: InputMaybe<Scalars['String']['input']>;
  /** Device ID for mobile token refresh */
  deviceId?: InputMaybe<Scalars['String']['input']>;
  /** Valid refresh token */
  refreshToken: Scalars['String']['input'];
};

/** RegionalAlert for alerts. */
export type RegionalAlert = {
  __typename?: 'RegionalAlert';
  /** Related company */
  companyId?: Maybe<Scalars['String']['output']>;
  /** Related company name */
  companyName?: Maybe<Scalars['String']['output']>;
  /** Created at */
  createdAt: Scalars['Time']['output'];
  /** Alert ID */
  id: Scalars['ID']['output'];
  /** Is read */
  isRead: Scalars['Boolean']['output'];
  /** Message */
  message: Scalars['String']['output'];
  /** Severity */
  severity: AlertSeverity;
  /** Title */
  title: Scalars['String']['output'];
  /** Alert type */
  type: RegionalAlertType;
};

/** RegionalAlertType enum. */
export enum RegionalAlertType {
  /** Compliance issue */
  ComplianceIssue = 'COMPLIANCE_ISSUE',
  /** Equipment issue */
  EquipmentIssue = 'EQUIPMENT_ISSUE',
  /** Production below target */
  ProductionBelowTarget = 'PRODUCTION_BELOW_TARGET',
  /** Quality issue */
  QualityIssue = 'QUALITY_ISSUE',
  /** Security alert */
  SecurityAlert = 'SECURITY_ALERT',
  /** Staff shortage */
  StaffShortage = 'STAFF_SHORTAGE'
}

/** RegionalReportData for regional reports. */
export type RegionalReportData = {
  __typename?: 'RegionalReportData';
  /** Company details */
  companyDetails: Array<CompanyReportDetail>;
  /** Executive summary */
  executiveSummary: ExecutiveSummary;
  /** Generated at */
  generatedAt: Scalars['Time']['output'];
  /** Report period */
  period: Scalars['String']['output'];
  /** Recommendations */
  recommendations: Array<Scalars['String']['output']>;
};

/** RegionalTrends for regional trends. */
export type RegionalTrends = {
  __typename?: 'RegionalTrends';
  /** Efficiency trend */
  efficiencyTrend: Array<TrendDataPoint>;
  /** Production trend */
  productionTrend: Array<TrendDataPoint>;
  /** Quality trend */
  qualityTrend: Array<TrendDataPoint>;
};

/** RegisterFCMTokenInput for registering FCM push notification tokens */
export type RegisterFcmTokenInput = {
  /** Device ID for identification */
  deviceId: Scalars['String']['input'];
  /** Platform: ANDROID or IOS */
  platform: Scalars['String']['input'];
  /** FCM registration token from Firebase */
  token: Scalars['String']['input'];
};

/** RegistrationSource enum for identifying how a guest log was created. */
export enum RegistrationSource {
  /** Manual entry by Satpam */
  Manual = 'MANUAL',
  /** Entry via QR code scan */
  QrScan = 'QR_SCAN'
}

export type RejectHarvestInput = {
  id: Scalars['ID']['input'];
  rejectedReason: Scalars['String']['input'];
};

/** ResetPasswordInput represents the input for resetting a user's password. */
export type ResetPasswordInput = {
  /** Whether to logout from all devices */
  logoutOtherDevices?: InputMaybe<Scalars['Boolean']['input']>;
  /** New temporary password */
  newPassword: Scalars['String']['input'];
  /** Whether to require password change on next login */
  requirePasswordChange?: InputMaybe<Scalars['Boolean']['input']>;
  /** User ID whose password should be reset */
  userId: Scalars['ID']['input'];
};

/** RevokeJWTTokenResponse describes revoke operation result. */
export type RevokeJwtTokenResponse = {
  __typename?: 'RevokeJWTTokenResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

/** RevokeUserFeatureInput represents input for revoking a user feature assignment. */
export type RevokeUserFeatureInput = {
  /** Feature code to revoke */
  feature: Scalars['String']['input'];
  /** Scope (must match the original grant/denial) */
  scope?: InputMaybe<FeatureScopeInput>;
  /** User ID */
  userId: Scalars['ID']['input'];
};

export type Role = {
  __typename?: 'Role';
  createdAt: Scalars['Time']['output'];
  deletedAt?: Maybe<Scalars['Time']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isSystem: Scalars['Boolean']['output'];
  level: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

/** RoleAccessCheck represents the result of a role access check. */
export type RoleAccessCheck = {
  __typename?: 'RoleAccessCheck';
  /** Whether the requester can access the target role */
  canAccess: Scalars['Boolean']['output'];
  /** Whether the requester can assign the target role */
  canAssignRole: Scalars['Boolean']['output'];
  /** Whether the requester can manage the target role */
  canManage: Scalars['Boolean']['output'];
  /** Explanation of the access decision */
  explanation?: Maybe<Scalars['String']['output']>;
  /** The requester's role */
  requesterRole: UserRole;
  /** The target role being checked */
  targetRole: UserRole;
};

/**
 * RoleFeature represents the assignment of features to roles.
 * This is the primary mechanism for feature-based authorization.
 */
export type RoleFeature = {
  __typename?: 'RoleFeature';
  /** When this assignment was created */
  createdAt: Scalars['Time']['output'];
  /** When this assignment expires */
  expiresAt?: Maybe<Scalars['Time']['output']>;
  /** Feature details */
  feature: Feature;
  /** Feature ID */
  featureId: Scalars['ID']['output'];
  /** When this feature was granted to the role */
  grantedAt: Scalars['Time']['output'];
  /** User who granted this feature */
  grantedBy: Scalars['ID']['output'];
  /** Unique identifier */
  id: Scalars['ID']['output'];
  /** Role this feature was inherited from (if applicable) */
  inheritedFromRoleId?: Maybe<Scalars['ID']['output']>;
  /** Whether this feature is denied for this role */
  isDenied: Scalars['Boolean']['output'];
  /** Role ID */
  roleId: Scalars['ID']['output'];
};

export type RoleHierarchyNode = {
  __typename?: 'RoleHierarchyNode';
  children?: Maybe<Array<RoleHierarchyNode>>;
  level: Scalars['Int']['output'];
  permissions?: Maybe<Array<Scalars['String']['output']>>;
  role: Role;
};

/** RoleHierarchyTree represents the complete role hierarchy organized by levels. */
export type RoleHierarchyTree = {
  __typename?: 'RoleHierarchyTree';
  /** Level number (1 = highest authority) */
  level: Scalars['Int']['output'];
  /** Roles at this hierarchical level */
  roles: Array<RoleInfo>;
};

/** RoleInfo contains comprehensive information about a role including its hierarchical level and permissions. */
export type RoleInfo = {
  __typename?: 'RoleInfo';
  /** Role description */
  description: Scalars['String']['output'];
  /** Hierarchical level (1 = highest authority) */
  level: Scalars['Int']['output'];
  /** Whether this role has mobile application access */
  mobileAccess: Scalars['Boolean']['output'];
  /** Human-readable name */
  name: Scalars['String']['output'];
  /** List of permissions assigned to this role */
  permissions: Array<Scalars['String']['output']>;
  /** The user role */
  role: UserRole;
  /** Whether this role has web dashboard access */
  webAccess: Scalars['Boolean']['output'];
};

export type RolePermission = {
  __typename?: 'RolePermission';
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  inheritedFromRole?: Maybe<Role>;
  isDenied: Scalars['Boolean']['output'];
  permission: Permission;
  role: Role;
};

/** RolePermissionCheck represents the result of a permission check. */
export type RolePermissionCheck = {
  __typename?: 'RolePermissionCheck';
  /** Whether the requester has the permission */
  hasPermission: Scalars['Boolean']['output'];
  /** The specific permission that was checked */
  permission: Scalars['String']['output'];
  /** Reason why permission was granted or denied */
  reason?: Maybe<Scalars['String']['output']>;
};

export type RolePermissionInput = {
  inheritFrom?: InputMaybe<Scalars['String']['input']>;
  permissions: Array<Scalars['String']['input']>;
  roleName: Scalars['String']['input'];
};

export type RoleRelationship = {
  __typename?: 'RoleRelationship';
  canManage: Scalars['Boolean']['output'];
  levelDifference: Scalars['Int']['output'];
  relationship: Scalars['String']['output'];
  sourceRole: Scalars['String']['output'];
  targetRole: Scalars['String']['output'];
};

/** RoleUserCount for role breakdown. */
export type RoleUserCount = {
  __typename?: 'RoleUserCount';
  /** Active count */
  active: Scalars['Int']['output'];
  /** Count */
  count: Scalars['Int']['output'];
  /** Role */
  role: Scalars['String']['output'];
};

/**
 * RoleValidation provides strict validation for role format and
 * conforms to the standardized role requirements.
 */
export type RoleValidation = {
  __typename?: 'RoleValidation';
  /** Gets all supported standard roles */
  getSupportedRoles: Array<UserRole>;
  /** Validates if role string is in correct standard format */
  validateRoleString: Scalars['Boolean']['output'];
  /** Validates and normalizes role string to UserRole enum */
  validateToEnum?: Maybe<UserRole>;
};


/**
 * RoleValidation provides strict validation for role format and
 * conforms to the standardized role requirements.
 */
export type RoleValidationValidateRoleStringArgs = {
  roleString: Scalars['String']['input'];
};


/**
 * RoleValidation provides strict validation for role format and
 * conforms to the standardized role requirements.
 */
export type RoleValidationValidateToEnumArgs = {
  roleString: Scalars['String']['input'];
};

/** SatpamActivity represents a recent activity. */
export type SatpamActivity = {
  __typename?: 'SatpamActivity';
  /** Description */
  description: Scalars['String']['output'];
  /** Related entity ID */
  entityId?: Maybe<Scalars['String']['output']>;
  /** Gate name/position */
  gate?: Maybe<Scalars['String']['output']>;
  /** Generation intent (ENTRY or EXIT) */
  generationIntent?: Maybe<GateIntent>;
  /** Activity ID */
  id: Scalars['ID']['output'];
  /** Timestamp */
  timestamp: Scalars['Time']['output'];
  /** Title */
  title: Scalars['String']['output'];
  /** Activity type */
  type: SatpamActivityType;
};

/** SatpamActivityType enum. */
export enum SatpamActivityType {
  /** Data synced */
  DataSynced = 'DATA_SYNCED',
  /** Guest registered */
  GuestRegistered = 'GUEST_REGISTERED',
  /** Overstay alert */
  OverstayAlert = 'OVERSTAY_ALERT',
  /** QR scanned */
  QrScanned = 'QR_SCANNED',
  /** Vehicle entered */
  VehicleEntry = 'VEHICLE_ENTRY',
  /** Vehicle exited */
  VehicleExit = 'VEHICLE_EXIT'
}

/** SatpamDashboardData represents aggregated dashboard data for Satpam. */
export type SatpamDashboardData = {
  __typename?: 'SatpamDashboardData';
  /** Current POS information */
  posInfo: PosInfo;
  /** Recent activities */
  recentActivities: Array<SatpamActivity>;
  /** Current shift info */
  shiftInfo: ShiftInfo;
  /** Dashboard statistics */
  stats: SatpamDashboardStats;
  /** Sync status */
  syncStatus: SatpamSyncStatus;
  /** Basic user information */
  user: User;
  /** Current vehicles completed (entry and exit today) */
  vehiclesCompleted: Array<VehicleCompletedInfo>;
  /** Current vehicles inside */
  vehiclesInside: Array<VehicleInsideInfo>;
  /** Current vehicles outside (exited today, no same-day entry) */
  vehiclesOutside: Array<VehicleOutsideInfo>;
};

/** SatpamDashboardStats represents key metrics for satpam dashboard. */
export type SatpamDashboardStats = {
  __typename?: 'SatpamDashboardStats';
  /** Average processing time (minutes) */
  avgProcessingTime: Scalars['Float']['output'];
  /** Guests registered today */
  guestsToday: Scalars['Int']['output'];
  /** Missing entry count (EXIT without prior ENTRY) */
  missingEntryCount: Scalars['Int']['output'];
  /** Missing exit count (ENTRY > 24h without EXIT) */
  missingExitCount: Scalars['Int']['output'];
  /** Overstay count (> 8 hours) */
  overstayCount: Scalars['Int']['output'];
  /** Pending exits */
  pendingExits: Scalars['Int']['output'];
  /** QR scans today */
  qrScansToday: Scalars['Int']['output'];
  /** Today's entries */
  todayEntries: Scalars['Int']['output'];
  /** Today's exits */
  todayExits: Scalars['Int']['output'];
  /** Vehicles currently inside */
  vehiclesInside: Scalars['Int']['output'];
  /** Vehicles currently outside (exited today without same-day entry) */
  vehiclesOutside: Scalars['Int']['output'];
};

/** SatpamGuestLog represents a guest log entry for satpam. */
export type SatpamGuestLog = {
  __typename?: 'SatpamGuestLog';
  /** Cargo owner */
  cargoOwner?: Maybe<Scalars['String']['output']>;
  /** Cargo volume (e.g., Seperempat, Setengah, Penuh) */
  cargoVolume?: Maybe<Scalars['String']['output']>;
  /** Company ID */
  companyId: Scalars['String']['output'];
  /** Created at */
  createdAt: Scalars['Time']['output'];
  /** Created by */
  createdBy: Scalars['String']['output'];
  /** Delivery order number */
  deliveryOrderNumber?: Maybe<Scalars['String']['output']>;
  /** Destination */
  destination?: Maybe<Scalars['String']['output']>;
  /** Device ID */
  deviceId?: Maybe<Scalars['String']['output']>;
  /** Driver name */
  driverName: Scalars['String']['output'];
  /** Entry gate name */
  entryGate?: Maybe<Scalars['String']['output']>;
  /** Entry time */
  entryTime?: Maybe<Scalars['Time']['output']>;
  /** Estimated weight */
  estimatedWeight?: Maybe<Scalars['Float']['output']>;
  /** Exit gate name */
  exitGate?: Maybe<Scalars['String']['output']>;
  /** Exit time */
  exitTime?: Maybe<Scalars['Time']['output']>;
  /** Gate position (POS ID) */
  gatePosition?: Maybe<Scalars['String']['output']>;
  /** Generation intent (ENTRY or EXIT) - single source of truth */
  generationIntent?: Maybe<GateIntent>;
  /** Log ID */
  id: Scalars['ID']['output'];
  /** ID card number */
  idCardNumber?: Maybe<Scalars['String']['output']>;
  /** GPS latitude */
  latitude?: Maybe<Scalars['Float']['output']>;
  /** Load type (Jenis Muatan - e.g., TBS, Pupuk, Alat Berat) */
  loadType?: Maybe<Scalars['String']['output']>;
  /** Local ID */
  localId?: Maybe<Scalars['String']['output']>;
  /** GPS longitude */
  longitude?: Maybe<Scalars['Float']['output']>;
  /** Notes */
  notes?: Maybe<Scalars['String']['output']>;
  /** Photo URL (Representative photo) */
  photoUrl?: Maybe<Scalars['String']['output']>;
  /** Photos associated with this log */
  photos?: Maybe<Array<SatpamPhoto>>;
  /** QR code */
  qrCodeData?: Maybe<Scalars['String']['output']>;
  /** Registration source */
  registrationSource?: Maybe<RegistrationSource>;
  /** Second cargo (Muatan 2nd from Satpam validation) */
  secondCargo?: Maybe<Scalars['String']['output']>;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['output'];
  /** Vehicle type */
  vehicleType: VehicleType;
};

/** SatpamGuestLogSyncData for sync payload. */
export type SatpamGuestLogSyncData = {
  /** Cargo owner */
  cargoOwner?: InputMaybe<Scalars['String']['input']>;
  /** Cargo volume (e.g., Seperempat, Setengah, Penuh) */
  cargoVolume?: InputMaybe<Scalars['String']['input']>;
  /** Delivery order number */
  deliveryOrderNumber?: InputMaybe<Scalars['String']['input']>;
  /** Destination */
  destination?: InputMaybe<Scalars['String']['input']>;
  /** Driver name */
  driverName: Scalars['String']['input'];
  /** Entry gate name/position */
  entryGate?: InputMaybe<Scalars['String']['input']>;
  /** Entry time */
  entryTime?: InputMaybe<Scalars['Time']['input']>;
  /** Estimated weight */
  estimatedWeight?: InputMaybe<Scalars['Float']['input']>;
  /** Exit gate name/position */
  exitGate?: InputMaybe<Scalars['String']['input']>;
  /** Exit time */
  exitTime?: InputMaybe<Scalars['Time']['input']>;
  /** Gate position */
  gatePosition: Scalars['String']['input'];
  /** Generation intent (ENTRY or EXIT) */
  generationIntent: GateIntent;
  /** ID card number */
  idCardNumber?: InputMaybe<Scalars['String']['input']>;
  /** Latitude */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** Load type (Jenis Muatan - e.g., TBS, Pupuk, Alat Berat) */
  loadType?: InputMaybe<Scalars['String']['input']>;
  /** Local ID */
  localId?: InputMaybe<Scalars['String']['input']>;
  /** Longitude */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** Notes */
  notes?: InputMaybe<Scalars['String']['input']>;
  /** QR Token */
  qrToken?: InputMaybe<Scalars['String']['input']>;
  /** Registration source */
  registrationSource?: InputMaybe<RegistrationSource>;
  /** Second cargo */
  secondCargo?: InputMaybe<Scalars['String']['input']>;
  /** Status from mobile (ENTRY or EXIT) - raw pass-through */
  status?: InputMaybe<GuestLogStatus>;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['input'];
  /** Vehicle type */
  vehicleType: VehicleType;
};

/** SatpamGuestLogSyncRecord for sync. */
export type SatpamGuestLogSyncRecord = {
  /** Guest log data */
  data: SatpamGuestLogSyncData;
  /** Local ID (Client UUID) */
  id: Scalars['String']['input'];
  /** Last updated */
  lastUpdated: Scalars['Time']['input'];
  /** Local version */
  localVersion: Scalars['Int']['input'];
  /** Operation */
  operation: SyncOperation;
  /** Photo IDs */
  photoIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Server ID */
  serverId?: InputMaybe<Scalars['String']['input']>;
};

/** SatpamHistoryFilter for filtering history. */
export type SatpamHistoryFilter = {
  /** Date from */
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  /** Date to */
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  /** Page */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Page size */
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  /** Search query (plate, name, company) */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Sort by */
  sortBy?: InputMaybe<SatpamHistorySortField>;
  /** Sort direction */
  sortDirection?: InputMaybe<SortDirection>;
  /** Filter by status */
  status?: InputMaybe<GuestLogStatus>;
  /** Filter by vehicle type */
  vehicleType?: InputMaybe<VehicleType>;
};

/** SatpamHistoryResponse for paginated history. */
export type SatpamHistoryResponse = {
  __typename?: 'SatpamHistoryResponse';
  /** Has more */
  hasMore: Scalars['Boolean']['output'];
  /** History items */
  items: Array<SatpamGuestLog>;
  /** Summary */
  summary: SatpamHistorySummary;
  /** Sync status statistics across all data */
  syncStats: SyncStatusStats;
  /** Total count */
  totalCount: Scalars['Int']['output'];
};

/** SatpamHistorySortField enum. */
export enum SatpamHistorySortField {
  DriverName = 'DRIVER_NAME',
  Duration = 'DURATION',
  EntryTime = 'ENTRY_TIME',
  ExitTime = 'EXIT_TIME',
  VehiclePlate = 'VEHICLE_PLATE'
}

/** SatpamHistorySummary for history statistics. */
export type SatpamHistorySummary = {
  __typename?: 'SatpamHistorySummary';
  /** Avg duration */
  avgDuration: Scalars['Float']['output'];
  /** Currently inside */
  currentlyInside: Scalars['Int']['output'];
  /** Overstay count */
  overstayCount: Scalars['Int']['output'];
  /** Total entries */
  totalEntries: Scalars['Int']['output'];
  /** Total exits */
  totalExits: Scalars['Int']['output'];
};

/** SatpamPendingSyncData represents sync data returned from server. */
export type SatpamPendingSyncData = {
  __typename?: 'SatpamPendingSyncData';
  /** Cargo owner */
  cargoOwner?: Maybe<Scalars['String']['output']>;
  /** Cargo volume (e.g., Seperempat, Setengah, Penuh) */
  cargoVolume?: Maybe<Scalars['String']['output']>;
  /** Delivery order number */
  deliveryOrderNumber?: Maybe<Scalars['String']['output']>;
  /** Destination */
  destination?: Maybe<Scalars['String']['output']>;
  /** Driver name */
  driverName: Scalars['String']['output'];
  /** Estimated weight */
  estimatedWeight?: Maybe<Scalars['Float']['output']>;
  /** Gate Position */
  gatePosition?: Maybe<Scalars['String']['output']>;
  /** Local ID */
  id?: Maybe<Scalars['String']['output']>;
  /** ID card number */
  idCardNumber?: Maybe<Scalars['String']['output']>;
  /** Load type (Jenis Muatan - e.g., TBS, Pupuk, Alat Berat) */
  loadType?: Maybe<Scalars['String']['output']>;
  /** Notes */
  notes?: Maybe<Scalars['String']['output']>;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['output'];
  /** Vehicle type */
  vehicleType: VehicleType;
};

/** SatpamPendingSyncItem represents a pending sync item returned from server. */
export type SatpamPendingSyncItem = {
  __typename?: 'SatpamPendingSyncItem';
  /** Guest log data */
  data?: Maybe<SatpamPendingSyncData>;
  /** Local ID */
  id: Scalars['String']['output'];
  /** Last updated locally */
  lastUpdated: Scalars['Time']['output'];
  /** Local version */
  localVersion: Scalars['Int']['output'];
  /** Operation type */
  operation: SyncOperation;
  /** Photo IDs to sync */
  photoIds?: Maybe<Array<Scalars['String']['output']>>;
  /** Server ID (if exists) */
  serverId?: Maybe<Scalars['String']['output']>;
};

/** SatpamPhoto represents a photo attached to a guest log. */
export type SatpamPhoto = {
  __typename?: 'SatpamPhoto';
  /** Internal ID */
  id: Scalars['ID']['output'];
  /** Public Photo ID */
  photoId: Scalars['String']['output'];
  /** Context of the photo (ENTRY, EXIT, FRONT, BACK, etc.) */
  photoType: PhotoType;
  /** Full URL to the photo */
  photoUrl: Scalars['String']['output'];
  /** When the photo was taken */
  takenAt: Scalars['Time']['output'];
};

/** SatpamPhotoSyncInput for photo sync. */
export type SatpamPhotoSyncInput = {
  /** Batch ID */
  batchId?: InputMaybe<Scalars['String']['input']>;
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Photos */
  photos: Array<SatpamPhotoSyncRecord>;
};

/** SatpamPhotoSyncRecord for photo. */
export type SatpamPhotoSyncRecord = {
  /** File hash */
  fileHash: Scalars['String']['input'];
  /** File name */
  fileName: Scalars['String']['input'];
  /** File size */
  fileSize: Scalars['Int']['input'];
  /** Related guest log ID */
  guestLogId: Scalars['String']['input'];
  /** Local ID */
  localId: Scalars['String']['input'];
  /** Local path */
  localPath: Scalars['String']['input'];
  /** Photo data (base64) */
  photoData: Scalars['String']['input'];
  /** Photo ID */
  photoId: Scalars['String']['input'];
  /** Photo type */
  photoType: PhotoType;
  /** Taken at */
  takenAt: Scalars['Time']['input'];
};

/** SatpamPhotoSyncResult for photo sync. */
export type SatpamPhotoSyncResult = {
  __typename?: 'SatpamPhotoSyncResult';
  /** Errors */
  errors: Array<PhotoUploadError>;
  /** Failed */
  failedUploads: Scalars['Int']['output'];
  /** Photos processed */
  photosProcessed: Scalars['Int']['output'];
  /** Successful */
  successfulUploads: Scalars['Int']['output'];
  /** Synced at */
  syncedAt: Scalars['Time']['output'];
  /** Bytes uploaded */
  totalBytesUploaded: Scalars['Int']['output'];
};

/** SatpamProfile provides security gate check access. */
export type SatpamProfile = {
  __typename?: 'SatpamProfile';
  /** Company this security guard belongs to */
  company: Company;
  /** Gate check statistics and access */
  gateStats?: Maybe<GateStats>;
  /** Basic user information */
  user: User;
};

/** SatpamQRToken represents a QR token for satpam operations. */
export type SatpamQrToken = {
  __typename?: 'SatpamQRToken';
  /** Allowed scan intent */
  allowedScan: GateIntent;
  /** Expires at */
  expiresAt: Scalars['Time']['output'];
  /** Generated at */
  generatedAt: Scalars['Time']['output'];
  /** Generation intent */
  generationIntent: GateIntent;
  /** Associated guest log ID */
  guestLogId?: Maybe<Scalars['String']['output']>;
  /** Token ID */
  id: Scalars['ID']['output'];
  /** Token JTI */
  jti: Scalars['String']['output'];
  /** Status */
  status: QrTokenStatus;
  /** JWT token string */
  token: Scalars['String']['output'];
};

/** SatpamQRTokenSyncRecord for QR token sync. */
export type SatpamQrTokenSyncRecord = {
  /** Current usage */
  currentUsage: Scalars['Int']['input'];
  /** Generation intent */
  generationIntent: GateIntent;
  /** Guest log ID */
  guestLogId?: InputMaybe<Scalars['String']['input']>;
  /** JTI */
  jti: Scalars['String']['input'];
  /** Local ID */
  localId: Scalars['String']['input'];
  /** Local version */
  localVersion: Scalars['Int']['input'];
  /** Server ID */
  serverId?: InputMaybe<Scalars['String']['input']>;
  /** Status */
  status: QrTokenStatus;
};

/** SatpamSyncInput for syncing gate check records. */
export type SatpamSyncInput = {
  /** Batch ID */
  batchId?: InputMaybe<Scalars['String']['input']>;
  /** Client timestamp */
  clientTimestamp: Scalars['Time']['input'];
  /** Conflict resolution */
  conflictResolution?: InputMaybe<ConflictResolution>;
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Guest logs to sync */
  guestLogs: Array<SatpamGuestLogSyncRecord>;
  /** QR tokens to sync */
  qrTokens?: InputMaybe<Array<SatpamQrTokenSyncRecord>>;
};

/** SatpamSyncItemResult for individual item. */
export type SatpamSyncItemResult = {
  __typename?: 'SatpamSyncItemResult';
  /** Error */
  error?: Maybe<Scalars['String']['output']>;
  /** Has conflict */
  hasConflict: Scalars['Boolean']['output'];
  /** Local ID */
  id: Scalars['String']['output'];
  /** Record type */
  recordType: Scalars['String']['output'];
  /** Server ID */
  serverId?: Maybe<Scalars['String']['output']>;
  /** Server version */
  serverVersion?: Maybe<Scalars['Int']['output']>;
  /** Success */
  success: Scalars['Boolean']['output'];
};

/** SatpamSyncResult for sync operation. */
export type SatpamSyncResult = {
  __typename?: 'SatpamSyncResult';
  /** Conflicts detected */
  conflictsDetected: Scalars['Int']['output'];
  /** Guest logs failed */
  guestLogsFailed: Scalars['Int']['output'];
  /** Guest logs processed */
  guestLogsProcessed: Scalars['Int']['output'];
  /** Guest logs successful */
  guestLogsSuccessful: Scalars['Int']['output'];
  /** Message */
  message: Scalars['String']['output'];
  /** QR tokens processed */
  qrTokensProcessed: Scalars['Int']['output'];
  /** QR tokens successful */
  qrTokensSuccessful: Scalars['Int']['output'];
  /** Results */
  results: Array<SatpamSyncItemResult>;
  /** Server timestamp */
  serverTimestamp: Scalars['Time']['output'];
  /** Success */
  success: Scalars['Boolean']['output'];
  /** Transaction ID */
  transactionId: Scalars['String']['output'];
};

/** SatpamSyncStatus represents offline sync status. */
export type SatpamSyncStatus = {
  __typename?: 'SatpamSyncStatus';
  /** Failed sync count */
  failedSyncCount: Scalars['Int']['output'];
  /** Is online */
  isOnline: Scalars['Boolean']['output'];
  /** Last sync timestamp */
  lastSyncAt?: Maybe<Scalars['Time']['output']>;
  /** Last sync result */
  lastSyncResult?: Maybe<Scalars['String']['output']>;
  /** Pending sync count */
  pendingSyncCount: Scalars['Int']['output'];
  /** Photos pending upload */
  photosPendingUpload: Scalars['Int']['output'];
  /** Unique device count */
  uniqueDeviceCount: Scalars['Int']['output'];
};

/** ScopedFeature represents a feature with scope information. */
export type ScopedFeature = {
  __typename?: 'ScopedFeature';
  /** When this feature access expires */
  expiresAt?: Maybe<Scalars['Time']['output']>;
  /** Feature code */
  feature: Scalars['String']['output'];
  /** Whether this feature is granted */
  isGranted: Scalars['Boolean']['output'];
  /** Scope information (if scoped) */
  scope?: Maybe<FeatureScope>;
};

/** SecuritySettings for security. */
export type SecuritySettings = {
  __typename?: 'SecuritySettings';
  /** Allowed IP ranges */
  allowedIpRanges?: Maybe<Array<Scalars['String']['output']>>;
  /** Max failed logins */
  maxFailedLogins: Scalars['Int']['output'];
  /** Password expiry days */
  passwordExpiryDays: Scalars['Int']['output'];
  /** Session timeout (minutes) */
  sessionTimeout: Scalars['Int']['output'];
  /** Two factor required */
  twoFactorRequired: Scalars['Boolean']['output'];
};

/** SecuritySettingsInput for security. */
export type SecuritySettingsInput = {
  /** Max failed logins */
  maxFailedLogins?: InputMaybe<Scalars['Int']['input']>;
  /** Password expiry days */
  passwordExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  /** Session timeout */
  sessionTimeout?: InputMaybe<Scalars['Int']['input']>;
  /** Two factor required */
  twoFactorRequired?: InputMaybe<Scalars['Boolean']['input']>;
};

/** ServiceStatus enum. */
export enum ServiceStatus {
  Degraded = 'DEGRADED',
  Offline = 'OFFLINE',
  Online = 'ONLINE',
  Unknown = 'UNKNOWN'
}

/** SessionFilterInput allows filtering user sessions. */
export type SessionFilterInput = {
  /** Filter only active sessions (not expired and not revoked) */
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by platform */
  platform?: InputMaybe<Scalars['String']['input']>;
  /** Filter by revoked status */
  revoked?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by user ID */
  userId?: InputMaybe<Scalars['UUID']['input']>;
};

/** ShiftInfo represents current shift information. */
export type ShiftInfo = {
  __typename?: 'ShiftInfo';
  /** Entries this shift */
  entriesThisShift: Scalars['Int']['output'];
  /** Exits this shift */
  exitsThisShift: Scalars['Int']['output'];
  /** Shift end */
  shiftEnd: Scalars['Time']['output'];
  /** Shift name */
  shiftName: Scalars['String']['output'];
  /** Shift start */
  shiftStart: Scalars['Time']['output'];
};

/** SortDirection for ordering results. */
export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Maintenance status. */
export enum StatusPerawatan {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  InProgress = 'IN_PROGRESS',
  Planned = 'PLANNED'
}

/** StorageSettings for storage configuration. */
export type StorageSettings = {
  __typename?: 'StorageSettings';
  /** Allowed file types */
  allowedFileTypes: Array<Scalars['String']['output']>;
  /** Auto cleanup days */
  autoCleanupDays?: Maybe<Scalars['Int']['output']>;
  /** Max upload size (MB) */
  maxUploadSizeMb: Scalars['Int']['output'];
  /** Provider */
  provider: Scalars['String']['output'];
};

/** StorageSettingsInput for storage. */
export type StorageSettingsInput = {
  /** Auto cleanup days */
  autoCleanupDays?: InputMaybe<Scalars['Int']['input']>;
  /** Max upload size (MB) */
  maxUploadSizeMb?: InputMaybe<Scalars['Int']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Monitoring data updates */
  asistenMonitoringUpdate: AsistenMonitoringData;
  /** Block activity updates */
  blockActivityUpdate: BlockActivity;
  /** Company created */
  companyCreated: Company;
  /** Company deleted */
  companyDeleted: Scalars['ID']['output'];
  /** Company status change */
  companyStatusChange: CompanyPerformanceData;
  /** Company status changed */
  companyStatusChanged: Company;
  /** Company updated */
  companyUpdated: Company;
  /**
   * Subscribe to feature updates.
   * Emits events when features are created, updated, or deleted.
   * Requires SUPER_ADMIN or COMPANY_ADMIN role.
   */
  featureUpdates: FeatureUpdateEvent;
  gradingApproved: GradingRecord;
  gradingRejected: GradingRecord;
  gradingUpdated: GradingRecord;
  /** Real-time harvest activity updates */
  harvestActivityUpdate: HarvestActivity;
  harvestRecordApproved: HarvestRecord;
  harvestRecordCreated: HarvestRecord;
  harvestRecordRejected: HarvestRecord;
  /** Manager alert notifications */
  managerAlert: ManagerEvent;
  /** Real-time monitor updates for manager */
  managerMonitorUpdate: ManagerMonitorData;
  /** Harvest status update notification */
  mandorHarvestStatusUpdate: MandorHarvestRecord;
  /** Mandor status changes */
  mandorStatusChange: MandorStatus;
  /** Sync status updates */
  mandorSyncUpdate: MandorSyncStatus;
  /** New admin activity */
  newAdminActivity: AdminActivityLog;
  /** New company registration */
  newCompanyRegistration: CompanyDetailAdmin;
  /** New harvest submission notification */
  newHarvestSubmission: ApprovalItem;
  /** New regional alert */
  newRegionalAlert: RegionalAlert;
  /** New system alert */
  newSystemAlert: SystemAlert;
  /** New vehicle in queue */
  newVehicleInQueue: WeighingQueueItem;
  /** Overstay alerts */
  satpamOverstayAlert: VehicleInsideInfo;
  /** Sync status updates */
  satpamSyncUpdate: SatpamSyncStatus;
  /** New vehicle entry notification */
  satpamVehicleEntry: SatpamGuestLog;
  /** Vehicle exit notification */
  satpamVehicleExit: SatpamGuestLog;
  /** System health change */
  systemHealthChange: SystemHealthData;
  /** System status change */
  systemStatusChange: SystemOverview;
  /**
   * Subscribe to user feature changes.
   * Emits events when a user's features are modified.
   * Users can subscribe to their own updates, admins can subscribe to any user.
   */
  userFeatureUpdates: UserFeatureUpdateEvent;
  /** User status change */
  userStatusChange: CompanyUser;
  /** Weighing completed */
  weighingCompleted: WeighingRecord;
};


export type SubscriptionBlockActivityUpdateArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionHarvestActivityUpdateArgs = {
  estateId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionMandorStatusChangeArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionMandorSyncUpdateArgs = {
  deviceId: Scalars['String']['input'];
};


export type SubscriptionNewHarvestSubmissionArgs = {
  divisionId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionSatpamSyncUpdateArgs = {
  deviceId: Scalars['String']['input'];
};


export type SubscriptionUserFeatureUpdatesArgs = {
  userId: Scalars['ID']['input'];
};

/** SubscriptionInfo for subscription details. */
export type SubscriptionInfo = {
  __typename?: 'SubscriptionInfo';
  /** End date */
  endDate?: Maybe<Scalars['Time']['output']>;
  /** Features enabled */
  featuresEnabled: Array<Scalars['String']['output']>;
  /** Is trial */
  isTrial: Scalars['Boolean']['output'];
  /** Max estates */
  maxEstates: Scalars['Int']['output'];
  /** Max storage (GB) */
  maxStorageGb: Scalars['Float']['output'];
  /** Max users */
  maxUsers: Scalars['Int']['output'];
  /** Plan name */
  planName: Scalars['String']['output'];
  /** Plan type */
  planType: PlanType;
  /** Start date */
  startDate: Scalars['Time']['output'];
  /** Trial ends at */
  trialEndsAt?: Maybe<Scalars['Time']['output']>;
};

/** SuperAdminDashboardData represents dashboard for Super Admin. */
export type SuperAdminDashboardData = {
  __typename?: 'SuperAdminDashboardData';
  /** Platform statistics */
  platformStats: PlatformStats;
  /** Recent system activities */
  recentActivities: Array<SystemActivityLog>;
  /** System alerts */
  systemAlerts: Array<SystemAlert>;
  /** System overview */
  systemOverview: SystemOverview;
  /** Tenant (companies) overview */
  tenantOverview: TenantOverview;
  /** User information */
  user: User;
};

/** SuperAdminProfile provides system-wide access and administrative data. */
export type SuperAdminProfile = {
  __typename?: 'SuperAdminProfile';
  /** All companies in the system */
  companies: Array<Company>;
  /** Access to all divisions across estates */
  divisions: Array<Division>;
  /** Access to all estates across companies */
  estates: Array<Estate>;
  /** System statistics and health metrics */
  systemStats?: Maybe<SystemStats>;
  /** Basic user information */
  user: User;
};

export type SyncEmployeeInput = {
  companyId: Scalars['ID']['input'];
  isActive: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  nik: Scalars['String']['input'];
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  role: Scalars['String']['input'];
};

/** SyncOperation represents sync operation types. */
export enum SyncOperation {
  /** Batch operation */
  Batch = 'BATCH',
  /** Create new record */
  Create = 'CREATE',
  /** Delete record */
  Delete = 'DELETE',
  /** Update existing record */
  Update = 'UPDATE'
}

/** Sync Status represents the synchronization state of a record. */
export enum SyncStatus {
  /** Successfully synchronized */
  Completed = 'COMPLETED',
  /** Conflict detected during sync */
  Conflict = 'CONFLICT',
  /** Synchronization failed */
  Failed = 'FAILED',
  /** Currently being synchronized */
  InProgress = 'IN_PROGRESS',
  /** Waiting to be synchronized */
  Pending = 'PENDING'
}

/** SyncStatusStats for sync status aggregate counts (across all data). */
export type SyncStatusStats = {
  __typename?: 'SyncStatusStats';
  /** Total conflict records */
  totalConflict: Scalars['Int']['output'];
  /** Total failed records */
  totalFailed: Scalars['Int']['output'];
  /** Total pending records */
  totalPending: Scalars['Int']['output'];
  /** Total synced records */
  totalSynced: Scalars['Int']['output'];
};

/** SystemActivityLog for system activity. */
export type SystemActivityLog = {
  __typename?: 'SystemActivityLog';
  /** Actor */
  actor: Scalars['String']['output'];
  /** Actor type */
  actorType: ActorType;
  /** Company ID */
  companyId?: Maybe<Scalars['String']['output']>;
  /** Company name */
  companyName?: Maybe<Scalars['String']['output']>;
  /** Description */
  description: Scalars['String']['output'];
  /** Entity ID */
  entityId?: Maybe<Scalars['String']['output']>;
  /** Entity type */
  entityType?: Maybe<Scalars['String']['output']>;
  /** Log ID */
  id: Scalars['ID']['output'];
  /** IP address */
  ipAddress?: Maybe<Scalars['String']['output']>;
  /** Metadata */
  metadata?: Maybe<Scalars['String']['output']>;
  /** Timestamp */
  timestamp: Scalars['Time']['output'];
  /** Activity type */
  type: SystemActivityType;
  /** User agent */
  userAgent?: Maybe<Scalars['String']['output']>;
};

/** SystemActivityType enum. */
export enum SystemActivityType {
  /** Admin created */
  AdminCreated = 'ADMIN_CREATED',
  /** Backup created */
  BackupCreated = 'BACKUP_CREATED',
  /** Company activated */
  CompanyActivated = 'COMPANY_ACTIVATED',
  /** Company created */
  CompanyCreated = 'COMPANY_CREATED',
  /** Company suspended */
  CompanySuspended = 'COMPANY_SUSPENDED',
  /** Company updated */
  CompanyUpdated = 'COMPANY_UPDATED',
  /** Database migration */
  DatabaseMigration = 'DATABASE_MIGRATION',
  /** Feature toggled */
  FeatureToggled = 'FEATURE_TOGGLED',
  /** Security event */
  SecurityEvent = 'SECURITY_EVENT',
  /** System restart */
  SystemRestart = 'SYSTEM_RESTART',
  /** Settings changed */
  SystemSettingsChanged = 'SYSTEM_SETTINGS_CHANGED'
}

/** SystemAlert for system alerts. */
export type SystemAlert = {
  __typename?: 'SystemAlert';
  /** Acknowledged */
  acknowledged: Scalars['Boolean']['output'];
  /** Acknowledged at */
  acknowledgedAt?: Maybe<Scalars['Time']['output']>;
  /** Acknowledged by */
  acknowledgedBy?: Maybe<Scalars['String']['output']>;
  /** Company ID (if company-specific) */
  companyId?: Maybe<Scalars['String']['output']>;
  /** Company name */
  companyName?: Maybe<Scalars['String']['output']>;
  /** Component */
  component?: Maybe<Scalars['String']['output']>;
  /** Created at */
  createdAt: Scalars['Time']['output'];
  /** Alert ID */
  id: Scalars['ID']['output'];
  /** Message */
  message: Scalars['String']['output'];
  /** Severity */
  severity: AlertSeverity;
  /** Title */
  title: Scalars['String']['output'];
  /** Alert type */
  type: SystemAlertType;
};

/** SystemAlertType enum. */
export enum SystemAlertType {
  /** API issue */
  ApiIssue = 'API_ISSUE',
  /** Billing issue */
  BillingIssue = 'BILLING_ISSUE',
  /** Database issue */
  DatabaseIssue = 'DATABASE_ISSUE',
  /** High resource usage */
  HighResourceUsage = 'HIGH_RESOURCE_USAGE',
  /** License issue */
  LicenseIssue = 'LICENSE_ISSUE',
  /** Security issue */
  SecurityIssue = 'SECURITY_ISSUE',
  /** Storage issue */
  StorageIssue = 'STORAGE_ISSUE',
  /** System error */
  SystemError = 'SYSTEM_ERROR'
}

/** SystemGeneralSettings for general config. */
export type SystemGeneralSettings = {
  __typename?: 'SystemGeneralSettings';
  /** Default language */
  defaultLanguage: Scalars['String']['output'];
  /** Default timezone */
  defaultTimezone: Scalars['String']['output'];
  /** Maintenance message */
  maintenanceMessage?: Maybe<Scalars['String']['output']>;
  /** Maintenance mode */
  maintenanceMode: Scalars['Boolean']['output'];
  /** Platform name */
  platformName: Scalars['String']['output'];
  /** Platform URL */
  platformUrl: Scalars['String']['output'];
  /** Support email */
  supportEmail: Scalars['String']['output'];
};

/** SystemGeneralSettingsInput for general. */
export type SystemGeneralSettingsInput = {
  /** Default language */
  defaultLanguage?: InputMaybe<Scalars['String']['input']>;
  /** Default timezone */
  defaultTimezone?: InputMaybe<Scalars['String']['input']>;
  /** Maintenance message */
  maintenanceMessage?: InputMaybe<Scalars['String']['input']>;
  /** Maintenance mode */
  maintenanceMode?: InputMaybe<Scalars['Boolean']['input']>;
  /** Platform name */
  platformName?: InputMaybe<Scalars['String']['input']>;
  /** Platform URL */
  platformUrl?: InputMaybe<Scalars['String']['input']>;
  /** Support email */
  supportEmail?: InputMaybe<Scalars['String']['input']>;
};

/** SystemHealth represents system-wide health and performance metrics. */
export type SystemHealth = {
  __typename?: 'SystemHealth';
  /** CPU usage percentage */
  cpuUsage: Scalars['Float']['output'];
  /** Database connection status */
  databaseStatus: Scalars['String']['output'];
  /** Memory usage percentage */
  memoryUsage: Scalars['Float']['output'];
  /** System uptime in seconds */
  uptimeSeconds: Scalars['Int']['output'];
};

/** SystemHealthData for system health. */
export type SystemHealthData = {
  __typename?: 'SystemHealthData';
  /** Active connections */
  activeConnections: Scalars['Int']['output'];
  /** API health */
  apiHealth: Scalars['Boolean']['output'];
  /** Database health */
  databaseHealth: Scalars['Boolean']['output'];
  /** Last backup */
  lastBackup?: Maybe<Scalars['Time']['output']>;
  /** Pending sync operations */
  pendingSyncOperations: Scalars['Int']['output'];
  /** Overall status */
  status: SystemStatus;
  /** Sync service health */
  syncServiceHealth: Scalars['Boolean']['output'];
};

/** SystemOverview for system health. */
export type SystemOverview = {
  __typename?: 'SystemOverview';
  /** Active websockets */
  activeWebsockets: Scalars['Int']['output'];
  /** API uptime percentage */
  apiUptime: Scalars['Float']['output'];
  /** Database status */
  databaseStatus: ServiceStatus;
  /** Error rate (last hour) */
  errorRate: Scalars['Float']['output'];
  /** Pending background jobs */
  pendingJobs: Scalars['Int']['output'];
  /** Queue status */
  queueStatus: ServiceStatus;
  /** Redis status */
  redisStatus: ServiceStatus;
  /** System status */
  status: SystemStatus;
  /** Storage status */
  storageStatus: ServiceStatus;
};

/** SystemSecuritySettings for security config. */
export type SystemSecuritySettings = {
  __typename?: 'SystemSecuritySettings';
  /** Allowed origins */
  allowedOrigins: Array<Scalars['String']['output']>;
  /** JWT expiry (hours) */
  jwtExpiryHours: Scalars['Int']['output'];
  /** Max concurrent sessions */
  maxConcurrentSessions: Scalars['Int']['output'];
  /** Password min length */
  passwordMinLength: Scalars['Int']['output'];
  /** Rate limit per minute */
  rateLimitPerMinute: Scalars['Int']['output'];
  /** Refresh token expiry (days) */
  refreshTokenExpiryDays: Scalars['Int']['output'];
  /** Require numbers */
  requireNumbers: Scalars['Boolean']['output'];
  /** Require symbols */
  requireSymbols: Scalars['Boolean']['output'];
  /** Require uppercase */
  requireUppercase: Scalars['Boolean']['output'];
};

/** SystemSecuritySettingsInput for security. */
export type SystemSecuritySettingsInput = {
  /** JWT expiry hours */
  jwtExpiryHours?: InputMaybe<Scalars['Int']['input']>;
  /** Max concurrent sessions */
  maxConcurrentSessions?: InputMaybe<Scalars['Int']['input']>;
  /** Password min length */
  passwordMinLength?: InputMaybe<Scalars['Int']['input']>;
  /** Rate limit per minute */
  rateLimitPerMinute?: InputMaybe<Scalars['Int']['input']>;
  /** Refresh token expiry days */
  refreshTokenExpiryDays?: InputMaybe<Scalars['Int']['input']>;
};

/** SystemSettings for system configuration. */
export type SystemSettings = {
  __typename?: 'SystemSettings';
  /** API settings */
  api: ApiSettings;
  /** Email settings */
  email: EmailSettings;
  /** Feature flags */
  features: Array<FeatureFlag>;
  /** General settings */
  general: SystemGeneralSettings;
  /** Security settings */
  security: SystemSecuritySettings;
  /** Storage settings */
  storage: StorageSettings;
};

/** SystemStats provides system-wide administrative metrics. */
export type SystemStats = {
  __typename?: 'SystemStats';
  /** System uptime and performance metrics */
  systemHealth?: Maybe<SystemHealth>;
  /** Total number of active companies */
  totalCompanies: Scalars['Int']['output'];
  /** Total number of estates across all companies */
  totalEstates: Scalars['Int']['output'];
  /** Total number of active users */
  totalUsers: Scalars['Int']['output'];
};

/** SystemStatus enum. */
export enum SystemStatus {
  Critical = 'CRITICAL',
  Degraded = 'DEGRADED',
  Healthy = 'HEALTHY'
}

/** TarifBlok is master treatment data mapped one-to-many to blocks. */
export type TarifBlok = {
  __typename?: 'TarifBlok';
  basis?: Maybe<Scalars['Float']['output']>;
  company?: Maybe<Company>;
  companyId: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  perlakuan: Scalars['String']['output'];
  premi?: Maybe<Scalars['Float']['output']>;
  tarifLebaran?: Maybe<Scalars['Float']['output']>;
  tarifLibur?: Maybe<Scalars['Float']['output']>;
  tarifPremi1?: Maybe<Scalars['Float']['output']>;
  tarifPremi2?: Maybe<Scalars['Float']['output']>;
  tarifUpah?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['Time']['output'];
};

/** TeamMemberPerformance represents individual team member performance. */
export type TeamMemberPerformance = {
  __typename?: 'TeamMemberPerformance';
  /** Division/Estate assigned */
  assignment: Scalars['String']['output'];
  /** Member name */
  name: Scalars['String']['output'];
  /** Performance score (0-100) */
  performanceScore: Scalars['Float']['output'];
  /** Records today */
  recordsToday: Scalars['Int']['output'];
  /** Member role */
  role: Scalars['String']['output'];
  /** Member user ID */
  userId: Scalars['ID']['output'];
  /** Weekly trend (positive/negative percentage) */
  weeklyTrend: Scalars['Float']['output'];
};

/** TenantOverview for multi-tenant stats. */
export type TenantOverview = {
  __typename?: 'TenantOverview';
  /** Active companies */
  activeCompanies: Scalars['Int']['output'];
  /** Active users today */
  activeUsersToday: Scalars['Int']['output'];
  /** Companies by status */
  companiesByStatus: Array<CompanyStatusCount>;
  /** New users this month */
  newUsersThisMonth: Scalars['Int']['output'];
  /** Suspended companies */
  suspendedCompanies: Scalars['Int']['output'];
  /** Total companies */
  totalCompanies: Scalars['Int']['output'];
  /** Total users across all companies */
  totalUsers: Scalars['Int']['output'];
  /** Trial companies */
  trialCompanies: Scalars['Int']['output'];
};

/** TimbanganDashboardData represents dashboard data for Timbangan operator. */
export type TimbanganDashboardData = {
  __typename?: 'TimbanganDashboardData';
  /** Pending weighing queue */
  pendingQueue: Array<WeighingQueueItem>;
  /** PKS location info */
  pksInfo: PksInfo;
  /** Recent weighings */
  recentWeighings: Array<WeighingRecord>;
  /** Dashboard statistics */
  stats: TimbanganDashboardStats;
  /** Today's summary */
  todaySummary: TimbanganTodaySummary;
  /** User information */
  user: User;
};

/** TimbanganDashboardStats represents weighing statistics. */
export type TimbanganDashboardStats = {
  __typename?: 'TimbanganDashboardStats';
  /** Average weighing time (minutes) */
  avgWeighingTime: Scalars['Float']['output'];
  /** BJR average */
  bjrAverage: Scalars['Float']['output'];
  /** Pending in queue */
  pendingInQueue: Scalars['Int']['output'];
  /** TBS received today (tons) */
  tbsReceivedToday: Scalars['Float']['output'];
  /** Total weighings today */
  totalWeighingsToday: Scalars['Int']['output'];
  /** Total weight in (tons) */
  totalWeightIn: Scalars['Float']['output'];
  /** Total weight out (tons) */
  totalWeightOut: Scalars['Float']['output'];
  /** Trucks processed today */
  trucksProcessed: Scalars['Int']['output'];
};

/** TimbanganHistoryFilter for filtering. */
export type TimbanganHistoryFilter = {
  /** Date from */
  dateFrom?: InputMaybe<Scalars['Time']['input']>;
  /** Date to */
  dateTo?: InputMaybe<Scalars['Time']['input']>;
  /** Page */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Page size */
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  /** Source estate */
  sourceEstate?: InputMaybe<Scalars['String']['input']>;
  /** Status */
  status?: InputMaybe<WeighingStatus>;
  /** Vehicle plate */
  vehiclePlate?: InputMaybe<Scalars['String']['input']>;
};

/** TimbanganHistoryResponse for history. */
export type TimbanganHistoryResponse = {
  __typename?: 'TimbanganHistoryResponse';
  /** Has more */
  hasMore: Scalars['Boolean']['output'];
  /** Items */
  items: Array<WeighingRecord>;
  /** Summary */
  summary: TimbanganHistorySummary;
  /** Total count */
  totalCount: Scalars['Int']['output'];
};

/** TimbanganHistorySummary for summary. */
export type TimbanganHistorySummary = {
  __typename?: 'TimbanganHistorySummary';
  /** Average BJR */
  avgBjr: Scalars['Float']['output'];
  /** By estate breakdown */
  byEstate: Array<EstateWeighingSummary>;
  /** Total net weight (tons) */
  totalNetWeight: Scalars['Float']['output'];
  /** Total weighings */
  totalWeighings: Scalars['Int']['output'];
};

/** TimbanganTodaySummary represents today's summary. */
export type TimbanganTodaySummary = {
  __typename?: 'TimbanganTodaySummary';
  /** Average BJR */
  averageBjr: Scalars['Float']['output'];
  /** Best quality estate */
  bestQualityEstate?: Maybe<Scalars['String']['output']>;
  /** Shift start */
  shiftStart: Scalars['Time']['output'];
  /** Total brondolan (tons) */
  totalBrondolan: Scalars['Float']['output'];
  /** Total TBS received (tons) */
  totalTbsReceived: Scalars['Float']['output'];
  /** Weighings completed */
  weighingsCompleted: Scalars['Int']['output'];
};

/** TrendDataPoint represents a single data point in trend. */
export type TrendDataPoint = {
  __typename?: 'TrendDataPoint';
  /** Label (date/day/month) */
  label: Scalars['String']['output'];
  /** Target value */
  target?: Maybe<Scalars['Float']['output']>;
  /** Production value */
  value: Scalars['Float']['output'];
};

/** TrendDirection enum. */
export enum TrendDirection {
  Down = 'DOWN',
  Stable = 'STABLE',
  Up = 'UP'
}

export type UpdateBlockInput = {
  blockCode?: InputMaybe<Scalars['String']['input']>;
  cropType?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  istm?: InputMaybe<Scalars['String']['input']>;
  luasHa?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  plantingYear?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tarifBlokId?: InputMaybe<Scalars['ID']['input']>;
};

/** UpdateCompanyAdminInput for updating company. */
export type UpdateCompanyAdminInput = {
  /** Address */
  address?: InputMaybe<Scalars['String']['input']>;
  /** Company ID */
  companyId: Scalars['ID']['input'];
  /** Email */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Max estates */
  maxEstates?: InputMaybe<Scalars['Int']['input']>;
  /** Max storage (GB) */
  maxStorageGb?: InputMaybe<Scalars['Float']['input']>;
  /** Max users */
  maxUsers?: InputMaybe<Scalars['Int']['input']>;
  /** Company name */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Phone */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Status */
  status?: InputMaybe<CompanyStatus>;
};

export type UpdateCompanyInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  companyCode?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<CompanyStatus>;
};

/** UpdateCompanySettingsInput for updating settings. */
export type UpdateCompanySettingsInput = {
  /** General settings */
  general?: InputMaybe<GeneralSettingsInput>;
  /** Notification settings */
  notifications?: InputMaybe<NotificationSettingsInput>;
  /** Operational settings */
  operational?: InputMaybe<OperationalSettingsInput>;
  /** Security settings */
  security?: InputMaybe<SecuritySettingsInput>;
};

/** UpdateCompanyUserInput for updating user. */
export type UpdateCompanyUserInput = {
  /** Email */
  email?: InputMaybe<Scalars['String']['input']>;
  /** Full name */
  fullName?: InputMaybe<Scalars['String']['input']>;
  /** Is active */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Manager/Supervisor identifier */
  managerId?: InputMaybe<Scalars['ID']['input']>;
  /** Phone */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** Role */
  role?: InputMaybe<Scalars['String']['input']>;
  /** User ID */
  userId: Scalars['ID']['input'];
};

export type UpdateDivisionInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEmployeeInput = {
  companyId?: InputMaybe<Scalars['ID']['input']>;
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  photoUrl?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEstateInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  luasHa?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** UpdateFeatureInput represents input for updating an existing feature. */
export type UpdateFeatureInput = {
  /** New description */
  description?: InputMaybe<Scalars['String']['input']>;
  /** New display name */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Feature ID to update */
  id: Scalars['ID']['input'];
  /** New active status */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Updated metadata */
  metadata?: InputMaybe<FeatureMetadataInput>;
};

export type UpdateGradingRecordInput = {
  brondolanPercentage?: InputMaybe<Scalars['Float']['input']>;
  dirtPercentage?: InputMaybe<Scalars['Float']['input']>;
  gradingNotes?: InputMaybe<Scalars['String']['input']>;
  looseFruitPercentage?: InputMaybe<Scalars['Float']['input']>;
  maturityLevel?: InputMaybe<Scalars['String']['input']>;
  qualityScore?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateHarvestRecordInput = {
  beratTbs?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['ID']['input'];
  jumlahJanjang?: InputMaybe<Scalars['Int']['input']>;
  karyawan?: InputMaybe<Scalars['String']['input']>;
};

/** UpdateMandorHarvestInput for updating existing harvest. */
export type UpdateMandorHarvestInput = {
  /** Updated weight */
  beratTbs?: InputMaybe<Scalars['Float']['input']>;
  /** Client timestamp */
  clientTimestamp: Scalars['Time']['input'];
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Harvest ID (server or local) */
  id: Scalars['ID']['input'];
  /** Updated TBS count */
  jumlahJanjang?: InputMaybe<Scalars['Int']['input']>;
  /** Updated employees */
  karyawan?: InputMaybe<Scalars['String']['input']>;
  /** Local version for conflict detection */
  localVersion: Scalars['Int']['input'];
  /** Updated notes */
  notes?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePksRecordInput = {
  beratTimbang?: InputMaybe<Scalars['Float']['input']>;
  bjrPercentage?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['ID']['input'];
  kualitas?: InputMaybe<PksKualitas>;
  nomorDo?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePerawatanRecordInput = {
  catatan?: InputMaybe<Scalars['String']['input']>;
  herbisidaDigunakan?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  jenisPerawatan?: InputMaybe<JenisPerawatan>;
  luasArea?: InputMaybe<Scalars['Float']['input']>;
  pupukDigunakan?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<StatusPerawatan>;
  tanggalPerawatan?: InputMaybe<Scalars['Time']['input']>;
};

/** UpdateSystemSettingsInput for updating settings. */
export type UpdateSystemSettingsInput = {
  /** Email settings */
  email?: InputMaybe<EmailSettingsInput>;
  /** General settings */
  general?: InputMaybe<SystemGeneralSettingsInput>;
  /** Security settings */
  security?: InputMaybe<SystemSecuritySettingsInput>;
  /** Storage settings */
  storage?: InputMaybe<StorageSettingsInput>;
};

export type UpdateTarifBlokInput = {
  basis?: InputMaybe<Scalars['Float']['input']>;
  companyId?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  perlakuan?: InputMaybe<Scalars['String']['input']>;
  premi?: InputMaybe<Scalars['Float']['input']>;
  tarifLebaran?: InputMaybe<Scalars['Float']['input']>;
  tarifLibur?: InputMaybe<Scalars['Float']['input']>;
  tarifPremi1?: InputMaybe<Scalars['Float']['input']>;
  tarifPremi2?: InputMaybe<Scalars['Float']['input']>;
  tarifUpah?: InputMaybe<Scalars['Float']['input']>;
};

/** UpdateUserInput represents the input for updating an existing user. */
export type UpdateUserInput = {
  /** New avatar image URL or data URI (empty string removes avatar) */
  avatar?: InputMaybe<Scalars['String']['input']>;
  /** New company assignments (replaces all existing assignments) */
  companyIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** New division assignments */
  divisionIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** New email address */
  email?: InputMaybe<Scalars['String']['input']>;
  /** New estate assignments */
  estateIds?: InputMaybe<Array<Scalars['String']['input']>>;
  /** User ID to update */
  id: Scalars['ID']['input'];
  /** Whether the user account should be active */
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  /** New manager/supervisor assignment */
  managerId?: InputMaybe<Scalars['String']['input']>;
  /** New display name */
  name?: InputMaybe<Scalars['String']['input']>;
  /** New phone number */
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  /** New role (requires proper authorization) */
  role?: InputMaybe<UserRole>;
  /** New username (must be unique) */
  username?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateVehicleInput = {
  assignedDriverName?: InputMaybe<Scalars['String']['input']>;
  brand?: InputMaybe<Scalars['String']['input']>;
  chassisNumber?: InputMaybe<Scalars['String']['input']>;
  deactivatedAt?: InputMaybe<Scalars['Time']['input']>;
  engineNumber?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  kirExpiryDate?: InputMaybe<Scalars['Time']['input']>;
  manufactureYear?: InputMaybe<Scalars['Int']['input']>;
  model?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  registrationPlate?: InputMaybe<Scalars['String']['input']>;
  registrationRegion?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  stnkExpiryDate?: InputMaybe<Scalars['Time']['input']>;
  vehicleCategory?: InputMaybe<Scalars['String']['input']>;
  vehicleType?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateVehicleTaxInput = {
  adminAmount?: InputMaybe<Scalars['Float']['input']>;
  dueDate?: InputMaybe<Scalars['Time']['input']>;
  id: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  paymentDate?: InputMaybe<Scalars['Time']['input']>;
  paymentMethod?: InputMaybe<Scalars['String']['input']>;
  paymentReference?: InputMaybe<Scalars['String']['input']>;
  penaltyAmount?: InputMaybe<Scalars['Float']['input']>;
  pkbAmount?: InputMaybe<Scalars['Float']['input']>;
  swdklljAmount?: InputMaybe<Scalars['Float']['input']>;
  taxStatus?: InputMaybe<Scalars['String']['input']>;
  taxYear?: InputMaybe<Scalars['Int']['input']>;
  totalAmount?: InputMaybe<Scalars['Float']['input']>;
};

/** UpdateWeighingRecordInput for updating weighing records. */
export type UpdateWeighingRecordInput = {
  /** Cargo type */
  cargoType?: InputMaybe<Scalars['String']['input']>;
  /** Driver name */
  driverName?: InputMaybe<Scalars['String']['input']>;
  /** Gross weight (kg) */
  grossWeight?: InputMaybe<Scalars['Float']['input']>;
  /** Net weight (kg) */
  netWeight?: InputMaybe<Scalars['Float']['input']>;
  /** Tare weight (kg) */
  tareWeight?: InputMaybe<Scalars['Float']['input']>;
  /** Ticket number */
  ticketNumber?: InputMaybe<Scalars['String']['input']>;
  /** Vehicle number/plate */
  vehicleNumber?: InputMaybe<Scalars['String']['input']>;
  /** Vendor name */
  vendorName?: InputMaybe<Scalars['String']['input']>;
  /** Weighing time */
  weighingTime?: InputMaybe<Scalars['Time']['input']>;
};

/**
 * User represents a system user with role-based access control.
 * Supports hierarchical roles from field workers to system administrators.
 */
export type User = {
  __typename?: 'User';
  /** Optional avatar image URL or data URI */
  avatar?: Maybe<Scalars['String']['output']>;
  /** Companies this user is assigned to (multi-company support) */
  companies?: Maybe<Array<Company>>;
  company?: Maybe<Company>;
  /** Company identifier this user belongs to */
  companyId?: Maybe<Scalars['String']['output']>;
  /** Timestamp when user was created */
  createdAt: Scalars['Time']['output'];
  /** Divisions assigned to this user */
  divisions?: Maybe<Array<Division>>;
  /** Optional email address for notifications */
  email?: Maybe<Scalars['String']['output']>;
  /** Estates assigned to this user */
  estates?: Maybe<Array<Estate>>;
  /** Unique identifier for the user */
  id: Scalars['ID']['output'];
  /** Whether the user account is active */
  isActive: Scalars['Boolean']['output'];
  /** Manager entity */
  manager?: Maybe<User>;
  /** Manager/Supervisor of this user */
  managerId?: Maybe<Scalars['String']['output']>;
  /** Display name of the user */
  name: Scalars['String']['output'];
  /** Optional phone number */
  phoneNumber?: Maybe<Scalars['String']['output']>;
  /** Role defining user permissions and access level */
  role: UserRole;
  /** Timestamp when user was last updated */
  updatedAt: Scalars['Time']['output'];
  /** Unique username for authentication */
  username: Scalars['String']['output'];
};

/** UserAssignmentSummary for user assignments. */
export type UserAssignmentSummary = {
  __typename?: 'UserAssignmentSummary';
  /** Divisions (for asisten/mandor) */
  divisions: Array<Scalars['String']['output']>;
  /** Estates (for manager) */
  estates: Array<Scalars['String']['output']>;
  /** PKS (for timbangan/grading) */
  pksAssignment?: Maybe<Scalars['String']['output']>;
};

/**
 * UserAssignments represents all assignment data for a user.
 * Used in login response to provide client with access scope information.
 */
export type UserAssignments = {
  __typename?: 'UserAssignments';
  /** Companies assigned to Area Manager role (multiple companies) */
  companies: Array<Company>;
  /** Divisions assigned to Asisten and Mandor roles (multiple divisions across estates) */
  divisions: Array<Division>;
  /** Estates assigned to Manager role (multiple estates per company) */
  estates: Array<Estate>;
};

/** UserCompanyAssignment represents Area Manager assignments to multiple companies. */
export type UserCompanyAssignment = {
  __typename?: 'UserCompanyAssignment';
  assignedAt: Scalars['Time']['output'];
  assignedBy?: Maybe<Scalars['ID']['output']>;
  company: Company;
  companyId: Scalars['ID']['output'];
  createdAt: Scalars['Time']['output'];
  estateAssignments?: Maybe<Array<UserEstateAssignment>>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  updatedAt: Scalars['Time']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

/** UserDivisionAssignment represents Asisten assignments to multiple divisions. */
export type UserDivisionAssignment = {
  __typename?: 'UserDivisionAssignment';
  assignedAt: Scalars['Time']['output'];
  assignedBy?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['Time']['output'];
  division: Division;
  divisionId: Scalars['ID']['output'];
  estateAssignmentId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  updatedAt: Scalars['Time']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

/** UserEstateAssignment represents Manager assignments to multiple estates. */
export type UserEstateAssignment = {
  __typename?: 'UserEstateAssignment';
  assignedAt: Scalars['Time']['output'];
  assignedBy?: Maybe<Scalars['ID']['output']>;
  assignmentId: Scalars['ID']['output'];
  createdAt: Scalars['Time']['output'];
  divisionAssignments?: Maybe<Array<UserDivisionAssignment>>;
  estate: Estate;
  estateId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  updatedAt: Scalars['Time']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

/**
 * UserFeature represents a user-specific feature grant or denial.
 * Allows fine-grained control beyond role-based features.
 */
export type UserFeature = {
  __typename?: 'UserFeature';
  /** When this assignment was created */
  createdAt: Scalars['Time']['output'];
  /** When this assignment becomes effective */
  effectiveFrom?: Maybe<Scalars['Time']['output']>;
  /** When this assignment expires */
  expiresAt?: Maybe<Scalars['Time']['output']>;
  /** Feature details */
  feature: Feature;
  /** Feature being assigned */
  featureId: Scalars['ID']['output'];
  /** User who granted this feature */
  grantedBy: Scalars['ID']['output'];
  /** Unique identifier */
  id: Scalars['ID']['output'];
  /** Whether this is a grant (true) or denial (false) */
  isGranted: Scalars['Boolean']['output'];
  /** Reason for granting/denying this feature */
  reason?: Maybe<Scalars['String']['output']>;
  /** Scoped resource ID */
  scopeId?: Maybe<Scalars['ID']['output']>;
  /** Scope for this feature (optional, null means global) */
  scopeType?: Maybe<Scalars['String']['output']>;
  /** When this assignment was last updated */
  updatedAt: Scalars['Time']['output'];
  /** User who has this feature assignment */
  userId: Scalars['ID']['output'];
};

/**
 * UserFeatureSet represents a user's complete set of features.
 * This is typically cached for performance.
 */
export type UserFeatureSet = {
  __typename?: 'UserFeatureSet';
  /** When this feature set was computed */
  computedAt: Scalars['Time']['output'];
  /** When this feature set expires (cache TTL) */
  expiresAt: Scalars['Time']['output'];
  /** List of all feature codes the user has */
  features: Array<Scalars['String']['output']>;
  /** User's role */
  role: Scalars['String']['output'];
  /** Scoped features with detailed access information */
  scopedFeatures?: Maybe<Array<ScopedFeature>>;
  /** User ID */
  userId: Scalars['String']['output'];
};

/** UserFeatureUpdateEvent represents a user feature modification event. */
export type UserFeatureUpdateEvent = {
  __typename?: 'UserFeatureUpdateEvent';
  /** Event type (GRANTED, DENIED, REVOKED) */
  eventType: Scalars['String']['output'];
  /** The feature that was modified */
  feature: Scalars['String']['output'];
  /** Whether this was a grant or denial */
  isGranted?: Maybe<Scalars['Boolean']['output']>;
  /** User who performed the action */
  performedBy: Scalars['ID']['output'];
  /** When the event occurred */
  timestamp: Scalars['Time']['output'];
  /** User ID whose features were modified */
  userId: Scalars['ID']['output'];
};

/** UserFilterInput for filtering users. */
export type UserFilterInput = {
  /** Active only */
  activeOnly?: InputMaybe<Scalars['Boolean']['input']>;
  /** Division filter */
  divisionId?: InputMaybe<Scalars['ID']['input']>;
  /** Estate filter */
  estateId?: InputMaybe<Scalars['ID']['input']>;
  /** Page */
  page?: InputMaybe<Scalars['Int']['input']>;
  /** Page size */
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  /** Role filter */
  role?: InputMaybe<Scalars['String']['input']>;
  /** Search query */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** UserListResponse represents a paginated list of users with metadata. */
export type UserListResponse = {
  __typename?: 'UserListResponse';
  /** Whether there are more users to fetch */
  hasNextPage: Scalars['Boolean']['output'];
  /** Current page information */
  pageInfo: PageInfo;
  /** Total number of users matching the criteria */
  totalCount: Scalars['Int']['output'];
  /** List of users */
  users: Array<User>;
};

/** UserManagementResult for user operations. */
export type UserManagementResult = {
  __typename?: 'UserManagementResult';
  /** Errors */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Message */
  message: Scalars['String']['output'];
  /** Success */
  success: Scalars['Boolean']['output'];
  /** User */
  user?: Maybe<CompanyUser>;
};

/** UserMutationResponse represents the response from user mutation operations. */
export type UserMutationResponse = {
  __typename?: 'UserMutationResponse';
  /** List of validation errors (when operation fails) */
  errors?: Maybe<Array<ValidationError>>;
  /** Result message */
  message: Scalars['String']['output'];
  /** Whether the operation was successful */
  success: Scalars['Boolean']['output'];
  /** User data (when operation is successful) */
  user?: Maybe<User>;
};

/** UserOverview for user statistics. */
export type UserOverview = {
  __typename?: 'UserOverview';
  /** Active today */
  activeToday: Scalars['Int']['output'];
  /** By role breakdown */
  byRole: Array<RoleUserCount>;
  /** Locked accounts */
  lockedAccounts: Scalars['Int']['output'];
  /** New this month */
  newThisMonth: Scalars['Int']['output'];
  /** Pending approvals */
  pendingApprovals: Scalars['Int']['output'];
  /** Total users */
  total: Scalars['Int']['output'];
};

export type UserPermissionAssignment = {
  __typename?: 'UserPermissionAssignment';
  createdAt: Scalars['Time']['output'];
  createdBy: User;
  expiresAt?: Maybe<Scalars['Time']['output']>;
  id: Scalars['ID']['output'];
  isGranted: Scalars['Boolean']['output'];
  permission: Permission;
  scope?: Maybe<PermissionScope>;
  user: User;
};

export type UserPermissionInput = {
  expiresAt?: InputMaybe<Scalars['Time']['input']>;
  isGranted: Scalars['Boolean']['input'];
  permission: Scalars['String']['input'];
  scope?: InputMaybe<PermissionScopeInput>;
  userId: Scalars['String']['input'];
};

export type UserPermissionOverride = {
  __typename?: 'UserPermissionOverride';
  expiresAt?: Maybe<Scalars['Time']['output']>;
  isGranted: Scalars['Boolean']['output'];
  permission: Scalars['String']['output'];
  scope?: Maybe<PermissionScope>;
};

export type UserPermissions = {
  __typename?: 'UserPermissions';
  overrides?: Maybe<Array<UserPermissionOverride>>;
  permissions: Array<Scalars['String']['output']>;
  role: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

/**
 * UserProfile represents different profile structures based on user role.
 * Each role returns specific data relevant to their responsibilities and scope.
 */
export type UserProfile = AreaManagerProfile | AsistenProfile | CompanyAdminProfile | ManagerProfile | MandorProfile | SatpamProfile | SuperAdminProfile;

/**
 * User Role defines the hierarchical access levels in the palm oil management system.
 * Each role has specific permissions and responsibilities.
 * STRICT: Only standard roles are supported - includes field operational roles.
 */
export enum UserRole {
  /** Area manager overseeing multiple companies */
  AreaManager = 'AREA_MANAGER',
  /** Assistant manager who approves/rejects harvest records */
  Asisten = 'ASISTEN',
  /** Company administrator with user management rights */
  CompanyAdmin = 'COMPANY_ADMIN',
  /** Quality control staff responsible for TBS grading and classification */
  Grading = 'GRADING',
  /** Estate manager with monitoring and reporting access */
  Manager = 'MANAGER',
  /** Field supervisor responsible for harvest data input */
  Mandor = 'MANDOR',
  /** Security personnel managing gate check operations */
  Satpam = 'SATPAM',
  /** System administrator with full access */
  SuperAdmin = 'SUPER_ADMIN',
  /** Weighing station operator responsible for TBS weighing and recording */
  Timbangan = 'TIMBANGAN'
}

/** UserSession represents a user login session. */
export type UserSession = {
  __typename?: 'UserSession';
  /** Time when the session expires */
  expiresAt: Scalars['Time']['output'];
  /** Unique identifier for the session */
  id: Scalars['UUID']['output'];
  /** IP address of the client */
  ipAddress?: Maybe<Scalars['String']['output']>;
  /** Time of last activity */
  lastActivity: Scalars['Time']['output'];
  /** Time when the session was created */
  loginTime: Scalars['Time']['output'];
  /** Platform used for login (WEB, ANDROID, IOS) */
  platform: Scalars['String']['output'];
  /** Whether the session has been revoked */
  revoked: Scalars['Boolean']['output'];
  /** User who revoked the session (if revoked) */
  revokedBy?: Maybe<User>;
  /** Reason for revocation */
  revokedReason?: Maybe<Scalars['String']['output']>;
  /** Session ID (often same as ID but can be different depending on implementation) */
  sessionId: Scalars['String']['output'];
  /** User associated with this session */
  user: User;
  /** User agent string */
  userAgent?: Maybe<Scalars['String']['output']>;
};

/** ValidateQRInput for QR validation. */
export type ValidateQrInput = {
  /** Device ID */
  deviceId: Scalars['String']['input'];
  /** Expected intent */
  expectedIntent: GateIntent;
  /** GPS latitude */
  latitude?: InputMaybe<Scalars['Float']['input']>;
  /** GPS longitude */
  longitude?: InputMaybe<Scalars['Float']['input']>;
  /** QR code content (JWT token) */
  qrData: Scalars['String']['input'];
};

/** ValidationError represents a validation error for user input. */
export type ValidationError = {
  __typename?: 'ValidationError';
  /** Error code for programmatic handling */
  code?: Maybe<Scalars['String']['output']>;
  /** Field that has the validation error */
  field: Scalars['String']['output'];
  /** Error message */
  message: Scalars['String']['output'];
};

/** ValidationStatus enum. */
export enum ValidationStatus {
  /** Has errors, needs review */
  Error = 'ERROR',
  /** All validations passed */
  Valid = 'VALID',
  /** Has warnings but can approve */
  Warning = 'WARNING'
}

export type Vehicle = {
  __typename?: 'Vehicle';
  assignedDriverName?: Maybe<Scalars['String']['output']>;
  brand: Scalars['String']['output'];
  chassisNumber: Scalars['String']['output'];
  companyId: Scalars['ID']['output'];
  createdAt: Scalars['Time']['output'];
  deactivatedAt?: Maybe<Scalars['Time']['output']>;
  engineNumber: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  kirExpiryDate?: Maybe<Scalars['Time']['output']>;
  manufactureYear: Scalars['Int']['output'];
  model: Scalars['String']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  registrationPlate: Scalars['String']['output'];
  registrationRegion?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  stnkExpiryDate?: Maybe<Scalars['Time']['output']>;
  updatedAt: Scalars['Time']['output'];
  vehicleCategory: Scalars['String']['output'];
  vehicleType: Scalars['String']['output'];
};

/** VehicleCompletedInfo represents a vehicle that has completed both entry and exit today. */
export type VehicleCompletedInfo = {
  __typename?: 'VehicleCompletedInfo';
  /** Cargo owner */
  cargoOwner?: Maybe<Scalars['String']['output']>;
  /** Cargo volume */
  cargoVolume?: Maybe<Scalars['String']['output']>;
  /** Company ID */
  companyId: Scalars['String']['output'];
  /** Delivery order number */
  deliveryOrderNumber?: Maybe<Scalars['String']['output']>;
  /** Destination */
  destination?: Maybe<Scalars['String']['output']>;
  /** Driver name */
  driverName: Scalars['String']['output'];
  /** Duration inside (minutes) */
  durationInsideMinutes: Scalars['Int']['output'];
  /** Entry gate */
  entryGate?: Maybe<Scalars['String']['output']>;
  /** Entry time */
  entryTime: Scalars['Time']['output'];
  /** Estimated weight */
  estimatedWeight?: Maybe<Scalars['Float']['output']>;
  /** Exit gate */
  exitGate?: Maybe<Scalars['String']['output']>;
  /** Exit time */
  exitTime: Scalars['Time']['output'];
  /** Log ID */
  id: Scalars['ID']['output'];
  /** ID card number */
  idCardNumber?: Maybe<Scalars['String']['output']>;
  /** Load type */
  loadType?: Maybe<Scalars['String']['output']>;
  /** Photo URL */
  photoUrl?: Maybe<Scalars['String']['output']>;
  /** Photos associated with this vehicle */
  photos?: Maybe<Array<SatpamPhoto>>;
  /** Second cargo */
  secondCargo?: Maybe<Scalars['String']['output']>;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['output'];
  /** Vehicle type */
  vehicleType: VehicleType;
};

/** VehicleInsideInfo represents a vehicle currently inside. */
export type VehicleInsideInfo = {
  __typename?: 'VehicleInsideInfo';
  /** Cargo owner */
  cargoOwner?: Maybe<Scalars['String']['output']>;
  /** Cargo volume */
  cargoVolume?: Maybe<Scalars['String']['output']>;
  /** Company ID */
  companyId: Scalars['String']['output'];
  /** Delivery order number */
  deliveryOrderNumber?: Maybe<Scalars['String']['output']>;
  /** Destination */
  destination?: Maybe<Scalars['String']['output']>;
  /** Driver name */
  driverName: Scalars['String']['output'];
  /** Duration inside (minutes) */
  durationMinutes: Scalars['Int']['output'];
  /** Entry gate name */
  entryGate?: Maybe<Scalars['String']['output']>;
  /** Entry time */
  entryTime: Scalars['Time']['output'];
  /** Estimated weight */
  estimatedWeight?: Maybe<Scalars['Float']['output']>;
  /** Log ID */
  id: Scalars['ID']['output'];
  /** ID card number */
  idCardNumber?: Maybe<Scalars['String']['output']>;
  /** Is overstay */
  isOverstay: Scalars['Boolean']['output'];
  /** Load type */
  loadType?: Maybe<Scalars['String']['output']>;
  /** Photo URL */
  photoUrl?: Maybe<Scalars['String']['output']>;
  /** Photos associated with this vehicle */
  photos?: Maybe<Array<SatpamPhoto>>;
  /** QR code data */
  qrCode?: Maybe<Scalars['String']['output']>;
  /** Second cargo */
  secondCargo?: Maybe<Scalars['String']['output']>;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['output'];
  /** Vehicle type */
  vehicleType: VehicleType;
};

/**
 * VehicleOutsideInfo represents a vehicle that exited the estate today
 * with no matching entry on the same calendar day.
 */
export type VehicleOutsideInfo = {
  __typename?: 'VehicleOutsideInfo';
  /** Cargo owner */
  cargoOwner?: Maybe<Scalars['String']['output']>;
  /** Cargo volume */
  cargoVolume?: Maybe<Scalars['String']['output']>;
  /** Company ID */
  companyId: Scalars['String']['output'];
  /** Delivery order number */
  deliveryOrderNumber?: Maybe<Scalars['String']['output']>;
  /** Destination */
  destination?: Maybe<Scalars['String']['output']>;
  /** Driver name */
  driverName: Scalars['String']['output'];
  /** Duration outside (minutes since exit) */
  durationMinutes: Scalars['Int']['output'];
  /** Estimated weight */
  estimatedWeight?: Maybe<Scalars['Float']['output']>;
  /** Exit gate */
  exitGate?: Maybe<Scalars['String']['output']>;
  /** Exit time */
  exitTime: Scalars['Time']['output'];
  /** Log ID */
  id: Scalars['ID']['output'];
  /** ID card number */
  idCardNumber?: Maybe<Scalars['String']['output']>;
  /** Load type */
  loadType?: Maybe<Scalars['String']['output']>;
  /** Photo URL */
  photoUrl?: Maybe<Scalars['String']['output']>;
  /** Photos associated with this vehicle */
  photos?: Maybe<Array<SatpamPhoto>>;
  /** Second cargo */
  secondCargo?: Maybe<Scalars['String']['output']>;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['output'];
  /** Vehicle type */
  vehicleType: VehicleType;
};

export type VehiclePaginationResponse = {
  __typename?: 'VehiclePaginationResponse';
  data: Array<Vehicle>;
  pagination: Pagination;
};

export type VehicleTax = {
  __typename?: 'VehicleTax';
  adminAmount: Scalars['Float']['output'];
  createdAt: Scalars['Time']['output'];
  dueDate: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  paymentDate?: Maybe<Scalars['Time']['output']>;
  paymentMethod?: Maybe<Scalars['String']['output']>;
  paymentReference?: Maybe<Scalars['String']['output']>;
  penaltyAmount: Scalars['Float']['output'];
  pkbAmount: Scalars['Float']['output'];
  swdklljAmount: Scalars['Float']['output'];
  taxStatus: Scalars['String']['output'];
  taxYear: Scalars['Int']['output'];
  totalAmount: Scalars['Float']['output'];
  updatedAt: Scalars['Time']['output'];
  vehicleId: Scalars['ID']['output'];
};

export type VehicleTaxDocument = {
  __typename?: 'VehicleTaxDocument';
  createdAt: Scalars['Time']['output'];
  documentType: Scalars['String']['output'];
  filePath: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['Time']['output'];
  uploadedAt: Scalars['Time']['output'];
  uploadedBy?: Maybe<Scalars['Int']['output']>;
  vehicleTaxId: Scalars['ID']['output'];
};

/** VehicleType represents different types of vehicles. */
export enum VehicleType {
  /** Bus */
  Bus = 'BUS',
  /** Passenger car (Mobil) */
  Car = 'CAR',
  /** Motorcycle (Motor) */
  Motorbike = 'MOTORBIKE',
  /** Other vehicle type (Lainnya) */
  Other = 'OTHER',
  /** Pick-up truck (PickUp) */
  Pickup = 'PICKUP',
  /** Commercial truck (Truk) */
  Truck = 'TRUCK',
  /** Van / Minibus */
  Van = 'VAN'
}

/**
 * WebLoginInput represents simplified input for web authentication with cookie support.
 * Automatically handles session creation and cookie management for web browsers.
 */
export type WebLoginInput = {
  /** Username or email address for authentication */
  identifier: Scalars['String']['input'];
  /** User password */
  password: Scalars['String']['input'];
};

/**
 * WebLoginPayload represents the response from web authentication operations.
 * Contains user information and company assignments for web dashboard.
 */
export type WebLoginPayload = {
  __typename?: 'WebLoginPayload';
  /** User assignments for role-based access control (null when authentication fails or not needed) */
  assignments?: Maybe<UserAssignments>;
  /** Message describing the login result */
  message: Scalars['String']['output'];
  /** Session ID for tracking (null when authentication fails) */
  sessionId?: Maybe<Scalars['String']['output']>;
  /** Whether the login was successful */
  success: Scalars['Boolean']['output'];
  /** Authenticated user information (null when authentication fails) */
  user?: Maybe<User>;
};

/** WeighingQueueItem represents an item in weighing queue. */
export type WeighingQueueItem = {
  __typename?: 'WeighingQueueItem';
  /** DO number */
  doNumber?: Maybe<Scalars['String']['output']>;
  /** Driver name */
  driverName: Scalars['String']['output'];
  /** Entry time */
  entryTime: Scalars['Time']['output'];
  /** Estimated weight */
  estimatedWeight?: Maybe<Scalars['Float']['output']>;
  /** Queue ID */
  id: Scalars['ID']['output'];
  /** Priority */
  priority: QueuePriority;
  /** Queue number */
  queueNumber: Scalars['Int']['output'];
  /** Queue type */
  queueType: WeighingQueueType;
  /** Source division */
  sourceDivision?: Maybe<Scalars['String']['output']>;
  /** Source estate */
  sourceEstate: Scalars['String']['output'];
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['output'];
  /** Wait time (minutes) */
  waitTime: Scalars['Int']['output'];
};

/** WeighingQueueType enum. */
export enum WeighingQueueType {
  /** First weighing (entry) */
  FirstWeighing = 'FIRST_WEIGHING',
  /** Reweighing */
  Reweighing = 'REWEIGHING',
  /** Second weighing (exit) */
  SecondWeighing = 'SECOND_WEIGHING'
}

/** WeighingRecord represents a complete weighing record. */
export type WeighingRecord = {
  __typename?: 'WeighingRecord';
  /** BJR (Bunch to Juice Ratio) */
  bjr?: Maybe<Scalars['Float']['output']>;
  /** Brondolan weight */
  brondolanWeight?: Maybe<Scalars['Float']['output']>;
  /** Created at */
  createdAt: Scalars['Time']['output'];
  /** DO number */
  doNumber?: Maybe<Scalars['String']['output']>;
  /** Driver name */
  driverName: Scalars['String']['output'];
  /** First weighing time */
  firstWeighingTime: Scalars['Time']['output'];
  /** First weight (gross) */
  firstWeight: Scalars['Float']['output'];
  /** Grading notes */
  gradingNotes?: Maybe<Scalars['String']['output']>;
  /** Harvest references */
  harvestReferences?: Maybe<Array<Scalars['String']['output']>>;
  /** Record ID */
  id: Scalars['ID']['output'];
  /** Net weight */
  netWeight?: Maybe<Scalars['Float']['output']>;
  /** Notes */
  notes?: Maybe<Scalars['String']['output']>;
  /** Operator ID */
  operatorId: Scalars['String']['output'];
  /** Operator name */
  operatorName: Scalars['String']['output'];
  /** Photos */
  photos?: Maybe<Array<Scalars['String']['output']>>;
  /** Quality grade */
  qualityGrade?: Maybe<Scalars['String']['output']>;
  /** Second weighing time */
  secondWeighingTime?: Maybe<Scalars['Time']['output']>;
  /** Second weight (tare) */
  secondWeight?: Maybe<Scalars['Float']['output']>;
  /** Source division */
  sourceDivision?: Maybe<Scalars['String']['output']>;
  /** Source estate */
  sourceEstate: Scalars['String']['output'];
  /** Status */
  status: WeighingStatus;
  /** TBS count */
  tbsCount?: Maybe<Scalars['Int']['output']>;
  /** Vehicle plate */
  vehiclePlate: Scalars['String']['output'];
  /** Weighing number */
  weighingNumber: Scalars['String']['output'];
};

/** WeighingResult for operation result. */
export type WeighingResult = {
  __typename?: 'WeighingResult';
  /** Calculated BJR */
  bjr?: Maybe<Scalars['Float']['output']>;
  /** Errors */
  errors?: Maybe<Array<Scalars['String']['output']>>;
  /** Message */
  message: Scalars['String']['output'];
  /** Calculated net weight */
  netWeight?: Maybe<Scalars['Float']['output']>;
  /** Success */
  success: Scalars['Boolean']['output'];
  /** Weighing record */
  weighingRecord?: Maybe<WeighingRecord>;
};

/** WeighingStatus enum. */
export enum WeighingStatus {
  /** Cancelled */
  Cancelled = 'CANCELLED',
  /** Completed */
  Completed = 'COMPLETED',
  /** First weighing done, waiting for unload */
  InProcess = 'IN_PROCESS',
  /** Waiting for first weighing */
  PendingFirst = 'PENDING_FIRST',
  /** Waiting for second weighing */
  PendingSecond = 'PENDING_SECOND'
}

export type UserFieldsFragment = { __typename?: 'User', id: string, username: string, email?: string | null, name: string, role: UserRole, isActive: boolean, createdAt: Date, updatedAt: Date };

export type WebLoginMutationVariables = Exact<{
  input: WebLoginInput;
}>;


export type WebLoginMutation = { __typename?: 'Mutation', webLogin: { __typename?: 'WebLoginPayload', success: boolean, message: string, sessionId?: string | null, user?: { __typename?: 'User', managerId?: string | null, id: string, username: string, email?: string | null, name: string, role: UserRole, isActive: boolean, createdAt: Date, updatedAt: Date, manager?: { __typename?: 'User', id: string, name: string } | null } | null, assignments?: { __typename?: 'UserAssignments', companies: Array<{ __typename?: 'Company', id: string, name: string, status: CompanyStatus, address?: string | null }>, estates: Array<{ __typename?: 'Estate', id: string, name: string, companyId: string, location?: string | null, luasHa?: number | null }>, divisions: Array<{ __typename?: 'Division', id: string, name: string, code: string, estateId: string }> } | null } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { __typename?: 'Mutation', logout: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, username: string, email?: string | null, name: string, role: UserRole, isActive: boolean, createdAt: Date, updatedAt: Date } | null };

export type RefreshTokenMutationVariables = Exact<{
  input: RefreshTokenInput;
}>;


export type RefreshTokenMutation = { __typename?: 'Mutation', refreshToken: { __typename?: 'AuthPayload', accessToken: string, refreshToken: string, expiresAt: Date, user: { __typename?: 'User', id: string, username: string, email?: string | null, name: string, role: UserRole, isActive: boolean, createdAt: Date, updatedAt: Date } } };

export type GetHarvestRecordsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetHarvestRecordsQuery = { __typename?: 'Query', harvestRecords: Array<{ __typename?: 'HarvestRecord', id: string, tanggal: Date, karyawan: string, nik?: string | null, beratTbs: number, jumlahJanjang: number, jjgMatang: number, jjgMentah: number, jjgLewatMatang: number, jjgBusukAbnormal: number, jjgTangkaiPanjang: number, totalBrondolan: number, photoUrl?: string | null, status: HarvestStatus, createdAt: Date, mandor: { __typename?: 'User', id: string, name: string }, block: { __typename?: 'Block', id: string, name: string } }> };

export type CreateHarvestRecordMutationVariables = Exact<{
  input: CreateHarvestRecordInput;
}>;


export type CreateHarvestRecordMutation = { __typename?: 'Mutation', createHarvestRecord: { __typename?: 'HarvestRecord', id: string, status: HarvestStatus, createdAt: Date } };

export type UpdateHarvestRecordMutationVariables = Exact<{
  input: UpdateHarvestRecordInput;
}>;


export type UpdateHarvestRecordMutation = { __typename?: 'Mutation', updateHarvestRecord: { __typename?: 'HarvestRecord', id: string, status: HarvestStatus, updatedAt: Date } };

export type ApproveHarvestRecordMutationVariables = Exact<{
  input: ApproveHarvestInput;
}>;


export type ApproveHarvestRecordMutation = { __typename?: 'Mutation', approveHarvestRecord: { __typename?: 'HarvestRecord', id: string, status: HarvestStatus, approvedBy?: string | null, updatedAt: Date } };

export type RejectHarvestRecordMutationVariables = Exact<{
  input: RejectHarvestInput;
}>;


export type RejectHarvestRecordMutation = { __typename?: 'Mutation', rejectHarvestRecord: { __typename?: 'HarvestRecord', id: string, status: HarvestStatus, rejectedReason?: string | null, updatedAt: Date } };

export type OnHarvestRecordCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnHarvestRecordCreatedSubscription = { __typename?: 'Subscription', harvestRecordCreated: { __typename?: 'HarvestRecord', id: string, tanggal: Date, status: HarvestStatus, beratTbs: number, mandor: { __typename?: 'User', name: string }, block: { __typename?: 'Block', blockCode: string } } };

export type OnHarvestRecordApprovedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnHarvestRecordApprovedSubscription = { __typename?: 'Subscription', harvestRecordApproved: { __typename?: 'HarvestRecord', id: string, status: HarvestStatus, beratTbs: number, approvedBy?: string | null, mandor: { __typename?: 'User', id: string, name: string }, block: { __typename?: 'Block', blockCode: string } } };

export type OnHarvestRecordRejectedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnHarvestRecordRejectedSubscription = { __typename?: 'Subscription', harvestRecordRejected: { __typename?: 'HarvestRecord', id: string, status: HarvestStatus, rejectedReason?: string | null, mandor: { __typename?: 'User', id: string, name: string }, block: { __typename?: 'Block', blockCode: string } } };

export type GetWorkersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetWorkersQuery = { __typename?: 'Query', users: { __typename?: 'UserListResponse', totalCount: number, users: Array<{ __typename?: 'User', id: string, username: string, name: string, phoneNumber?: string | null, role: UserRole }> } };

export type GetHarvestRecordsByStatusQueryVariables = Exact<{
  status: HarvestStatus;
}>;


export type GetHarvestRecordsByStatusQuery = { __typename?: 'Query', harvestRecordsByStatus: Array<{ __typename?: 'HarvestRecord', id: string, tanggal: Date, karyawan: string, nik?: string | null, beratTbs: number, jumlahJanjang: number, jjgMatang: number, jjgMentah: number, jjgLewatMatang: number, jjgBusukAbnormal: number, jjgTangkaiPanjang: number, totalBrondolan: number, photoUrl?: string | null, status: HarvestStatus, createdAt: Date, mandor: { __typename?: 'User', id: string, name: string }, block: { __typename?: 'Block', id: string, name: string } }> };

export type DeleteHarvestRecordMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteHarvestRecordMutation = { __typename?: 'Mutation', deleteHarvestRecord: boolean };

export type EstateAssignmentFieldsFragment = { __typename?: 'UserEstateAssignment', id: string, userId: string, assignedBy?: string | null, assignedAt: Date, estateId: string, estate: { __typename?: 'Estate', id: string, name: string }, user?: { __typename?: 'User', id: string, name: string, role: UserRole } | null };

export type DivisionAssignmentFieldsFragment = { __typename?: 'UserDivisionAssignment', id: string, userId: string, assignedBy?: string | null, assignedAt: Date, divisionId: string, division: { __typename?: 'Division', id: string, name: string }, user?: { __typename?: 'User', id: string, name: string, role: UserRole } | null };

export type CompanyAssignmentFieldsFragment = { __typename?: 'UserCompanyAssignment', id: string, userId: string, assignedBy?: string | null, assignedAt: Date, companyId: string, company: { __typename?: 'Company', id: string, name: string }, user?: { __typename?: 'User', id: string, name: string, role: UserRole } | null };

export type BlockFieldsFragment = { __typename?: 'Block', id: string, blockCode: string, name: string, divisionId: string, luasHa?: number | null, plantingYear?: number | null, cropType?: string | null, createdAt: Date, updatedAt: Date };

export type BlockWithRelationsFragment = { __typename?: 'Block', id: string, blockCode: string, name: string, divisionId: string, luasHa?: number | null, plantingYear?: number | null, cropType?: string | null, createdAt: Date, updatedAt: Date, division: { __typename?: 'Division', id: string, name: string, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } } };

export type GetBlockQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBlockQuery = { __typename?: 'Query', block?: { __typename?: 'Block', id: string, blockCode: string, name: string, divisionId: string, luasHa?: number | null, plantingYear?: number | null, cropType?: string | null, createdAt: Date, updatedAt: Date, division: { __typename?: 'Division', id: string, name: string, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } } } | null };

export type CreateBlockMutationVariables = Exact<{
  input: CreateBlockInput;
}>;


export type CreateBlockMutation = { __typename?: 'Mutation', createBlock: { __typename?: 'Block', id: string, blockCode: string, name: string, divisionId: string, luasHa?: number | null, plantingYear?: number | null, cropType?: string | null, createdAt: Date, updatedAt: Date, division: { __typename?: 'Division', id: string, name: string, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } } } };

export type UpdateBlockMutationVariables = Exact<{
  input: UpdateBlockInput;
}>;


export type UpdateBlockMutation = { __typename?: 'Mutation', updateBlock: { __typename?: 'Block', id: string, blockCode: string, name: string, divisionId: string, luasHa?: number | null, plantingYear?: number | null, cropType?: string | null, createdAt: Date, updatedAt: Date, division: { __typename?: 'Division', id: string, name: string, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } } } };

export type DeleteBlockMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBlockMutation = { __typename?: 'Mutation', deleteBlock: boolean };

export type DivisionFieldsFragment = { __typename?: 'Division', id: string, name: string, code: string, estateId: string, createdAt: Date, updatedAt: Date };

export type DivisionWithRelationsFragment = { __typename?: 'Division', id: string, name: string, code: string, estateId: string, createdAt: Date, updatedAt: Date, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } };

export type GetDivisionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDivisionsQuery = { __typename?: 'Query', divisions: Array<{ __typename?: 'Division', id: string, name: string, code: string, estateId: string, createdAt: Date, updatedAt: Date, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } }> };

export type GetDivisionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDivisionQuery = { __typename?: 'Query', division?: { __typename?: 'Division', id: string, name: string, code: string, estateId: string, createdAt: Date, updatedAt: Date, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } } | null };

export type CreateDivisionMutationVariables = Exact<{
  input: CreateDivisionInput;
}>;


export type CreateDivisionMutation = { __typename?: 'Mutation', createDivision: { __typename?: 'Division', id: string, name: string, code: string, estateId: string, createdAt: Date, updatedAt: Date, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } } };

export type UpdateDivisionMutationVariables = Exact<{
  input: UpdateDivisionInput;
}>;


export type UpdateDivisionMutation = { __typename?: 'Mutation', updateDivision: { __typename?: 'Division', id: string, name: string, code: string, estateId: string, createdAt: Date, updatedAt: Date, estate: { __typename?: 'Estate', id: string, name: string, company: { __typename?: 'Company', id: string, name: string } } } };

export type DeleteDivisionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDivisionMutation = { __typename?: 'Mutation', deleteDivision: boolean };

export type GetUsersQueryVariables = Exact<{
  companyId?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<UserRole>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetUsersQuery = { __typename?: 'Query', users: { __typename?: 'UserListResponse', totalCount: number, hasNextPage: boolean, users: Array<{ __typename?: 'User', id: string, username: string, name: string, email?: string | null, phoneNumber?: string | null, avatar?: string | null, role: UserRole, isActive: boolean, createdAt: Date, updatedAt: Date, managerId?: string | null, companyId?: string | null, companies?: Array<{ __typename?: 'Company', id: string, name: string }> | null, company?: { __typename?: 'Company', id: string, name: string } | null, estates?: Array<{ __typename?: 'Estate', id: string, name: string }> | null, divisions?: Array<{ __typename?: 'Division', id: string, name: string }> | null }>, pageInfo: { __typename?: 'PageInfo', currentPage: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean } } };

export type GetUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetUserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, username: string, name: string, email?: string | null, phoneNumber?: string | null, avatar?: string | null, role: UserRole, isActive: boolean, managerId?: string | null, companyId?: string | null, companies?: Array<{ __typename?: 'Company', id: string, name: string }> | null, manager?: { __typename?: 'User', id: string, name: string } | null, estates?: Array<{ __typename?: 'Estate', id: string, name: string }> | null, divisions?: Array<{ __typename?: 'Division', id: string, name: string }> | null } | null };

export type CreateUserMutationVariables = Exact<{
  input: CreateUserInput;
}>;


export type CreateUserMutation = { __typename?: 'Mutation', createUser: { __typename?: 'UserMutationResponse', success: boolean, message: string, user?: { __typename?: 'User', id: string, username: string, role: UserRole } | null } };

export type UpdateUserMutationVariables = Exact<{
  input: UpdateUserInput;
}>;


export type UpdateUserMutation = { __typename?: 'Mutation', updateUser: { __typename?: 'UserMutationResponse', success: boolean, message: string, user?: { __typename?: 'User', id: string, username: string, role: UserRole } | null } };

export type DeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteUserMutation = { __typename?: 'Mutation', deleteUser: { __typename?: 'UserMutationResponse', success: boolean, message: string } };

export type ToggleUserStatusMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ToggleUserStatusMutation = { __typename?: 'Mutation', toggleUserStatus: { __typename?: 'UserMutationResponse', success: boolean, message: string, user?: { __typename?: 'User', id: string, isActive: boolean } | null } };

export type ResetUserPasswordMutationVariables = Exact<{
  input: ResetPasswordInput;
}>;


export type ResetUserPasswordMutation = { __typename?: 'Mutation', resetUserPassword: { __typename?: 'UserMutationResponse', success: boolean, message: string } };

export type GetAllCompaniesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllCompaniesQuery = { __typename?: 'Query', allCompanies: { __typename?: 'CompanyListResponse', companies: Array<{ __typename?: 'CompanyDetailAdmin', id: string, name: string, code: string }> } };

export type GetAllRolesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllRolesQuery = { __typename?: 'Query', allRoles: Array<{ __typename?: 'RoleInfo', role: UserRole, name: string, description: string, level: number }> };

export type GetManagerCandidatesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetManagerCandidatesQuery = { __typename?: 'Query', users: { __typename?: 'UserListResponse', users: Array<{ __typename?: 'User', id: string, username: string, name: string, role: UserRole }> } };

export type GetUserCompanyAssignmentsQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type GetUserCompanyAssignmentsQuery = { __typename?: 'Query', companyAssignments: Array<{ __typename?: 'UserCompanyAssignment', id: string, userId: string, companyId: string, isActive: boolean, company: { __typename?: 'Company', id: string, name: string } }> };

export const UserFieldsFragmentDoc = gql`
    fragment UserFields on User {
  id
  username
  email
  name
  role
  isActive
  createdAt
  updatedAt
}
    `;
export const EstateAssignmentFieldsFragmentDoc = gql`
    fragment EstateAssignmentFields on UserEstateAssignment {
  id
  userId
  assignedBy
  assignedAt
  estateId
  estate {
    id
    name
  }
  user {
    id
    name
    role
  }
}
    `;
export const DivisionAssignmentFieldsFragmentDoc = gql`
    fragment DivisionAssignmentFields on UserDivisionAssignment {
  id
  userId
  assignedBy
  assignedAt
  divisionId
  division {
    id
    name
  }
  user {
    id
    name
    role
  }
}
    `;
export const CompanyAssignmentFieldsFragmentDoc = gql`
    fragment CompanyAssignmentFields on UserCompanyAssignment {
  id
  userId
  assignedBy
  assignedAt
  companyId
  company {
    id
    name
  }
  user {
    id
    name
    role
  }
}
    `;
export const BlockFieldsFragmentDoc = gql`
    fragment BlockFields on Block {
  id
  blockCode
  name
  divisionId
  luasHa
  plantingYear
  cropType
  createdAt
  updatedAt
}
    `;
export const BlockWithRelationsFragmentDoc = gql`
    fragment BlockWithRelations on Block {
  ...BlockFields
  division {
    id
    name
    estate {
      id
      name
      company {
        id
        name
      }
    }
  }
}
    ${BlockFieldsFragmentDoc}`;
export const DivisionFieldsFragmentDoc = gql`
    fragment DivisionFields on Division {
  id
  name
  code
  estateId
  createdAt
  updatedAt
}
    `;
export const DivisionWithRelationsFragmentDoc = gql`
    fragment DivisionWithRelations on Division {
  ...DivisionFields
  estate {
    id
    name
    company {
      id
      name
    }
  }
}
    ${DivisionFieldsFragmentDoc}`;
export const WebLoginDocument = gql`
    mutation WebLogin($input: WebLoginInput!) {
  webLogin(input: $input) {
    success
    message
    user {
      ...UserFields
      managerId
      manager {
        id
        name
      }
    }
    assignments {
      companies {
        id
        name
        status
        address
      }
      estates {
        id
        name
        companyId
        location
        luasHa
      }
      divisions {
        id
        name
        code
        estateId
      }
    }
    sessionId
  }
}
    ${UserFieldsFragmentDoc}`;
export type WebLoginMutationFn = Apollo.MutationFunction<WebLoginMutation, WebLoginMutationVariables>;

/**
 * __useWebLoginMutation__
 *
 * To run a mutation, you first call `useWebLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWebLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [webLoginMutation, { data, loading, error }] = useWebLoginMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useWebLoginMutation(baseOptions?: Apollo.MutationHookOptions<WebLoginMutation, WebLoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<WebLoginMutation, WebLoginMutationVariables>(WebLoginDocument, options);
      }
export type WebLoginMutationHookResult = ReturnType<typeof useWebLoginMutation>;
export type WebLoginMutationResult = Apollo.MutationResult<WebLoginMutation>;
export type WebLoginMutationOptions = Apollo.BaseMutationOptions<WebLoginMutation, WebLoginMutationVariables>;
export const LogoutDocument = gql`
    mutation Logout {
  logout
}
    `;
export type LogoutMutationFn = Apollo.MutationFunction<LogoutMutation, LogoutMutationVariables>;

/**
 * __useLogoutMutation__
 *
 * To run a mutation, you first call `useLogoutMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLogoutMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [logoutMutation, { data, loading, error }] = useLogoutMutation({
 *   variables: {
 *   },
 * });
 */
export function useLogoutMutation(baseOptions?: Apollo.MutationHookOptions<LogoutMutation, LogoutMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LogoutMutation, LogoutMutationVariables>(LogoutDocument, options);
      }
export type LogoutMutationHookResult = ReturnType<typeof useLogoutMutation>;
export type LogoutMutationResult = Apollo.MutationResult<LogoutMutation>;
export type LogoutMutationOptions = Apollo.BaseMutationOptions<LogoutMutation, LogoutMutationVariables>;
export const MeDocument = gql`
    query Me {
  me {
    ...UserFields
  }
}
    ${UserFieldsFragmentDoc}`;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
// @ts-ignore
export function useMeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>): Apollo.UseSuspenseQueryResult<MeQuery | undefined, MeQueryVariables>;
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const RefreshTokenDocument = gql`
    mutation RefreshToken($input: RefreshTokenInput!) {
  refreshToken(input: $input) {
    accessToken
    refreshToken
    expiresAt
    user {
      ...UserFields
    }
  }
}
    ${UserFieldsFragmentDoc}`;
export type RefreshTokenMutationFn = Apollo.MutationFunction<RefreshTokenMutation, RefreshTokenMutationVariables>;

/**
 * __useRefreshTokenMutation__
 *
 * To run a mutation, you first call `useRefreshTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRefreshTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [refreshTokenMutation, { data, loading, error }] = useRefreshTokenMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRefreshTokenMutation(baseOptions?: Apollo.MutationHookOptions<RefreshTokenMutation, RefreshTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RefreshTokenMutation, RefreshTokenMutationVariables>(RefreshTokenDocument, options);
      }
export type RefreshTokenMutationHookResult = ReturnType<typeof useRefreshTokenMutation>;
export type RefreshTokenMutationResult = Apollo.MutationResult<RefreshTokenMutation>;
export type RefreshTokenMutationOptions = Apollo.BaseMutationOptions<RefreshTokenMutation, RefreshTokenMutationVariables>;
export const GetHarvestRecordsDocument = gql`
    query GetHarvestRecords {
  harvestRecords {
    id
    tanggal
    mandor {
      id
      name
    }
    block {
      id
      name
    }
    karyawan
    nik
    beratTbs
    jumlahJanjang
    jjgMatang
    jjgMentah
    jjgLewatMatang
    jjgBusukAbnormal
    jjgTangkaiPanjang
    totalBrondolan
    photoUrl
    status
    createdAt
  }
}
    `;

/**
 * __useGetHarvestRecordsQuery__
 *
 * To run a query within a React component, call `useGetHarvestRecordsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHarvestRecordsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHarvestRecordsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetHarvestRecordsQuery(baseOptions?: Apollo.QueryHookOptions<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>(GetHarvestRecordsDocument, options);
      }
export function useGetHarvestRecordsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>(GetHarvestRecordsDocument, options);
        }
// @ts-ignore
export function useGetHarvestRecordsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>): Apollo.UseSuspenseQueryResult<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>;
export function useGetHarvestRecordsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>): Apollo.UseSuspenseQueryResult<GetHarvestRecordsQuery | undefined, GetHarvestRecordsQueryVariables>;
export function useGetHarvestRecordsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>(GetHarvestRecordsDocument, options);
        }
export type GetHarvestRecordsQueryHookResult = ReturnType<typeof useGetHarvestRecordsQuery>;
export type GetHarvestRecordsLazyQueryHookResult = ReturnType<typeof useGetHarvestRecordsLazyQuery>;
export type GetHarvestRecordsSuspenseQueryHookResult = ReturnType<typeof useGetHarvestRecordsSuspenseQuery>;
export type GetHarvestRecordsQueryResult = Apollo.QueryResult<GetHarvestRecordsQuery, GetHarvestRecordsQueryVariables>;
export const CreateHarvestRecordDocument = gql`
    mutation CreateHarvestRecord($input: CreateHarvestRecordInput!) {
  createHarvestRecord(input: $input) {
    id
    status
    createdAt
  }
}
    `;
export type CreateHarvestRecordMutationFn = Apollo.MutationFunction<CreateHarvestRecordMutation, CreateHarvestRecordMutationVariables>;

/**
 * __useCreateHarvestRecordMutation__
 *
 * To run a mutation, you first call `useCreateHarvestRecordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateHarvestRecordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createHarvestRecordMutation, { data, loading, error }] = useCreateHarvestRecordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateHarvestRecordMutation(baseOptions?: Apollo.MutationHookOptions<CreateHarvestRecordMutation, CreateHarvestRecordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateHarvestRecordMutation, CreateHarvestRecordMutationVariables>(CreateHarvestRecordDocument, options);
      }
export type CreateHarvestRecordMutationHookResult = ReturnType<typeof useCreateHarvestRecordMutation>;
export type CreateHarvestRecordMutationResult = Apollo.MutationResult<CreateHarvestRecordMutation>;
export type CreateHarvestRecordMutationOptions = Apollo.BaseMutationOptions<CreateHarvestRecordMutation, CreateHarvestRecordMutationVariables>;
export const UpdateHarvestRecordDocument = gql`
    mutation UpdateHarvestRecord($input: UpdateHarvestRecordInput!) {
  updateHarvestRecord(input: $input) {
    id
    status
    updatedAt
  }
}
    `;
export type UpdateHarvestRecordMutationFn = Apollo.MutationFunction<UpdateHarvestRecordMutation, UpdateHarvestRecordMutationVariables>;

/**
 * __useUpdateHarvestRecordMutation__
 *
 * To run a mutation, you first call `useUpdateHarvestRecordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateHarvestRecordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateHarvestRecordMutation, { data, loading, error }] = useUpdateHarvestRecordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateHarvestRecordMutation(baseOptions?: Apollo.MutationHookOptions<UpdateHarvestRecordMutation, UpdateHarvestRecordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateHarvestRecordMutation, UpdateHarvestRecordMutationVariables>(UpdateHarvestRecordDocument, options);
      }
export type UpdateHarvestRecordMutationHookResult = ReturnType<typeof useUpdateHarvestRecordMutation>;
export type UpdateHarvestRecordMutationResult = Apollo.MutationResult<UpdateHarvestRecordMutation>;
export type UpdateHarvestRecordMutationOptions = Apollo.BaseMutationOptions<UpdateHarvestRecordMutation, UpdateHarvestRecordMutationVariables>;
export const ApproveHarvestRecordDocument = gql`
    mutation ApproveHarvestRecord($input: ApproveHarvestInput!) {
  approveHarvestRecord(input: $input) {
    id
    status
    approvedBy
    updatedAt
  }
}
    `;
export type ApproveHarvestRecordMutationFn = Apollo.MutationFunction<ApproveHarvestRecordMutation, ApproveHarvestRecordMutationVariables>;

/**
 * __useApproveHarvestRecordMutation__
 *
 * To run a mutation, you first call `useApproveHarvestRecordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveHarvestRecordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveHarvestRecordMutation, { data, loading, error }] = useApproveHarvestRecordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useApproveHarvestRecordMutation(baseOptions?: Apollo.MutationHookOptions<ApproveHarvestRecordMutation, ApproveHarvestRecordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveHarvestRecordMutation, ApproveHarvestRecordMutationVariables>(ApproveHarvestRecordDocument, options);
      }
export type ApproveHarvestRecordMutationHookResult = ReturnType<typeof useApproveHarvestRecordMutation>;
export type ApproveHarvestRecordMutationResult = Apollo.MutationResult<ApproveHarvestRecordMutation>;
export type ApproveHarvestRecordMutationOptions = Apollo.BaseMutationOptions<ApproveHarvestRecordMutation, ApproveHarvestRecordMutationVariables>;
export const RejectHarvestRecordDocument = gql`
    mutation RejectHarvestRecord($input: RejectHarvestInput!) {
  rejectHarvestRecord(input: $input) {
    id
    status
    rejectedReason
    updatedAt
  }
}
    `;
export type RejectHarvestRecordMutationFn = Apollo.MutationFunction<RejectHarvestRecordMutation, RejectHarvestRecordMutationVariables>;

/**
 * __useRejectHarvestRecordMutation__
 *
 * To run a mutation, you first call `useRejectHarvestRecordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRejectHarvestRecordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [rejectHarvestRecordMutation, { data, loading, error }] = useRejectHarvestRecordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRejectHarvestRecordMutation(baseOptions?: Apollo.MutationHookOptions<RejectHarvestRecordMutation, RejectHarvestRecordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RejectHarvestRecordMutation, RejectHarvestRecordMutationVariables>(RejectHarvestRecordDocument, options);
      }
export type RejectHarvestRecordMutationHookResult = ReturnType<typeof useRejectHarvestRecordMutation>;
export type RejectHarvestRecordMutationResult = Apollo.MutationResult<RejectHarvestRecordMutation>;
export type RejectHarvestRecordMutationOptions = Apollo.BaseMutationOptions<RejectHarvestRecordMutation, RejectHarvestRecordMutationVariables>;
export const OnHarvestRecordCreatedDocument = gql`
    subscription OnHarvestRecordCreated {
  harvestRecordCreated {
    id
    tanggal
    mandor {
      name
    }
    status
    block {
      blockCode
    }
    beratTbs
  }
}
    `;

/**
 * __useOnHarvestRecordCreatedSubscription__
 *
 * To run a query within a React component, call `useOnHarvestRecordCreatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOnHarvestRecordCreatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOnHarvestRecordCreatedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useOnHarvestRecordCreatedSubscription(baseOptions?: Apollo.SubscriptionHookOptions<OnHarvestRecordCreatedSubscription, OnHarvestRecordCreatedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<OnHarvestRecordCreatedSubscription, OnHarvestRecordCreatedSubscriptionVariables>(OnHarvestRecordCreatedDocument, options);
      }
export type OnHarvestRecordCreatedSubscriptionHookResult = ReturnType<typeof useOnHarvestRecordCreatedSubscription>;
export type OnHarvestRecordCreatedSubscriptionResult = Apollo.SubscriptionResult<OnHarvestRecordCreatedSubscription>;
export const OnHarvestRecordApprovedDocument = gql`
    subscription OnHarvestRecordApproved {
  harvestRecordApproved {
    id
    status
    mandor {
      id
      name
    }
    block {
      blockCode
    }
    beratTbs
    approvedBy
  }
}
    `;

/**
 * __useOnHarvestRecordApprovedSubscription__
 *
 * To run a query within a React component, call `useOnHarvestRecordApprovedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOnHarvestRecordApprovedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOnHarvestRecordApprovedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useOnHarvestRecordApprovedSubscription(baseOptions?: Apollo.SubscriptionHookOptions<OnHarvestRecordApprovedSubscription, OnHarvestRecordApprovedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<OnHarvestRecordApprovedSubscription, OnHarvestRecordApprovedSubscriptionVariables>(OnHarvestRecordApprovedDocument, options);
      }
export type OnHarvestRecordApprovedSubscriptionHookResult = ReturnType<typeof useOnHarvestRecordApprovedSubscription>;
export type OnHarvestRecordApprovedSubscriptionResult = Apollo.SubscriptionResult<OnHarvestRecordApprovedSubscription>;
export const OnHarvestRecordRejectedDocument = gql`
    subscription OnHarvestRecordRejected {
  harvestRecordRejected {
    id
    status
    mandor {
      id
      name
    }
    block {
      blockCode
    }
    rejectedReason
  }
}
    `;

/**
 * __useOnHarvestRecordRejectedSubscription__
 *
 * To run a query within a React component, call `useOnHarvestRecordRejectedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOnHarvestRecordRejectedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOnHarvestRecordRejectedSubscription({
 *   variables: {
 *   },
 * });
 */
export function useOnHarvestRecordRejectedSubscription(baseOptions?: Apollo.SubscriptionHookOptions<OnHarvestRecordRejectedSubscription, OnHarvestRecordRejectedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<OnHarvestRecordRejectedSubscription, OnHarvestRecordRejectedSubscriptionVariables>(OnHarvestRecordRejectedDocument, options);
      }
export type OnHarvestRecordRejectedSubscriptionHookResult = ReturnType<typeof useOnHarvestRecordRejectedSubscription>;
export type OnHarvestRecordRejectedSubscriptionResult = Apollo.SubscriptionResult<OnHarvestRecordRejectedSubscription>;
export const GetWorkersDocument = gql`
    query GetWorkers($limit: Int, $offset: Int, $search: String) {
  users(limit: $limit, offset: $offset, search: $search, isActive: true) {
    users {
      id
      username
      name
      phoneNumber
      role
    }
    totalCount
  }
}
    `;

/**
 * __useGetWorkersQuery__
 *
 * To run a query within a React component, call `useGetWorkersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetWorkersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetWorkersQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      search: // value for 'search'
 *   },
 * });
 */
export function useGetWorkersQuery(baseOptions?: Apollo.QueryHookOptions<GetWorkersQuery, GetWorkersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetWorkersQuery, GetWorkersQueryVariables>(GetWorkersDocument, options);
      }
export function useGetWorkersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetWorkersQuery, GetWorkersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetWorkersQuery, GetWorkersQueryVariables>(GetWorkersDocument, options);
        }
// @ts-ignore
export function useGetWorkersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetWorkersQuery, GetWorkersQueryVariables>): Apollo.UseSuspenseQueryResult<GetWorkersQuery, GetWorkersQueryVariables>;
export function useGetWorkersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetWorkersQuery, GetWorkersQueryVariables>): Apollo.UseSuspenseQueryResult<GetWorkersQuery | undefined, GetWorkersQueryVariables>;
export function useGetWorkersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetWorkersQuery, GetWorkersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetWorkersQuery, GetWorkersQueryVariables>(GetWorkersDocument, options);
        }
export type GetWorkersQueryHookResult = ReturnType<typeof useGetWorkersQuery>;
export type GetWorkersLazyQueryHookResult = ReturnType<typeof useGetWorkersLazyQuery>;
export type GetWorkersSuspenseQueryHookResult = ReturnType<typeof useGetWorkersSuspenseQuery>;
export type GetWorkersQueryResult = Apollo.QueryResult<GetWorkersQuery, GetWorkersQueryVariables>;
export const GetHarvestRecordsByStatusDocument = gql`
    query GetHarvestRecordsByStatus($status: HarvestStatus!) {
  harvestRecordsByStatus(status: $status) {
    id
    tanggal
    mandor {
      id
      name
    }
    block {
      id
      name
    }
    karyawan
    nik
    beratTbs
    jumlahJanjang
    jjgMatang
    jjgMentah
    jjgLewatMatang
    jjgBusukAbnormal
    jjgTangkaiPanjang
    totalBrondolan
    photoUrl
    status
    createdAt
  }
}
    `;

/**
 * __useGetHarvestRecordsByStatusQuery__
 *
 * To run a query within a React component, call `useGetHarvestRecordsByStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHarvestRecordsByStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHarvestRecordsByStatusQuery({
 *   variables: {
 *      status: // value for 'status'
 *   },
 * });
 */
export function useGetHarvestRecordsByStatusQuery(baseOptions: Apollo.QueryHookOptions<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables> & ({ variables: GetHarvestRecordsByStatusQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>(GetHarvestRecordsByStatusDocument, options);
      }
export function useGetHarvestRecordsByStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>(GetHarvestRecordsByStatusDocument, options);
        }
// @ts-ignore
export function useGetHarvestRecordsByStatusSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>): Apollo.UseSuspenseQueryResult<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>;
export function useGetHarvestRecordsByStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>): Apollo.UseSuspenseQueryResult<GetHarvestRecordsByStatusQuery | undefined, GetHarvestRecordsByStatusQueryVariables>;
export function useGetHarvestRecordsByStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>(GetHarvestRecordsByStatusDocument, options);
        }
export type GetHarvestRecordsByStatusQueryHookResult = ReturnType<typeof useGetHarvestRecordsByStatusQuery>;
export type GetHarvestRecordsByStatusLazyQueryHookResult = ReturnType<typeof useGetHarvestRecordsByStatusLazyQuery>;
export type GetHarvestRecordsByStatusSuspenseQueryHookResult = ReturnType<typeof useGetHarvestRecordsByStatusSuspenseQuery>;
export type GetHarvestRecordsByStatusQueryResult = Apollo.QueryResult<GetHarvestRecordsByStatusQuery, GetHarvestRecordsByStatusQueryVariables>;
export const DeleteHarvestRecordDocument = gql`
    mutation DeleteHarvestRecord($id: ID!) {
  deleteHarvestRecord(id: $id)
}
    `;
export type DeleteHarvestRecordMutationFn = Apollo.MutationFunction<DeleteHarvestRecordMutation, DeleteHarvestRecordMutationVariables>;

/**
 * __useDeleteHarvestRecordMutation__
 *
 * To run a mutation, you first call `useDeleteHarvestRecordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteHarvestRecordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteHarvestRecordMutation, { data, loading, error }] = useDeleteHarvestRecordMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteHarvestRecordMutation(baseOptions?: Apollo.MutationHookOptions<DeleteHarvestRecordMutation, DeleteHarvestRecordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteHarvestRecordMutation, DeleteHarvestRecordMutationVariables>(DeleteHarvestRecordDocument, options);
      }
export type DeleteHarvestRecordMutationHookResult = ReturnType<typeof useDeleteHarvestRecordMutation>;
export type DeleteHarvestRecordMutationResult = Apollo.MutationResult<DeleteHarvestRecordMutation>;
export type DeleteHarvestRecordMutationOptions = Apollo.BaseMutationOptions<DeleteHarvestRecordMutation, DeleteHarvestRecordMutationVariables>;
export const GetBlockDocument = gql`
    query GetBlock($id: ID!) {
  block(id: $id) {
    ...BlockWithRelations
  }
}
    ${BlockWithRelationsFragmentDoc}`;

/**
 * __useGetBlockQuery__
 *
 * To run a query within a React component, call `useGetBlockQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBlockQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBlockQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBlockQuery(baseOptions: Apollo.QueryHookOptions<GetBlockQuery, GetBlockQueryVariables> & ({ variables: GetBlockQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetBlockQuery, GetBlockQueryVariables>(GetBlockDocument, options);
      }
export function useGetBlockLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetBlockQuery, GetBlockQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetBlockQuery, GetBlockQueryVariables>(GetBlockDocument, options);
        }
// @ts-ignore
export function useGetBlockSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetBlockQuery, GetBlockQueryVariables>): Apollo.UseSuspenseQueryResult<GetBlockQuery, GetBlockQueryVariables>;
export function useGetBlockSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBlockQuery, GetBlockQueryVariables>): Apollo.UseSuspenseQueryResult<GetBlockQuery | undefined, GetBlockQueryVariables>;
export function useGetBlockSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBlockQuery, GetBlockQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetBlockQuery, GetBlockQueryVariables>(GetBlockDocument, options);
        }
export type GetBlockQueryHookResult = ReturnType<typeof useGetBlockQuery>;
export type GetBlockLazyQueryHookResult = ReturnType<typeof useGetBlockLazyQuery>;
export type GetBlockSuspenseQueryHookResult = ReturnType<typeof useGetBlockSuspenseQuery>;
export type GetBlockQueryResult = Apollo.QueryResult<GetBlockQuery, GetBlockQueryVariables>;
export const CreateBlockDocument = gql`
    mutation CreateBlock($input: CreateBlockInput!) {
  createBlock(input: $input) {
    ...BlockWithRelations
  }
}
    ${BlockWithRelationsFragmentDoc}`;
export type CreateBlockMutationFn = Apollo.MutationFunction<CreateBlockMutation, CreateBlockMutationVariables>;

/**
 * __useCreateBlockMutation__
 *
 * To run a mutation, you first call `useCreateBlockMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBlockMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBlockMutation, { data, loading, error }] = useCreateBlockMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateBlockMutation(baseOptions?: Apollo.MutationHookOptions<CreateBlockMutation, CreateBlockMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateBlockMutation, CreateBlockMutationVariables>(CreateBlockDocument, options);
      }
export type CreateBlockMutationHookResult = ReturnType<typeof useCreateBlockMutation>;
export type CreateBlockMutationResult = Apollo.MutationResult<CreateBlockMutation>;
export type CreateBlockMutationOptions = Apollo.BaseMutationOptions<CreateBlockMutation, CreateBlockMutationVariables>;
export const UpdateBlockDocument = gql`
    mutation UpdateBlock($input: UpdateBlockInput!) {
  updateBlock(input: $input) {
    ...BlockWithRelations
  }
}
    ${BlockWithRelationsFragmentDoc}`;
export type UpdateBlockMutationFn = Apollo.MutationFunction<UpdateBlockMutation, UpdateBlockMutationVariables>;

/**
 * __useUpdateBlockMutation__
 *
 * To run a mutation, you first call `useUpdateBlockMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBlockMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBlockMutation, { data, loading, error }] = useUpdateBlockMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBlockMutation(baseOptions?: Apollo.MutationHookOptions<UpdateBlockMutation, UpdateBlockMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateBlockMutation, UpdateBlockMutationVariables>(UpdateBlockDocument, options);
      }
export type UpdateBlockMutationHookResult = ReturnType<typeof useUpdateBlockMutation>;
export type UpdateBlockMutationResult = Apollo.MutationResult<UpdateBlockMutation>;
export type UpdateBlockMutationOptions = Apollo.BaseMutationOptions<UpdateBlockMutation, UpdateBlockMutationVariables>;
export const DeleteBlockDocument = gql`
    mutation DeleteBlock($id: ID!) {
  deleteBlock(id: $id)
}
    `;
export type DeleteBlockMutationFn = Apollo.MutationFunction<DeleteBlockMutation, DeleteBlockMutationVariables>;

/**
 * __useDeleteBlockMutation__
 *
 * To run a mutation, you first call `useDeleteBlockMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBlockMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBlockMutation, { data, loading, error }] = useDeleteBlockMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBlockMutation(baseOptions?: Apollo.MutationHookOptions<DeleteBlockMutation, DeleteBlockMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteBlockMutation, DeleteBlockMutationVariables>(DeleteBlockDocument, options);
      }
export type DeleteBlockMutationHookResult = ReturnType<typeof useDeleteBlockMutation>;
export type DeleteBlockMutationResult = Apollo.MutationResult<DeleteBlockMutation>;
export type DeleteBlockMutationOptions = Apollo.BaseMutationOptions<DeleteBlockMutation, DeleteBlockMutationVariables>;
export const GetDivisionsDocument = gql`
    query GetDivisions {
  divisions {
    ...DivisionWithRelations
  }
}
    ${DivisionWithRelationsFragmentDoc}`;

/**
 * __useGetDivisionsQuery__
 *
 * To run a query within a React component, call `useGetDivisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDivisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDivisionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetDivisionsQuery(baseOptions?: Apollo.QueryHookOptions<GetDivisionsQuery, GetDivisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDivisionsQuery, GetDivisionsQueryVariables>(GetDivisionsDocument, options);
      }
export function useGetDivisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDivisionsQuery, GetDivisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDivisionsQuery, GetDivisionsQueryVariables>(GetDivisionsDocument, options);
        }
// @ts-ignore
export function useGetDivisionsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetDivisionsQuery, GetDivisionsQueryVariables>): Apollo.UseSuspenseQueryResult<GetDivisionsQuery, GetDivisionsQueryVariables>;
export function useGetDivisionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDivisionsQuery, GetDivisionsQueryVariables>): Apollo.UseSuspenseQueryResult<GetDivisionsQuery | undefined, GetDivisionsQueryVariables>;
export function useGetDivisionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDivisionsQuery, GetDivisionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetDivisionsQuery, GetDivisionsQueryVariables>(GetDivisionsDocument, options);
        }
export type GetDivisionsQueryHookResult = ReturnType<typeof useGetDivisionsQuery>;
export type GetDivisionsLazyQueryHookResult = ReturnType<typeof useGetDivisionsLazyQuery>;
export type GetDivisionsSuspenseQueryHookResult = ReturnType<typeof useGetDivisionsSuspenseQuery>;
export type GetDivisionsQueryResult = Apollo.QueryResult<GetDivisionsQuery, GetDivisionsQueryVariables>;
export const GetDivisionDocument = gql`
    query GetDivision($id: ID!) {
  division(id: $id) {
    ...DivisionWithRelations
  }
}
    ${DivisionWithRelationsFragmentDoc}`;

/**
 * __useGetDivisionQuery__
 *
 * To run a query within a React component, call `useGetDivisionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDivisionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDivisionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDivisionQuery(baseOptions: Apollo.QueryHookOptions<GetDivisionQuery, GetDivisionQueryVariables> & ({ variables: GetDivisionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetDivisionQuery, GetDivisionQueryVariables>(GetDivisionDocument, options);
      }
export function useGetDivisionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetDivisionQuery, GetDivisionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetDivisionQuery, GetDivisionQueryVariables>(GetDivisionDocument, options);
        }
// @ts-ignore
export function useGetDivisionSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetDivisionQuery, GetDivisionQueryVariables>): Apollo.UseSuspenseQueryResult<GetDivisionQuery, GetDivisionQueryVariables>;
export function useGetDivisionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDivisionQuery, GetDivisionQueryVariables>): Apollo.UseSuspenseQueryResult<GetDivisionQuery | undefined, GetDivisionQueryVariables>;
export function useGetDivisionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetDivisionQuery, GetDivisionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetDivisionQuery, GetDivisionQueryVariables>(GetDivisionDocument, options);
        }
export type GetDivisionQueryHookResult = ReturnType<typeof useGetDivisionQuery>;
export type GetDivisionLazyQueryHookResult = ReturnType<typeof useGetDivisionLazyQuery>;
export type GetDivisionSuspenseQueryHookResult = ReturnType<typeof useGetDivisionSuspenseQuery>;
export type GetDivisionQueryResult = Apollo.QueryResult<GetDivisionQuery, GetDivisionQueryVariables>;
export const CreateDivisionDocument = gql`
    mutation CreateDivision($input: CreateDivisionInput!) {
  createDivision(input: $input) {
    ...DivisionWithRelations
  }
}
    ${DivisionWithRelationsFragmentDoc}`;
export type CreateDivisionMutationFn = Apollo.MutationFunction<CreateDivisionMutation, CreateDivisionMutationVariables>;

/**
 * __useCreateDivisionMutation__
 *
 * To run a mutation, you first call `useCreateDivisionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDivisionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDivisionMutation, { data, loading, error }] = useCreateDivisionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDivisionMutation(baseOptions?: Apollo.MutationHookOptions<CreateDivisionMutation, CreateDivisionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateDivisionMutation, CreateDivisionMutationVariables>(CreateDivisionDocument, options);
      }
export type CreateDivisionMutationHookResult = ReturnType<typeof useCreateDivisionMutation>;
export type CreateDivisionMutationResult = Apollo.MutationResult<CreateDivisionMutation>;
export type CreateDivisionMutationOptions = Apollo.BaseMutationOptions<CreateDivisionMutation, CreateDivisionMutationVariables>;
export const UpdateDivisionDocument = gql`
    mutation UpdateDivision($input: UpdateDivisionInput!) {
  updateDivision(input: $input) {
    ...DivisionWithRelations
  }
}
    ${DivisionWithRelationsFragmentDoc}`;
export type UpdateDivisionMutationFn = Apollo.MutationFunction<UpdateDivisionMutation, UpdateDivisionMutationVariables>;

/**
 * __useUpdateDivisionMutation__
 *
 * To run a mutation, you first call `useUpdateDivisionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDivisionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDivisionMutation, { data, loading, error }] = useUpdateDivisionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateDivisionMutation(baseOptions?: Apollo.MutationHookOptions<UpdateDivisionMutation, UpdateDivisionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateDivisionMutation, UpdateDivisionMutationVariables>(UpdateDivisionDocument, options);
      }
export type UpdateDivisionMutationHookResult = ReturnType<typeof useUpdateDivisionMutation>;
export type UpdateDivisionMutationResult = Apollo.MutationResult<UpdateDivisionMutation>;
export type UpdateDivisionMutationOptions = Apollo.BaseMutationOptions<UpdateDivisionMutation, UpdateDivisionMutationVariables>;
export const DeleteDivisionDocument = gql`
    mutation DeleteDivision($id: ID!) {
  deleteDivision(id: $id)
}
    `;
export type DeleteDivisionMutationFn = Apollo.MutationFunction<DeleteDivisionMutation, DeleteDivisionMutationVariables>;

/**
 * __useDeleteDivisionMutation__
 *
 * To run a mutation, you first call `useDeleteDivisionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDivisionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDivisionMutation, { data, loading, error }] = useDeleteDivisionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDivisionMutation(baseOptions?: Apollo.MutationHookOptions<DeleteDivisionMutation, DeleteDivisionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteDivisionMutation, DeleteDivisionMutationVariables>(DeleteDivisionDocument, options);
      }
export type DeleteDivisionMutationHookResult = ReturnType<typeof useDeleteDivisionMutation>;
export type DeleteDivisionMutationResult = Apollo.MutationResult<DeleteDivisionMutation>;
export type DeleteDivisionMutationOptions = Apollo.BaseMutationOptions<DeleteDivisionMutation, DeleteDivisionMutationVariables>;
export const GetUsersDocument = gql`
    query GetUsers($companyId: String, $role: UserRole, $isActive: Boolean, $search: String, $limit: Int, $offset: Int) {
  users(
    companyId: $companyId
    role: $role
    isActive: $isActive
    search: $search
    limit: $limit
    offset: $offset
  ) {
    users {
      id
      username
      name
      email
      phoneNumber
      avatar
      role
      isActive
      createdAt
      updatedAt
      managerId
      companyId
      companies {
        id
        name
      }
      company {
        id
        name
      }
      estates {
        id
        name
      }
      divisions {
        id
        name
      }
    }
    totalCount
    hasNextPage
    pageInfo {
      currentPage
      totalPages
      hasNextPage
      hasPreviousPage
    }
  }
}
    `;

/**
 * __useGetUsersQuery__
 *
 * To run a query within a React component, call `useGetUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUsersQuery({
 *   variables: {
 *      companyId: // value for 'companyId'
 *      role: // value for 'role'
 *      isActive: // value for 'isActive'
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useGetUsersQuery(baseOptions?: Apollo.QueryHookOptions<GetUsersQuery, GetUsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, options);
      }
export function useGetUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUsersQuery, GetUsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, options);
        }
// @ts-ignore
export function useGetUsersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetUsersQuery, GetUsersQueryVariables>): Apollo.UseSuspenseQueryResult<GetUsersQuery, GetUsersQueryVariables>;
export function useGetUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUsersQuery, GetUsersQueryVariables>): Apollo.UseSuspenseQueryResult<GetUsersQuery | undefined, GetUsersQueryVariables>;
export function useGetUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUsersQuery, GetUsersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, options);
        }
export type GetUsersQueryHookResult = ReturnType<typeof useGetUsersQuery>;
export type GetUsersLazyQueryHookResult = ReturnType<typeof useGetUsersLazyQuery>;
export type GetUsersSuspenseQueryHookResult = ReturnType<typeof useGetUsersSuspenseQuery>;
export type GetUsersQueryResult = Apollo.QueryResult<GetUsersQuery, GetUsersQueryVariables>;
export const GetUserDocument = gql`
    query GetUser($id: ID!) {
  user(id: $id) {
    id
    username
    name
    email
    phoneNumber
    avatar
    role
    isActive
    managerId
    companyId
    companies {
      id
      name
    }
    manager {
      id
      name
    }
    estates {
      id
      name
    }
    divisions {
      id
      name
    }
  }
}
    `;

/**
 * __useGetUserQuery__
 *
 * To run a query within a React component, call `useGetUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetUserQuery(baseOptions: Apollo.QueryHookOptions<GetUserQuery, GetUserQueryVariables> & ({ variables: GetUserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserQuery, GetUserQueryVariables>(GetUserDocument, options);
      }
export function useGetUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserQuery, GetUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserQuery, GetUserQueryVariables>(GetUserDocument, options);
        }
// @ts-ignore
export function useGetUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetUserQuery, GetUserQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserQuery, GetUserQueryVariables>;
export function useGetUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserQuery, GetUserQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserQuery | undefined, GetUserQueryVariables>;
export function useGetUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserQuery, GetUserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserQuery, GetUserQueryVariables>(GetUserDocument, options);
        }
export type GetUserQueryHookResult = ReturnType<typeof useGetUserQuery>;
export type GetUserLazyQueryHookResult = ReturnType<typeof useGetUserLazyQuery>;
export type GetUserSuspenseQueryHookResult = ReturnType<typeof useGetUserSuspenseQuery>;
export type GetUserQueryResult = Apollo.QueryResult<GetUserQuery, GetUserQueryVariables>;
export const CreateUserDocument = gql`
    mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    success
    message
    user {
      id
      username
      role
    }
  }
}
    `;
export type CreateUserMutationFn = Apollo.MutationFunction<CreateUserMutation, CreateUserMutationVariables>;

/**
 * __useCreateUserMutation__
 *
 * To run a mutation, you first call `useCreateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createUserMutation, { data, loading, error }] = useCreateUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateUserMutation(baseOptions?: Apollo.MutationHookOptions<CreateUserMutation, CreateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateUserMutation, CreateUserMutationVariables>(CreateUserDocument, options);
      }
export type CreateUserMutationHookResult = ReturnType<typeof useCreateUserMutation>;
export type CreateUserMutationResult = Apollo.MutationResult<CreateUserMutation>;
export type CreateUserMutationOptions = Apollo.BaseMutationOptions<CreateUserMutation, CreateUserMutationVariables>;
export const UpdateUserDocument = gql`
    mutation UpdateUser($input: UpdateUserInput!) {
  updateUser(input: $input) {
    success
    message
    user {
      id
      username
      role
    }
  }
}
    `;
export type UpdateUserMutationFn = Apollo.MutationFunction<UpdateUserMutation, UpdateUserMutationVariables>;

/**
 * __useUpdateUserMutation__
 *
 * To run a mutation, you first call `useUpdateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserMutation, { data, loading, error }] = useUpdateUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserMutation, UpdateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserMutation, UpdateUserMutationVariables>(UpdateUserDocument, options);
      }
export type UpdateUserMutationHookResult = ReturnType<typeof useUpdateUserMutation>;
export type UpdateUserMutationResult = Apollo.MutationResult<UpdateUserMutation>;
export type UpdateUserMutationOptions = Apollo.BaseMutationOptions<UpdateUserMutation, UpdateUserMutationVariables>;
export const DeleteUserDocument = gql`
    mutation DeleteUser($id: ID!) {
  deleteUser(id: $id) {
    success
    message
  }
}
    `;
export type DeleteUserMutationFn = Apollo.MutationFunction<DeleteUserMutation, DeleteUserMutationVariables>;

/**
 * __useDeleteUserMutation__
 *
 * To run a mutation, you first call `useDeleteUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteUserMutation, { data, loading, error }] = useDeleteUserMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteUserMutation(baseOptions?: Apollo.MutationHookOptions<DeleteUserMutation, DeleteUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteUserMutation, DeleteUserMutationVariables>(DeleteUserDocument, options);
      }
export type DeleteUserMutationHookResult = ReturnType<typeof useDeleteUserMutation>;
export type DeleteUserMutationResult = Apollo.MutationResult<DeleteUserMutation>;
export type DeleteUserMutationOptions = Apollo.BaseMutationOptions<DeleteUserMutation, DeleteUserMutationVariables>;
export const ToggleUserStatusDocument = gql`
    mutation ToggleUserStatus($id: ID!) {
  toggleUserStatus(id: $id) {
    success
    message
    user {
      id
      isActive
    }
  }
}
    `;
export type ToggleUserStatusMutationFn = Apollo.MutationFunction<ToggleUserStatusMutation, ToggleUserStatusMutationVariables>;

/**
 * __useToggleUserStatusMutation__
 *
 * To run a mutation, you first call `useToggleUserStatusMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleUserStatusMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleUserStatusMutation, { data, loading, error }] = useToggleUserStatusMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useToggleUserStatusMutation(baseOptions?: Apollo.MutationHookOptions<ToggleUserStatusMutation, ToggleUserStatusMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleUserStatusMutation, ToggleUserStatusMutationVariables>(ToggleUserStatusDocument, options);
      }
export type ToggleUserStatusMutationHookResult = ReturnType<typeof useToggleUserStatusMutation>;
export type ToggleUserStatusMutationResult = Apollo.MutationResult<ToggleUserStatusMutation>;
export type ToggleUserStatusMutationOptions = Apollo.BaseMutationOptions<ToggleUserStatusMutation, ToggleUserStatusMutationVariables>;
export const ResetUserPasswordDocument = gql`
    mutation ResetUserPassword($input: ResetPasswordInput!) {
  resetUserPassword(input: $input) {
    success
    message
  }
}
    `;
export type ResetUserPasswordMutationFn = Apollo.MutationFunction<ResetUserPasswordMutation, ResetUserPasswordMutationVariables>;

/**
 * __useResetUserPasswordMutation__
 *
 * To run a mutation, you first call `useResetUserPasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetUserPasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetUserPasswordMutation, { data, loading, error }] = useResetUserPasswordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useResetUserPasswordMutation(baseOptions?: Apollo.MutationHookOptions<ResetUserPasswordMutation, ResetUserPasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetUserPasswordMutation, ResetUserPasswordMutationVariables>(ResetUserPasswordDocument, options);
      }
export type ResetUserPasswordMutationHookResult = ReturnType<typeof useResetUserPasswordMutation>;
export type ResetUserPasswordMutationResult = Apollo.MutationResult<ResetUserPasswordMutation>;
export type ResetUserPasswordMutationOptions = Apollo.BaseMutationOptions<ResetUserPasswordMutation, ResetUserPasswordMutationVariables>;
export const GetAllCompaniesDocument = gql`
    query GetAllCompanies {
  allCompanies(pageSize: 100) {
    companies {
      id
      name
      code
    }
  }
}
    `;

/**
 * __useGetAllCompaniesQuery__
 *
 * To run a query within a React component, call `useGetAllCompaniesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllCompaniesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllCompaniesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllCompaniesQuery(baseOptions?: Apollo.QueryHookOptions<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>(GetAllCompaniesDocument, options);
      }
export function useGetAllCompaniesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>(GetAllCompaniesDocument, options);
        }
// @ts-ignore
export function useGetAllCompaniesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>;
export function useGetAllCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllCompaniesQuery | undefined, GetAllCompaniesQueryVariables>;
export function useGetAllCompaniesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>(GetAllCompaniesDocument, options);
        }
export type GetAllCompaniesQueryHookResult = ReturnType<typeof useGetAllCompaniesQuery>;
export type GetAllCompaniesLazyQueryHookResult = ReturnType<typeof useGetAllCompaniesLazyQuery>;
export type GetAllCompaniesSuspenseQueryHookResult = ReturnType<typeof useGetAllCompaniesSuspenseQuery>;
export type GetAllCompaniesQueryResult = Apollo.QueryResult<GetAllCompaniesQuery, GetAllCompaniesQueryVariables>;
export const GetAllRolesDocument = gql`
    query GetAllRoles {
  allRoles {
    role
    name
    description
    level
  }
}
    `;

/**
 * __useGetAllRolesQuery__
 *
 * To run a query within a React component, call `useGetAllRolesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllRolesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllRolesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllRolesQuery(baseOptions?: Apollo.QueryHookOptions<GetAllRolesQuery, GetAllRolesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllRolesQuery, GetAllRolesQueryVariables>(GetAllRolesDocument, options);
      }
export function useGetAllRolesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllRolesQuery, GetAllRolesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllRolesQuery, GetAllRolesQueryVariables>(GetAllRolesDocument, options);
        }
// @ts-ignore
export function useGetAllRolesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllRolesQuery, GetAllRolesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllRolesQuery, GetAllRolesQueryVariables>;
export function useGetAllRolesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllRolesQuery, GetAllRolesQueryVariables>): Apollo.UseSuspenseQueryResult<GetAllRolesQuery | undefined, GetAllRolesQueryVariables>;
export function useGetAllRolesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAllRolesQuery, GetAllRolesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllRolesQuery, GetAllRolesQueryVariables>(GetAllRolesDocument, options);
        }
export type GetAllRolesQueryHookResult = ReturnType<typeof useGetAllRolesQuery>;
export type GetAllRolesLazyQueryHookResult = ReturnType<typeof useGetAllRolesLazyQuery>;
export type GetAllRolesSuspenseQueryHookResult = ReturnType<typeof useGetAllRolesSuspenseQuery>;
export type GetAllRolesQueryResult = Apollo.QueryResult<GetAllRolesQuery, GetAllRolesQueryVariables>;
export const GetManagerCandidatesDocument = gql`
    query GetManagerCandidates($search: String, $limit: Int) {
  users(search: $search, limit: $limit) {
    users {
      id
      username
      name
      role
    }
  }
}
    `;

/**
 * __useGetManagerCandidatesQuery__
 *
 * To run a query within a React component, call `useGetManagerCandidatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetManagerCandidatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetManagerCandidatesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGetManagerCandidatesQuery(baseOptions?: Apollo.QueryHookOptions<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>(GetManagerCandidatesDocument, options);
      }
export function useGetManagerCandidatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>(GetManagerCandidatesDocument, options);
        }
// @ts-ignore
export function useGetManagerCandidatesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>): Apollo.UseSuspenseQueryResult<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>;
export function useGetManagerCandidatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>): Apollo.UseSuspenseQueryResult<GetManagerCandidatesQuery | undefined, GetManagerCandidatesQueryVariables>;
export function useGetManagerCandidatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>(GetManagerCandidatesDocument, options);
        }
export type GetManagerCandidatesQueryHookResult = ReturnType<typeof useGetManagerCandidatesQuery>;
export type GetManagerCandidatesLazyQueryHookResult = ReturnType<typeof useGetManagerCandidatesLazyQuery>;
export type GetManagerCandidatesSuspenseQueryHookResult = ReturnType<typeof useGetManagerCandidatesSuspenseQuery>;
export type GetManagerCandidatesQueryResult = Apollo.QueryResult<GetManagerCandidatesQuery, GetManagerCandidatesQueryVariables>;
export const GetUserCompanyAssignmentsDocument = gql`
    query GetUserCompanyAssignments($userId: ID!) {
  companyAssignments {
    id
    userId
    companyId
    company {
      id
      name
    }
    isActive
  }
}
    `;

/**
 * __useGetUserCompanyAssignmentsQuery__
 *
 * To run a query within a React component, call `useGetUserCompanyAssignmentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserCompanyAssignmentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserCompanyAssignmentsQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useGetUserCompanyAssignmentsQuery(baseOptions: Apollo.QueryHookOptions<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables> & ({ variables: GetUserCompanyAssignmentsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>(GetUserCompanyAssignmentsDocument, options);
      }
export function useGetUserCompanyAssignmentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>(GetUserCompanyAssignmentsDocument, options);
        }
// @ts-ignore
export function useGetUserCompanyAssignmentsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>;
export function useGetUserCompanyAssignmentsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserCompanyAssignmentsQuery | undefined, GetUserCompanyAssignmentsQueryVariables>;
export function useGetUserCompanyAssignmentsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>(GetUserCompanyAssignmentsDocument, options);
        }
export type GetUserCompanyAssignmentsQueryHookResult = ReturnType<typeof useGetUserCompanyAssignmentsQuery>;
export type GetUserCompanyAssignmentsLazyQueryHookResult = ReturnType<typeof useGetUserCompanyAssignmentsLazyQuery>;
export type GetUserCompanyAssignmentsSuspenseQueryHookResult = ReturnType<typeof useGetUserCompanyAssignmentsSuspenseQuery>;
export type GetUserCompanyAssignmentsQueryResult = Apollo.QueryResult<GetUserCompanyAssignmentsQuery, GetUserCompanyAssignmentsQueryVariables>;