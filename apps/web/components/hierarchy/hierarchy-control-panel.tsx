'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Layers,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Grid3x3,
  List,
  Network,
  Zap,
  Users,
  Building,
  MapPin,
  Square,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Globe,
  Calendar,
  Clock,
  Bookmark,
  Tag,
  ChevronDown,
  X,
  Plus,
  Minus,
  RotateCcw,
  Save,
  Share,
  Info,
  HelpCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';

import { 
  HierarchyAPI, 
  HierarchyFilters, 
  HierarchyNode, 
  HierarchyConflict,
  BulkOperation
} from '@/lib/api/hierarchy-api';
import { cn } from '@/lib/utils';

interface HierarchyControlPanelProps {
  nodes: HierarchyNode[];
  selectedNodes: string[];
  onFiltersChange: (filters: HierarchyFilters) => void;
  onViewModeChange: (mode: 'tree' | 'grid' | 'network') => void;
  onNodeSelect: (nodeIds: string[]) => void;
  onBulkOperation: (operation: BulkOperation) => Promise<void>;
  onExport: (format: 'csv' | 'xlsx' | 'json' | 'pdf') => void;
  onImport: (file: File) => void;
  onRefresh: () => void;
  currentFilters: HierarchyFilters;
  viewMode: 'tree' | 'grid' | 'network';
  isLoading: boolean;
  conflicts: HierarchyConflict[];
  className?: string;
}

interface FilterPanelProps {
  filters: HierarchyFilters;
  onFiltersChange: (filters: HierarchyFilters) => void;
  nodeCount: number;
  conflictCount: number;
}

interface BulkOperationsPanelProps {
  selectedNodes: string[];
  onBulkOperation: (operation: BulkOperation) => Promise<void>;
  onClearSelection: () => void;
}

interface AnalyticsPanelProps {
  nodes: HierarchyNode[];
  conflicts: HierarchyConflict[];
}

// Filter Panel Component
function FilterPanel({ filters, onFiltersChange, nodeCount, conflictCount }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<HierarchyFilters>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  const handleFilterUpdate = useCallback((updates: Partial<HierarchyFilters>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, onFiltersChange]);

  const clearAllFilters = () => {
    const emptyFilters: HierarchyFilters = {
      search: '',
      types: [],
      status: 'all',
      hasConflicts: undefined,
      tags: [],
      includeStats: true,
      includePermissions: false,
      includeConflicts: false
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              {nodeCount} nodes found {conflictCount > 0 && `• ${conflictCount} conflicts`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search nodes..."
              value={localFilters.search || ''}
              onChange={(e) => handleFilterUpdate({ search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Node Types */}
        <div className="space-y-2">
          <Label>Node Types</Label>
          <div className="flex gap-2 flex-wrap">
            {['company', 'estate', 'divisi', 'block'].map(type => (
              <Badge
                key={type}
                variant={localFilters.types?.includes(type) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const currentTypes = localFilters.types || [];
                  const newTypes = currentTypes.includes(type)
                    ? currentTypes.filter(t => t !== type)
                    : [...currentTypes, type];
                  handleFilterUpdate({ types: newTypes });
                }}
              >
                {type === 'company' && <Building className="h-3 w-3 mr-1" />}
                {type === 'estate' && <MapPin className="h-3 w-3 mr-1" />}
                {type === 'divisi' && <Grid3x3 className="h-3 w-3 mr-1" />}
                {type === 'block' && <Square className="h-3 w-3 mr-1" />}
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={localFilters.status || 'all'}
            onValueChange={(value) => handleFilterUpdate({ status: value as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filter Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Show conflicts only</Label>
            <Switch
              checked={localFilters.hasConflicts || false}
              onCheckedChange={(checked) => handleFilterUpdate({ hasConflicts: checked || undefined })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Include statistics</Label>
            <Switch
              checked={localFilters.includeStats !== false}
              onCheckedChange={(checked) => handleFilterUpdate({ includeStats: checked })}
            />
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              Advanced Filters
              <ChevronDown className={cn(
                "ml-2 h-4 w-4 transition-transform",
                showAdvanced && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Area Range */}
            <div className="space-y-2">
              <Label>Area Range (hectares)</Label>
              <div className="px-2">
                <Slider
                  value={[localFilters.areaRange?.min || 0, localFilters.areaRange?.max || 10000]}
                  onValueChange={([min, max]) => handleFilterUpdate({ 
                    areaRange: { min, max } 
                  })}
                  max={10000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{localFilters.areaRange?.min || 0}ha</span>
                  <span>{localFilters.areaRange?.max || 10000}ha</span>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                      ) : (
                        dateRange.from.toLocaleDateString()
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange({ from: range?.from, to: range?.to });
                      if (range?.from && range?.to) {
                        handleFilterUpdate({ dateRange: { from: range.from, to: range.to } });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Include Options */}
            <div className="space-y-2">
              <Label>Include Data</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Permissions</Label>
                  <Switch
                    checked={localFilters.includePermissions || false}
                    onCheckedChange={(checked) => handleFilterUpdate({ includePermissions: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Conflicts</Label>
                  <Switch
                    checked={localFilters.includeConflicts || false}
                    onCheckedChange={(checked) => handleFilterUpdate({ includeConflicts: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Max Depth */}
            <div className="space-y-2">
              <Label>Max Depth</Label>
              <Select
                value={localFilters.maxDepth?.toString() || 'unlimited'}
                onValueChange={(value) => handleFilterUpdate({ 
                  maxDepth: value === 'unlimited' ? undefined : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="1">1 Level</SelectItem>
                  <SelectItem value="2">2 Levels</SelectItem>
                  <SelectItem value="3">3 Levels</SelectItem>
                  <SelectItem value="4">4 Levels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Bulk Operations Panel
function BulkOperationsPanel({ selectedNodes, onBulkOperation, onClearSelection }: BulkOperationsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [operation, setOperation] = useState<BulkOperation['operation']>('activate');

  const handleBulkOperation = async (op: BulkOperation['operation']) => {
    if (selectedNodes.length === 0) return;

    setIsLoading(true);
    try {
      await onBulkOperation({
        operation: op,
        nodeIds: selectedNodes,
        options: {
          cascade: true,
          validateConstraints: true
        }
      });
      
      toast.success(`Bulk ${op} operation completed successfully`);
      onClearSelection();
    } catch (error) {
      toast.error(`Failed to perform bulk ${op} operation`);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedNodes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Select nodes to perform bulk operations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Bulk Operations</CardTitle>
            <CardDescription>{selectedNodes.length} nodes selected</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            onClick={() => handleBulkOperation('activate')}
            disabled={isLoading}
            className="text-green-600 border-green-600 hover:bg-green-50"
            variant="outline"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Activate
          </Button>
          
          <Button
            size="sm"
            onClick={() => handleBulkOperation('deactivate')}
            disabled={isLoading}
            className="text-orange-600 border-orange-600 hover:bg-orange-50"
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Deactivate
          </Button>
          
          <Button
            size="sm"
            onClick={() => handleBulkOperation('tag')}
            disabled={isLoading}
            variant="outline"
          >
            <Tag className="h-4 w-4 mr-2" />
            Tag
          </Button>
          
          <Button
            size="sm"
            onClick={() => handleBulkOperation('delete')}
            disabled={isLoading}
            className="text-red-600 border-red-600 hover:bg-red-50"
            variant="outline"
          >
            <X className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Bulk Move</Label>
          <div className="flex gap-2">
            <Select defaultValue="select-target">
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select target parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select-target">Select target...</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => handleBulkOperation('move')} disabled={isLoading}>
              <Zap className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Analytics Panel
function AnalyticsPanel({ nodes, conflicts }: AnalyticsPanelProps) {
  const stats = {
    totalNodes: nodes.length,
    activeNodes: nodes.filter(n => n.isActive).length,
    byType: {
      company: nodes.filter(n => n.type === 'company').length,
      estate: nodes.filter(n => n.type === 'estate').length,
      divisi: nodes.filter(n => n.type === 'divisi').length,
      block: nodes.filter(n => n.type === 'block').length,
    },
    totalArea: nodes.reduce((sum, n) => sum + (n.stats?.totalArea || 0), 0),
    averageHealth: nodes.length > 0 ? 
      nodes.reduce((sum, n) => sum + n.stats.healthScore, 0) / nodes.length : 0,
    averageUtilization: nodes.length > 0 ?
      nodes.reduce((sum, n) => sum + n.stats.utilization, 0) / nodes.length : 0,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analytics Overview</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalNodes}</div>
            <div className="text-sm text-gray-500">Total Nodes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.activeNodes}</div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
        </div>

        <Separator />

        {/* Type Distribution */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Node Distribution</Label>
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {type === 'company' && <Building className="h-4 w-4 text-purple-500" />}
                {type === 'estate' && <MapPin className="h-4 w-4 text-blue-500" />}
                {type === 'divisi' && <Grid3x3 className="h-4 w-4 text-green-500" />}
                {type === 'block' && <Square className="h-4 w-4 text-orange-500" />}
                <span className="capitalize text-sm">{type}</span>
              </div>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
        </div>

        <Separator />

        {/* Health & Performance */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Health & Performance</Label>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Health Score</span>
              <span>{stats.averageHealth.toFixed(1)}%</span>
            </div>
            <Progress value={stats.averageHealth} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Average Utilization</span>
              <span>{stats.averageUtilization.toFixed(1)}%</span>
            </div>
            <Progress value={stats.averageUtilization} className="h-2" />
          </div>
        </div>

        <Separator />

        {/* Conflicts */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Conflicts</Label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Active Conflicts</span>
            </div>
            <Badge variant={conflicts.length > 0 ? "destructive" : "secondary"}>
              {conflicts.length}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Control Panel Component
export function HierarchyControlPanel({
  nodes,
  selectedNodes,
  onFiltersChange,
  onViewModeChange,
  onNodeSelect,
  onBulkOperation,
  onExport,
  onImport,
  onRefresh,
  currentFilters,
  viewMode,
  isLoading,
  conflicts,
  className
}: HierarchyControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'filters' | 'bulk' | 'analytics'>('filters');
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleExportClick = (format: 'csv' | 'xlsx' | 'json' | 'pdf') => {
    onExport(format);
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
  };

  const handleFileImport = (files: FileList | null) => {
    if (files && files[0]) {
      onImport(files[0]);
      setShowImportDialog(false);
      toast.success('Importing hierarchy data...');
    }
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {/* Header Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Hierarchy Controls</h2>
                <Badge variant="secondary">
                  {nodes.length} nodes
                </Badge>
                {conflicts.length > 0 && (
                  <Badge variant="destructive">
                    {conflicts.length} conflicts
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                      <RefreshCw className={cn(
                        "h-4 w-4",
                        isLoading && "animate-spin"
                      )} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh data</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExportClick('csv')}>
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportClick('xlsx')}>
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportClick('json')}>
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportClick('pdf')}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Hierarchy Data</DialogTitle>
                      <DialogDescription>
                        Upload a CSV, Excel, or JSON file to import hierarchy data.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Label htmlFor="file">File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".csv,.xlsx,.xls,.json"
                        onChange={(e) => handleFileImport(e.target.files)}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">View Mode:</Label>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['tree', 'grid', 'network'].map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={viewMode === mode ? "default" : "ghost"}
                    onClick={() => onViewModeChange(mode as any)}
                    className="capitalize"
                  >
                    {mode === 'tree' && <Layers className="h-4 w-4 mr-1" />}
                    {mode === 'grid' && <Grid3x3 className="h-4 w-4 mr-1" />}
                    {mode === 'network' && <Network className="h-4 w-4 mr-1" />}
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Control Panels */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filters">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <Zap className="h-4 w-4 mr-2" />
              Bulk Ops
              {selectedNodes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedNodes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="mt-4">
            <FilterPanel
              filters={currentFilters}
              onFiltersChange={onFiltersChange}
              nodeCount={nodes.length}
              conflictCount={conflicts.length}
            />
          </TabsContent>

          <TabsContent value="bulk" className="mt-4">
            <BulkOperationsPanel
              selectedNodes={selectedNodes}
              onBulkOperation={onBulkOperation}
              onClearSelection={() => onNodeSelect([])}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <AnalyticsPanel
              nodes={nodes}
              conflicts={conflicts}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}