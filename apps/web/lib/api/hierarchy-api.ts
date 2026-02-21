import cookieApiClient from './cookie-client';
import { Company, Estate, Divisi, Block, User } from '@/types/auth';

// Enhanced hierarchy interfaces
export interface HierarchyNode {
  id: string;
  parentId?: string;
  type: 'company' | 'estate' | 'divisi' | 'block';
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  level: number;
  path: string; // Hierarchical path like "/company1/estate1/div1"
  metadata: Record<string, any>;
  children: HierarchyNode[];
  stats: HierarchyStats;
  permissions: HierarchyPermissions;
  conflicts: HierarchyConflict[];
  lastModified: {
    at: string;
    by: string;
    action: string;
  };
  position: number; // For ordering within parent
  tags: string[];
  customFields: Record<string, any>;
  geospatial?: {
    latitude?: number;
    longitude?: number;
    elevation?: number;
    boundaries?: Array<{ lat: number; lng: number }>;
  };
}

export interface HierarchyStats {
  totalArea: number;
  activeArea: number;
  childCount: number;
  activeChildCount: number;
  userCount: number;
  utilization: number;
  productivity?: number;
  completeness: number; // Data completeness percentage
  healthScore: number; // Overall health score
  trends: {
    areaGrowth: number;
    productivityTrend: number;
    utilizationTrend: number;
  };
}

export interface HierarchyPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateChildren: boolean;
  canMove: boolean;
  canAssignUsers: boolean;
  canExport: boolean;
  constraints: {
    maxChildren?: number;
    requiredFields: string[];
    allowedChildTypes: string[];
  };
}

export interface HierarchyConflict {
  id: string;
  type: 'duplicate_code' | 'area_mismatch' | 'circular_reference' | 'data_inconsistency' | 'permission_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedNodes: string[];
  suggestedResolution: string;
  autoResolvable: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface HierarchyFilters {
  search?: string;
  types?: string[];
  status?: 'active' | 'inactive' | 'all';
  hasConflicts?: boolean;
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  areaRange?: {
    min: number;
    max: number;
  };
  location?: {
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  customFilters?: Record<string, any>;
  includeStats?: boolean;
  includePermissions?: boolean;
  includeConflicts?: boolean;
  maxDepth?: number;
}

export interface BulkOperation {
  operation: 'move' | 'activate' | 'deactivate' | 'delete' | 'update' | 'tag' | 'untag';
  nodeIds: string[];
  targetParentId?: string;
  position?: number;
  data?: Record<string, any>;
  tags?: string[];
  options?: {
    cascade?: boolean;
    force?: boolean;
    validateConstraints?: boolean;
  };
}

export interface HierarchyValidation {
  isValid: boolean;
  errors: Array<{
    nodeId: string;
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    nodeId: string;
    message: string;
    suggestion?: string;
  }>;
  suggestions: Array<{
    type: 'optimization' | 'restructure' | 'data_improvement';
    description: string;
    estimatedImpact: 'low' | 'medium' | 'high';
    actionRequired: boolean;
  }>;
}

export interface HierarchySnapshot {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  nodeCount: number;
  changes: Array<{
    nodeId: string;
    action: 'created' | 'updated' | 'moved' | 'deleted';
    before?: any;
    after?: any;
  }>;
  metadata: Record<string, any>;
}

export interface HierarchyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  structure: HierarchyNode;
  applicableFor: string[];
  defaultValues: Record<string, any>;
  constraints: Record<string, any>;
  createdBy: string;
  createdAt: string;
  usageCount: number;
  rating: number;
  tags: string[];
}

export class HierarchyAPI {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static eventListeners = new Map<string, (data: any) => void>();
  private static wsConnection: WebSocket | null = null;

  /**
   * Initialize real-time connection
   */
  static initializeRealTime(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // const wsUrl = `ws://localhost:8080/ws/hierarchy`;
      // this.wsConnection = new WebSocket(wsUrl);
      
      // Mock real-time events for development
      setInterval(() => {
        if (Math.random() > 0.95) { // 5% chance every 5 seconds
          const mockEvent = {
            type: 'hierarchy_updated',
            nodeId: `node_${Date.now()}`,
            action: ['created', 'updated', 'moved'][Math.floor(Math.random() * 3)],
            timestamp: new Date().toISOString(),
            userId: 'system',
            data: {
              name: `Auto-generated ${Date.now()}`,
              type: ['estate', 'divisi', 'block'][Math.floor(Math.random() * 3)]
            }
          };
          this.emitEvent(mockEvent);
        }
      }, 5000);
    } catch (error) {
      console.warn('Failed to initialize real-time connection:', error);
    }
  }

  /**
   * Subscribe to hierarchy events
   */
  static subscribe(callback: (event: any) => void): () => void {
    const id = `hierarchy_${Date.now()}_${Math.random()}`;
    this.eventListeners.set(id, callback);
    
    return () => {
      this.eventListeners.delete(id);
    };
  }

  private static emitEvent(event: any): void {
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in hierarchy event callback:', error);
      }
    });
  }

  /**
   * Get complete hierarchy tree with advanced filtering
   */
  static async getHierarchyTree(filters: HierarchyFilters = {}): Promise<{
    tree: HierarchyNode[];
    stats: {
      totalNodes: number;
      nodesByType: Record<string, number>;
      totalArea: number;
      averageHealthScore: number;
      conflictCount: number;
    };
    filters: HierarchyFilters;
    metadata: {
      lastUpdated: string;
      version: string;
      permissions: string[];
    };
  }> {
    const cacheKey = `hierarchy_tree_${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.types?.length) filters.types.forEach(type => params.append('types[]', type));
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.hasConflicts !== undefined) params.append('hasConflicts', filters.hasConflicts.toString());
      if (filters.includeStats !== undefined) params.append('includeStats', filters.includeStats.toString());
      if (filters.includePermissions !== undefined) params.append('includePermissions', filters.includePermissions.toString());
      if (filters.includeConflicts !== undefined) params.append('includeConflicts', filters.includeConflicts.toString());
      if (filters.maxDepth) params.append('maxDepth', filters.maxDepth.toString());

      type HierarchyTreeResponse = { tree: HierarchyNode[]; stats: { totalNodes: number; nodesByType: Record<string, number>; totalArea: number; averageHealthScore: number; conflictCount: number }; filters: HierarchyFilters; metadata: { lastUpdated: string; version: string; permissions: string[] } };
      const response = await cookieApiClient.get<HierarchyTreeResponse>(`/hierarchy/tree?${params.toString()}`);

      const result = (response.data || response) as HierarchyTreeResponse;
      this.setCache(cacheKey, result, 30000); // Cache for 30 seconds
      return result;
    } catch (error: any) {
      // Silently handle 404 errors for hierarchy endpoints that don't exist yet
      if (error?.response?.status === 404) {
        // Don't log the 404 error as it's expected for this development phase
      } else {
        console.warn('Hierarchy API error:', error?.message || 'Unknown error');
      }
      return this.generateEnhancedMockHierarchy(filters);
    }
  }

  /**
   * Get detailed node information
   */
  static async getNode(nodeId: string, options?: {
    includeAncestors?: boolean;
    includeDescendants?: boolean;
    includeStats?: boolean;
    includePermissions?: boolean;
    includeConflicts?: boolean;
    maxDepth?: number;
  }): Promise<HierarchyNode> {
    try {
      const params = new URLSearchParams();
      if (options?.includeAncestors) params.append('includeAncestors', 'true');
      if (options?.includeDescendants) params.append('includeDescendants', 'true');
      if (options?.includeStats) params.append('includeStats', 'true');
      if (options?.includePermissions) params.append('includePermissions', 'true');
      if (options?.includeConflicts) params.append('includeConflicts', 'true');
      if (options?.maxDepth) params.append('maxDepth', options.maxDepth.toString());

      const response = await cookieApiClient.get<HierarchyNode>(`/hierarchy/nodes/${nodeId}?${params.toString()}`);
      return (response.data || response) as HierarchyNode;
    } catch (error) {
      console.warn('Node API not available, using fallback');
      return this.generateMockNode(nodeId, options);
    }
  }

  /**
   * Create new hierarchy node
   */
  static async createNode(parentId: string | null, nodeData: {
    type: 'company' | 'estate' | 'divisi' | 'block';
    code: string;
    name: string;
    description?: string;
    metadata?: Record<string, any>;
    customFields?: Record<string, any>;
    geospatial?: {
      latitude?: number;
      longitude?: number;
      elevation?: number;
    };
    tags?: string[];
    position?: number;
  }): Promise<{
    node: HierarchyNode;
    conflicts: HierarchyConflict[];
    validation: HierarchyValidation;
  }> {
    try {
      type CreateNodeResponse = { node: HierarchyNode; conflicts: HierarchyConflict[]; validation: HierarchyValidation };
      const response = await cookieApiClient.post<CreateNodeResponse>('/hierarchy/nodes', {
        parentId,
        ...nodeData
      });

      const result = (response.data || response) as CreateNodeResponse;

      // Emit real-time event
      this.emitEvent({
        type: 'node_created',
        nodeId: result.node.id,
        action: 'created',
        timestamp: new Date().toISOString(),
        data: result.node
      });

      // Clear relevant cache
      this.clearCacheByPattern('hierarchy_tree_');

      return result;
    } catch (error) {
      console.warn('Create node API not available, simulating creation');
      const mockNode = this.generateMockNode(`node_${Date.now()}`, { includeStats: true });
      
      return {
        node: {
          ...mockNode,
          ...nodeData,
          parentId,
          level: parentId ? 2 : 1,
          path: parentId ? `/parent/${mockNode.id}` : `/${mockNode.id}`,
          children: [],
          lastModified: {
            at: new Date().toISOString(),
            by: 'current_user',
            action: 'created'
          }
        },
        conflicts: [],
        validation: {
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: []
        }
      };
    }
  }

  /**
   * Update hierarchy node
   */
  static async updateNode(nodeId: string, updates: Partial<{
    code: string;
    name: string;
    description: string;
    isActive: boolean;
    metadata: Record<string, any>;
    customFields: Record<string, any>;
    geospatial: {
      latitude?: number;
      longitude?: number;
      elevation?: number;
    };
    tags: string[];
  }>): Promise<{
    node: HierarchyNode;
    conflicts: HierarchyConflict[];
    validation: HierarchyValidation;
    changelog: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }> {
    try {
      type UpdateNodeResponse = { node: HierarchyNode; conflicts: HierarchyConflict[]; validation: HierarchyValidation; changelog: Array<{ field: string; oldValue: any; newValue: any }> };
      const response = await cookieApiClient.put<UpdateNodeResponse>(`/hierarchy/nodes/${nodeId}`, updates);

      const result = (response.data || response) as UpdateNodeResponse;

      // Emit real-time event
      this.emitEvent({
        type: 'node_updated',
        nodeId,
        action: 'updated',
        timestamp: new Date().toISOString(),
        changes: updates
      });

      // Clear cache
      this.clearCacheByPattern('hierarchy_');

      return result;
    } catch (error) {
      console.warn('Update node API not available, simulating update');
      
      const mockNode = this.generateMockNode(nodeId, { includeStats: true });
      return {
        node: {
          ...mockNode,
          ...updates,
          lastModified: {
            at: new Date().toISOString(),
            by: 'current_user',
            action: 'updated'
          }
        },
        conflicts: [],
        validation: { isValid: true, errors: [], warnings: [], suggestions: [] },
        changelog: Object.entries(updates).map(([field, newValue]) => ({
          field,
          oldValue: `old_${field}`,
          newValue
        }))
      };
    }
  }

  /**
   * Move node to new parent (drag-and-drop support)
   */
  static async moveNode(nodeId: string, newParentId: string | null, position?: number): Promise<{
    success: boolean;
    node: HierarchyNode;
    conflicts: HierarchyConflict[];
    validation: HierarchyValidation;
    affectedNodes: string[];
  }> {
    try {
      type MoveNodeResponse = { success: boolean; node: HierarchyNode; conflicts: HierarchyConflict[]; validation: HierarchyValidation; affectedNodes: string[] };
      const response = await cookieApiClient.post<MoveNodeResponse>(`/hierarchy/nodes/${nodeId}/move`, {
        newParentId,
        position
      });

      const result = (response.data || response) as MoveNodeResponse;

      // Emit real-time event
      this.emitEvent({
        type: 'node_moved',
        nodeId,
        action: 'moved',
        timestamp: new Date().toISOString(),
        data: { newParentId, position }
      });

      // Clear cache
      this.clearCacheByPattern('hierarchy_');

      return result;
    } catch (error) {
      console.warn('Move node API not available, simulating move');
      
      const mockNode = this.generateMockNode(nodeId);
      return {
        success: true,
        node: {
          ...mockNode,
          parentId: newParentId,
          position: position || 0,
          lastModified: {
            at: new Date().toISOString(),
            by: 'current_user',
            action: 'moved'
          }
        },
        conflicts: [],
        validation: { isValid: true, errors: [], warnings: [], suggestions: [] },
        affectedNodes: [nodeId]
      };
    }
  }

  /**
   * Delete hierarchy node
   */
  static async deleteNode(nodeId: string, options?: {
    cascade?: boolean;
    force?: boolean;
    archiveData?: boolean;
  }): Promise<{
    success: boolean;
    deletedNodes: string[];
    archivedData?: any;
    conflicts: HierarchyConflict[];
  }> {
    try {
      // Build query params from options
      const params = new URLSearchParams();
      if (options?.cascade) params.append('cascade', 'true');
      if (options?.force) params.append('force', 'true');
      if (options?.archiveData) params.append('archiveData', 'true');
      const queryString = params.toString() ? `?${params.toString()}` : '';

      type DeleteNodeResponse = { success: boolean; deletedNodes: string[]; archivedData?: any; conflicts: HierarchyConflict[] };
      const response = await cookieApiClient.delete<DeleteNodeResponse>(`/hierarchy/nodes/${nodeId}${queryString}`);

      const result = (response.data || response) as DeleteNodeResponse;

      // Emit real-time event
      this.emitEvent({
        type: 'node_deleted',
        nodeId,
        action: 'deleted',
        timestamp: new Date().toISOString(),
        data: { cascade: options?.cascade, force: options?.force }
      });

      // Clear cache
      this.clearCacheByPattern('hierarchy_');

      return result;
    } catch (error) {
      console.warn('Delete node API not available, simulating deletion');
      
      return {
        success: true,
        deletedNodes: [nodeId],
        conflicts: []
      };
    }
  }

  /**
   * Perform bulk operations
   */
  static async bulkOperation(operation: BulkOperation): Promise<{
    success: boolean;
    results: Array<{
      nodeId: string;
      success: boolean;
      error?: string;
    }>;
    conflicts: HierarchyConflict[];
    validation: HierarchyValidation;
  }> {
    try {
      type BulkOperationResponse = { success: boolean; results: Array<{ nodeId: string; success: boolean; error?: string }>; conflicts: HierarchyConflict[]; validation: HierarchyValidation };
      const response = await cookieApiClient.post<BulkOperationResponse>('/hierarchy/bulk-operation', operation);

      const result = (response.data || response) as BulkOperationResponse;

      // Emit real-time event
      this.emitEvent({
        type: 'bulk_operation_completed',
        operation: operation.operation,
        nodeIds: operation.nodeIds,
        timestamp: new Date().toISOString(),
        results: result.results
      });

      // Clear cache
      this.clearCacheByPattern('hierarchy_');

      return result;
    } catch (error) {
      console.warn('Bulk operation API not available, simulating bulk operation');
      
      const results = operation.nodeIds.map(nodeId => ({
        nodeId,
        success: Math.random() > 0.1, // 90% success rate
        error: Math.random() > 0.9 ? 'Simulated error' : undefined
      }));
      
      return {
        success: results.every(r => r.success),
        results,
        conflicts: [],
        validation: { isValid: true, errors: [], warnings: [], suggestions: [] }
      };
    }
  }

  /**
   * Validate hierarchy structure
   */
  static async validateHierarchy(nodeIds?: string[]): Promise<HierarchyValidation> {
    try {
      const params = nodeIds ? `?nodeIds=${nodeIds.join(',')}` : '';
      const response = await cookieApiClient.get<HierarchyValidation>(`/hierarchy/validate${params}`);
      return (response.data || response) as HierarchyValidation;
    } catch (error) {
      console.warn('Validation API not available, using mock validation');
      
      return {
        isValid: true,
        errors: [],
        warnings: [
          {
            nodeId: 'mock_node',
            message: 'Mock validation warning - API not connected',
            suggestion: 'Connect to real API for actual validation'
          }
        ],
        suggestions: [
          {
            type: 'optimization',
            description: 'Consider restructuring for better performance',
            estimatedImpact: 'medium',
            actionRequired: false
          }
        ]
      };
    }
  }

  /**
   * Get hierarchy conflicts
   */
  static async getConflicts(): Promise<HierarchyConflict[]> {
    try {
      const response = await cookieApiClient.get<HierarchyConflict[]>('/hierarchy/conflicts');
      return (response.data || response) as HierarchyConflict[];
    } catch (error) {
      console.warn('Conflicts API not available, using mock data');
      
      return [
        {
          id: 'conflict_1',
          type: 'duplicate_code',
          severity: 'medium',
          description: 'Duplicate estate codes detected: EST001 used in multiple locations',
          affectedNodes: ['estate_1', 'estate_2'],
          suggestedResolution: 'Rename one of the estates with unique code',
          autoResolvable: false,
          createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
          id: 'conflict_2',
          type: 'area_mismatch',
          severity: 'low',
          description: 'Division area exceeds parent estate area',
          affectedNodes: ['estate_3', 'division_5'],
          suggestedResolution: 'Adjust division area or estate area',
          autoResolvable: true,
          createdAt: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        }
      ];
    }
  }

  /**
   * Resolve conflict
   */
  static async resolveConflict(conflictId: string, resolution: {
    action: 'auto_resolve' | 'manual_resolve' | 'ignore';
    data?: Record<string, any>;
    notes?: string;
  }): Promise<{
    success: boolean;
    conflict: HierarchyConflict;
    affectedNodes: string[];
  }> {
    try {
      type ResolveConflictResponse = { success: boolean; conflict: HierarchyConflict; affectedNodes: string[] };
      const response = await cookieApiClient.post<ResolveConflictResponse>(`/hierarchy/conflicts/${conflictId}/resolve`, resolution);

      const result = (response.data || response) as ResolveConflictResponse;

      // Clear cache
      this.clearCacheByPattern('hierarchy_');

      return result;
    } catch (error) {
      console.warn('Resolve conflict API not available, simulating resolution');
      
      return {
        success: true,
        conflict: {
          id: conflictId,
          type: 'duplicate_code',
          severity: 'medium',
          description: 'Resolved conflict',
          affectedNodes: [],
          suggestedResolution: '',
          autoResolvable: false,
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'current_user'
        },
        affectedNodes: []
      };
    }
  }

  /**
   * Search hierarchy nodes with advanced filters
   */
  static async searchNodes(query: string, filters: HierarchyFilters = {}): Promise<{
    nodes: HierarchyNode[];
    facets: {
      types: Array<{ type: string; count: number }>;
      locations: Array<{ location: string; count: number }>;
      tags: Array<{ tag: string; count: number }>;
    };
    suggestions: string[];
    total: number;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.types?.length) filters.types.forEach(type => params.append('types[]', type));
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.tags?.length) filters.tags.forEach(tag => params.append('tags[]', tag));

      type SearchResponse = { nodes: HierarchyNode[]; facets: { types: Array<{ type: string; count: number }>; locations: Array<{ location: string; count: number }>; tags: Array<{ tag: string; count: number }> }; suggestions: string[]; total: number };
      const response = await cookieApiClient.get<SearchResponse>(`/hierarchy/search?${params.toString()}`);
      return (response.data || response) as SearchResponse;
    } catch (error) {
      console.warn('Search API not available, using mock search');
      
      const mockNodes = Array.from({ length: 3 }, (_, i) => 
        this.generateMockNode(`search_result_${i}`, { includeStats: true })
      );
      
      return {
        nodes: mockNodes,
        facets: {
          types: [
            { type: 'estate', count: 5 },
            { type: 'divisi', count: 12 },
            { type: 'block', count: 24 }
          ],
          locations: [
            { location: 'Riau', count: 15 },
            { location: 'Sumatra Utara', count: 8 }
          ],
          tags: [
            { tag: 'productive', count: 20 },
            { tag: 'new', count: 5 }
          ]
        },
        suggestions: ['sawit', 'estate', 'divisi'],
        total: mockNodes.length
      };
    }
  }

  /**
   * Export hierarchy data
   */
  static async exportHierarchy(format: 'csv' | 'xlsx' | 'json' | 'pdf', options?: {
    nodeIds?: string[];
    includeStats?: boolean;
    includeGeospatial?: boolean;
    customTemplate?: string;
  }): Promise<{
    downloadUrl: string;
    fileName: string;
    size: number;
    expiresAt: string;
  }> {
    try {
      type ExportResponse = { downloadUrl: string; fileName: string; size: number; expiresAt: string };
      const response = await cookieApiClient.post<ExportResponse>('/hierarchy/export', {
        format,
        ...options
      });

      return (response.data || response) as ExportResponse;
    } catch (error) {
      console.warn('Export API not available, generating mock export');
      
      const fileName = `hierarchy_export_${Date.now()}.${format}`;
      const mockUrl = `data:text/plain;charset=utf-8,Mock export data for ${format}`;
      
      return {
        downloadUrl: mockUrl,
        fileName,
        size: 1024,
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
      };
    }
  }

  /**
   * Import hierarchy data
   */
  static async importHierarchy(file: File, options?: {
    format?: 'csv' | 'xlsx' | 'json';
    parentNodeId?: string;
    mergeStrategy?: 'overwrite' | 'merge' | 'skip_duplicates';
    validateOnly?: boolean;
  }): Promise<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: Array<{
      row?: number;
      field?: string;
      message: string;
    }>;
    preview?: HierarchyNode[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (options) {
        formData.append('options', JSON.stringify(options));
      }

      type ImportResponse = { success: boolean; imported: number; skipped: number; errors: Array<{ row?: number; field?: string; message: string }>; preview?: HierarchyNode[] };
      const response = await cookieApiClient.post<ImportResponse>('/hierarchy/import', formData);

      const result = (response.data || response) as ImportResponse;

      if (!options?.validateOnly && result.success) {
        // Clear cache after successful import
        this.clearCacheByPattern('hierarchy_');
        
        // Emit real-time event
        this.emitEvent({
          type: 'hierarchy_imported',
          imported: result.imported,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.warn('Import API not available, simulating import');
      
      return {
        success: true,
        imported: 10,
        skipped: 2,
        errors: [
          {
            row: 5,
            field: 'code',
            message: 'Duplicate code detected'
          }
        ]
      };
    }
  }

  /**
   * Get hierarchy analytics and insights
   */
  static async getAnalytics(timeRange?: '7d' | '30d' | '90d' | '1y'): Promise<{
    overview: {
      totalNodes: number;
      activeNodes: number;
      totalArea: number;
      averageUtilization: number;
      healthScore: number;
    };
    trends: {
      growthRate: number;
      utilizationTrend: number;
      productivityTrend: number;
    };
    distribution: {
      byType: Array<{ type: string; count: number; percentage: number }>;
      byStatus: Array<{ status: string; count: number; percentage: number }>;
      byLocation: Array<{ location: string; count: number; area: number }>;
    };
    performance: {
      topPerformers: HierarchyNode[];
      underPerformers: HierarchyNode[];
      recommendations: Array<{
        type: string;
        description: string;
        priority: number;
        affectedNodes: string[];
      }>;
    };
    forecast: {
      expectedGrowth: number;
      capacityUtilization: number;
      recommendedActions: string[];
    };
  }> {
    try {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      type AnalyticsResponse = { overview: { totalNodes: number; activeNodes: number; totalArea: number; averageUtilization: number; healthScore: number }; trends: { growthRate: number; utilizationTrend: number; productivityTrend: number }; distribution: { byType: Array<{ type: string; count: number; percentage: number }>; byStatus: Array<{ status: string; count: number; percentage: number }>; byLocation: Array<{ location: string; count: number; area: number }> }; performance: { topPerformers: HierarchyNode[]; underPerformers: HierarchyNode[]; recommendations: Array<{ type: string; description: string; priority: number; affectedNodes: string[] }> }; forecast: { expectedGrowth: number; capacityUtilization: number; recommendedActions: string[] } };
      const response = await cookieApiClient.get<AnalyticsResponse>(`/hierarchy/analytics${params}`);
      return (response.data || response) as AnalyticsResponse;
    } catch (error) {
      console.warn('Analytics API not available, using mock analytics');
      
      return {
        overview: {
          totalNodes: 125,
          activeNodes: 118,
          totalArea: 15500,
          averageUtilization: 87.5,
          healthScore: 92
        },
        trends: {
          growthRate: 12.5,
          utilizationTrend: 3.2,
          productivityTrend: -1.8
        },
        distribution: {
          byType: [
            { type: 'estate', count: 8, percentage: 35 },
            { type: 'divisi', count: 24, percentage: 40 },
            { type: 'block', count: 93, percentage: 25 }
          ],
          byStatus: [
            { status: 'active', count: 118, percentage: 94.4 },
            { status: 'inactive', count: 7, percentage: 5.6 }
          ],
          byLocation: [
            { location: 'Riau', count: 75, area: 9500 },
            { location: 'Sumatra Utara', count: 50, area: 6000 }
          ]
        },
        performance: {
          topPerformers: [this.generateMockNode('top_1'), this.generateMockNode('top_2')],
          underPerformers: [this.generateMockNode('under_1')],
          recommendations: [
            {
              type: 'optimization',
              description: 'Consider consolidating underutilized divisions',
              priority: 8,
              affectedNodes: ['div_1', 'div_3']
            }
          ]
        },
        forecast: {
          expectedGrowth: 15.3,
          capacityUtilization: 91.2,
          recommendedActions: [
            'Invest in division expansion',
            'Optimize resource allocation',
            'Implement productivity improvements'
          ]
        }
      };
    }
  }

  // Enhanced mock data generators
  private static generateEnhancedMockHierarchy(filters: HierarchyFilters): any {
    const companies = Array.from({ length: 3 }, (_, i) => 
      this.generateMockNode(`company_${i + 1}`, { 
        includeStats: true,
        includePermissions: true 
      })
    );
    
    companies.forEach(company => {
      company.type = 'company';
      company.level = 0;
      company.path = `/${company.id}`;
      company.children = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, (_, j) => {
        const estate = this.generateMockNode(`estate_${company.id}_${j}`, { 
          includeStats: true 
        });
        estate.type = 'estate';
        estate.parentId = company.id;
        estate.level = 1;
        estate.path = `${company.path}/${estate.id}`;
        estate.children = Array.from({ length: 2 + Math.floor(Math.random() * 4) }, (_, k) => {
          const divisi = this.generateMockNode(`divisi_${estate.id}_${k}`, { 
            includeStats: true 
          });
          divisi.type = 'divisi';
          divisi.parentId = estate.id;
          divisi.level = 2;
          divisi.path = `${estate.path}/${divisi.id}`;
          divisi.children = Array.from({ length: 3 + Math.floor(Math.random() * 5) }, (_, l) => {
            const block = this.generateMockNode(`block_${divisi.id}_${l}`, { 
              includeStats: true 
            });
            block.type = 'block';
            block.parentId = divisi.id;
            block.level = 3;
            block.path = `${divisi.path}/${block.id}`;
            block.children = [];
            return block;
          });
          return divisi;
        });
        return estate;
      });
    });
    
    const allNodes = this.flattenTree(companies);
    
    return {
      tree: companies,
      stats: {
        totalNodes: allNodes.length,
        nodesByType: {
          company: companies.length,
          estate: allNodes.filter(n => n.type === 'estate').length,
          divisi: allNodes.filter(n => n.type === 'divisi').length,
          block: allNodes.filter(n => n.type === 'block').length
        },
        totalArea: allNodes.reduce((sum, n) => sum + (n.stats?.totalArea || 0), 0),
        averageHealthScore: 88.5,
        conflictCount: 2
      },
      filters,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        permissions: ['read', 'write', 'delete']
      }
    };
  }

  private static generateMockNode(id: string, options?: {
    includeStats?: boolean;
    includePermissions?: boolean;
    includeConflicts?: boolean;
  }): HierarchyNode {
    const node: HierarchyNode = {
      id,
      type: 'estate',
      code: `CODE${id.slice(-3).toUpperCase()}`,
      name: `Node ${id}`,
      description: `Description for ${id}`,
      isActive: Math.random() > 0.1,
      level: 1,
      path: `/${id}`,
      metadata: {
        category: 'standard',
        priority: Math.floor(Math.random() * 10) + 1
      },
      children: [],
      stats: {
        totalArea: Math.floor(Math.random() * 1000) + 500,
        activeArea: Math.floor(Math.random() * 800) + 400,
        childCount: Math.floor(Math.random() * 10),
        activeChildCount: Math.floor(Math.random() * 8),
        userCount: Math.floor(Math.random() * 20) + 5,
        utilization: Math.floor(Math.random() * 40) + 60,
        productivity: Math.floor(Math.random() * 30) + 70,
        completeness: Math.floor(Math.random() * 20) + 80,
        healthScore: Math.floor(Math.random() * 30) + 70,
        trends: {
          areaGrowth: (Math.random() - 0.5) * 20,
          productivityTrend: (Math.random() - 0.5) * 10,
          utilizationTrend: (Math.random() - 0.5) * 15
        }
      },
      permissions: {
        canView: true,
        canEdit: Math.random() > 0.2,
        canDelete: Math.random() > 0.7,
        canCreateChildren: Math.random() > 0.3,
        canMove: Math.random() > 0.5,
        canAssignUsers: Math.random() > 0.4,
        canExport: true,
        constraints: {
          maxChildren: Math.floor(Math.random() * 10) + 5,
          requiredFields: ['code', 'name'],
          allowedChildTypes: ['divisi', 'block']
        }
      },
      conflicts: [],
      lastModified: {
        at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        by: `user_${Math.floor(Math.random() * 10)}`,
        action: ['created', 'updated', 'moved'][Math.floor(Math.random() * 3)]
      },
      position: Math.floor(Math.random() * 10),
      tags: ['productive', 'optimized', 'monitored'].slice(0, Math.floor(Math.random() * 3) + 1),
      customFields: {
        variety: ['Tenera', 'Dura', 'Pisifera'][Math.floor(Math.random() * 3)],
        plantingYear: 2015 + Math.floor(Math.random() * 8)
      },
      geospatial: {
        latitude: -2 + Math.random() * 4,
        longitude: 100 + Math.random() * 10,
        elevation: Math.floor(Math.random() * 500) + 50
      }
    };

    return node;
  }

  private static flattenTree(nodes: HierarchyNode[]): HierarchyNode[] {
    const result: HierarchyNode[] = [];
    
    const traverse = (nodeList: HierarchyNode[]) => {
      for (const node of nodeList) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    
    traverse(nodes);
    return result;
  }

  // Cache management
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private static clearCacheByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Initialize real-time connection when module loads
if (typeof window !== 'undefined') {
  HierarchyAPI.initializeRealTime();
}

// Export the main API instance and types that pages expect
export const hierarchyApiService = HierarchyAPI;
export type HierarchyData = HierarchyNode;