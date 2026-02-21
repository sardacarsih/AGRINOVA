'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react/hooks';
import { GET_FEATURE_HIERARCHY, GET_FEATURE_STATS } from '@/lib/apollo/queries/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Package,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FeatureNode {
  feature: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    module: string;
    isActive: boolean;
    isSystem: boolean;
  };
  children: FeatureNode[];
  depth: number;
}

export function FeatureGroupsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: hierarchyData, loading: hierarchyLoading } = useQuery(
    GET_FEATURE_HIERARCHY,
    {
      variables: { module: moduleFilter || undefined },
      fetchPolicy: 'network-only'
    }
  );

  const { data: statsData, loading: statsLoading } = useQuery(GET_FEATURE_STATS, {
    fetchPolicy: 'network-only'
  });

  const features: FeatureNode[] = hierarchyData?.getFeatureHierarchy || [];
  const stats = statsData?.getFeatureStats;

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Recursive search filter
  const filterNode = (node: FeatureNode): boolean => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      node.feature.name.toLowerCase().includes(query) ||
      node.feature.displayName?.toLowerCase().includes(query) ||
      node.feature.description?.toLowerCase().includes(query);

    // Also check if any children match
    const childrenMatch = node.children?.some(child => filterNode(child));

    return matchesSearch || childrenMatch;
  };

  const filteredFeatures = useMemo(() => {
    if (!searchQuery) return features;
    return features.filter(filterNode);
  }, [features, searchQuery]);

  const renderNode = (node: FeatureNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.feature.id);
    const hasChildren = node.children && node.children.length > 0;

    // Skip if doesn't match search
    if (!filterNode(node)) return null;

    return (
      <div key={node.feature.id}>
        <div
          className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2 transition-colors"
          style={{ marginLeft: `${level * 20}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.feature.id)}
              className="hover:bg-gray-200 rounded p-1 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <Package className={`w-4 h-4 ${node.feature.isActive ? 'text-emerald-600' : 'text-gray-400'}`} />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{node.feature.displayName || node.feature.name}</span>
              <Badge variant="outline" className="text-xs">
                {node.feature.module}
              </Badge>
              {node.feature.isSystem && (
                <Badge variant="secondary" className="text-xs">System</Badge>
              )}
              {!node.feature.isActive && (
                <Badge variant="destructive" className="text-xs">Inactive</Badge>
              )}
            </div>
            {node.feature.description && (
              <p className="text-xs text-gray-500 mt-0.5">{node.feature.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{node.feature.name}</p>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Features</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    stats?.totalFeatures || 0
                  )}
                </p>
              </div>
              <Package className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Features</p>
                <p className="text-2xl font-bold text-green-600">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    stats?.activeFeatures || 0
                  )}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Features</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    stats?.systemFeatures || 0
                  )}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Custom Features</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    stats?.customFeatures || 0
                  )}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Feature
        </Button>
      </div>

      {/* Feature Hierarchy Tree */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {hierarchyLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : features.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No features found</p>
                <p className="text-sm mt-1">Features may not be configured in the backend</p>
              </div>
            ) : filteredFeatures.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No features match your search</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFeatures.map(node => renderNode(node))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
