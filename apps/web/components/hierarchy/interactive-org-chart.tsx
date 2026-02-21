'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  rectIntersection
} from '@dnd-kit/core';
import {
  restrictToWindowEdges,
  restrictToParentElement
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import {
  Building,
  MapPin,
  Grid3x3,
  Square,
  Users,
  TrendingUp,
  TrendingDown,
  CircleAlert,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Move,
  Info,
  BarChart3,
  Activity,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  Target,
  Globe,
  Layers
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

import { HierarchyNode, HierarchyAPI } from '@/lib/api/hierarchy-api';
import { cn } from '@/lib/utils';

interface InteractiveOrgChartProps {
  nodes: HierarchyNode[];
  onNodeMove?: (nodeId: string, newParentId: string | null, position?: number) => Promise<void>;
  onNodeEdit?: (node: HierarchyNode) => void;
  onNodeDelete?: (node: HierarchyNode) => void;
  onNodeCreate?: (parentNode: HierarchyNode, type: string) => void;
  onNodeView?: (node: HierarchyNode) => void;
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
  viewMode?: 'tree' | 'grid' | 'network';
  showStats?: boolean;
  showConflicts?: boolean;
  enableDragDrop?: boolean;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
}

interface DraggableNodeProps {
  node: HierarchyNode;
  level: number;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  onEdit: (node: HierarchyNode) => void;
  onDelete: (node: HierarchyNode) => void;
  onView: (node: HierarchyNode) => void;
  onCreateChild: (parent: HierarchyNode, type: string) => void;
  showStats: boolean;
  showConflicts: boolean;
  readOnly: boolean;
  compact: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (nodeId: string) => void;
}

interface DroppableZoneProps {
  nodeId: string;
  accepts: string[];
  children: React.ReactNode;
  disabled?: boolean;
}

// Draggable Node Component
function DraggableNode({
  node,
  level,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onView,
  onCreateChild,
  showStats,
  showConflicts,
  readOnly,
  compact,
  isExpanded = true,
  onToggleExpand
}: DraggableNodeProps) {
  const dragControls = useDragControls();
  const [isDragPreview, setIsDragPreview] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.id,
    data: {
      type: 'hierarchy-node',
      node,
      level
    },
    disabled: readOnly || !node.permissions.canMove
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company': return Building;
      case 'estate': return MapPin;
      case 'divisi': return Grid3x3;
      case 'block': return Square;
      default: return Square;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'from-purple-500 to-purple-600';
      case 'estate': return 'from-blue-500 to-blue-600';
      case 'divisi': return 'from-green-500 to-green-600';
      case 'block': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getHealthIndicator = (healthScore: number) => {
    if (healthScore >= 90) return { color: 'text-green-500', icon: CheckCircle };
    if (healthScore >= 70) return { color: 'text-yellow-500', icon: AlertTriangle };
    return { color: 'text-red-500', icon: CircleAlert };
  };

  const Icon = getTypeIcon(node.type);
  const healthIndicator = getHealthIndicator(node.stats.healthScore);
  const HealthIcon = healthIndicator.icon;
  const hasChildren = node.children && node.children.length > 0;
  const hasConflicts = showConflicts && node.conflicts.length > 0;

  return (
    <TooltipProvider>
      <ContextMenu>
        <ContextMenuTrigger>
          <motion.div
            ref={setDragRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
              'group relative cursor-pointer select-none',
              isDragging && 'opacity-50',
              isSelected && 'ring-2 ring-blue-500'
            )}
            onClick={() => onSelect(node.id)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card 
              className={cn(
                'relative border-2 transition-all duration-200',
                compact ? 'p-2' : 'p-3',
                isSelected && 'border-blue-500 shadow-lg',
                isDragging && 'shadow-2xl rotate-3',
                !node.isActive && 'opacity-60',
                hasConflicts && 'border-red-300',
                'hover:shadow-md'
              )}
              style={{
                marginLeft: level * (compact ? 20 : 32),
                minWidth: compact ? '200px' : '280px'
              }}
            >
              {/* Background gradient based on type */}
              <div className={cn(
                'absolute inset-0 rounded-lg opacity-10 bg-gradient-to-br',
                getTypeColor(node.type)
              )} />

              {/* Drag handle */}
              {!readOnly && node.permissions.canMove && (
                <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-2 h-6 bg-gray-300 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center">
                    <Move className="w-3 h-3 text-gray-600" />
                  </div>
                </div>
              )}

              {/* Conflicts indicator */}
              {hasConflicts && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}

              <CardHeader className={cn('pb-2', compact && 'pb-1')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Expand/Collapse for parent nodes */}
                    {hasChildren && onToggleExpand && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleExpand(node.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? 
                          <ChevronDown className="w-3 h-3" /> : 
                          <ChevronRight className="w-3 h-3" />
                        }
                      </button>
                    )}

                    {/* Node type icon */}
                    <div className={cn(
                      'p-2 rounded-lg bg-gradient-to-br shadow-sm',
                      getTypeColor(node.type)
                    )}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        'font-semibold text-gray-900 truncate',
                        compact ? 'text-sm' : 'text-base'
                      )}>
                        {node.name}
                      </h3>
                      <p className={cn(
                        'text-gray-500 truncate',
                        compact ? 'text-xs' : 'text-sm'
                      )}>
                        {node.code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Health indicator */}
                    <Tooltip>
                      <TooltipTrigger>
                        <HealthIcon className={cn('w-4 h-4', healthIndicator.color)} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Health Score: {node.stats.healthScore}%</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Status badge */}
                    <Badge 
                      variant={node.isActive ? "default" : "secondary"}
                      className={compact ? 'text-xs px-1' : ''}
                    >
                      {node.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                {/* Stats section */}
                {showStats && !compact && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="text-xs">
                      <div className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">Area: {node.stats.totalArea.toLocaleString()}ha</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">Users: {node.stats.userCount}</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">Util: {node.stats.utilization}%</span>
                      </div>
                      <Progress value={node.stats.utilization} className="h-1 mt-1" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">Prod: {node.stats.productivity}%</span>
                      </div>
                      <Progress value={node.stats.productivity} className="h-1 mt-1" />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!readOnly && (
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {node.permissions.canCreateChildren && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Plus className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {node.permissions.constraints.allowedChildTypes.map(type => (
                            <DropdownMenuItem
                              key={type}
                              onClick={() => onCreateChild(node, type)}
                            >
                              Add {type}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => onView(node)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    
                    {node.permissions.canEdit && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2"
                        onClick={() => onEdit(node)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                    
                    {node.permissions.canDelete && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-red-600 hover:text-red-700"
                        onClick={() => onDelete(node)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>

              {/* Detailed tooltip */}
              {showTooltip && (
                <div className="absolute z-50 p-3 bg-white border rounded-lg shadow-lg -top-2 left-full ml-2 w-64">
                  <div className="text-sm space-y-2">
                    <div className="font-semibold">{node.name}</div>
                    <div className="text-gray-600">{node.description}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Level: {node.level}</div>
                      <div>Position: {node.position}</div>
                      <div>Children: {node.stats.childCount}</div>
                      <div>Health: {node.stats.healthScore}%</div>
                    </div>
                    <div className="flex gap-1">
                      {node.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={() => onView(node)}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </ContextMenuItem>
          {node.permissions.canEdit && (
            <ContextMenuItem onClick={() => onEdit(node)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Node
            </ContextMenuItem>
          )}
          {node.permissions.canCreateChildren && (
            <>
              <ContextMenuSeparator />
              {node.permissions.constraints.allowedChildTypes.map(type => (
                <ContextMenuItem
                  key={type}
                  onClick={() => onCreateChild(node, type)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {type}
                </ContextMenuItem>
              ))}
            </>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem>
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </ContextMenuItem>
          {node.permissions.canDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={() => onDelete(node)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Node
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </TooltipProvider>
  );
}

// Droppable Zone Component
function DroppableZone({ nodeId, accepts, children, disabled }: DroppableZoneProps) {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: `droppable-${nodeId}`,
    data: {
      type: 'hierarchy-dropzone',
      accepts,
      nodeId
    },
    disabled
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-all duration-200',
        isOver && 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-2'
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Drop here to move
          </div>
        </div>
      )}
    </div>
  );
}

// Main Interactive Org Chart Component
export function InteractiveOrgChart({
  nodes,
  onNodeMove,
  onNodeEdit,
  onNodeDelete,
  onNodeCreate,
  onNodeView,
  selectedNodeId,
  onNodeSelect,
  viewMode = 'tree',
  showStats = true,
  showConflicts = true,
  enableDragDrop = true,
  readOnly = false,
  compact = false,
  className
}: InteractiveOrgChartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<HierarchyNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [validDropTargets, setValidDropTargets] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const nodeData = active.data.current?.node as HierarchyNode;
    
    setActiveId(active.id as string);
    setDraggedNode(nodeData);

    // Calculate valid drop targets
    const validTargets = new Set<string>();
    nodes.forEach(node => {
      // A node can be dropped into another if:
      // 1. It's not the same node
      // 2. It's not a descendant of the dragged node
      // 3. The target allows this type of child
      if (
        node.id !== nodeData.id && 
        !isDescendant(nodeData, node.id) &&
        node.permissions.canCreateChildren &&
        node.permissions.constraints.allowedChildTypes.includes(nodeData.type)
      ) {
        validTargets.add(node.id);
      }
    });
    setValidDropTargets(validTargets);
  }, [nodes]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedNode(null);
    setValidDropTargets(new Set());

    if (over && active.id !== over.id) {
      const draggedNodeId = active.id as string;
      const targetNodeId = over.id.toString().replace('droppable-', '');
      
      if (onNodeMove && validDropTargets.has(targetNodeId)) {
        try {
          await onNodeMove(draggedNodeId, targetNodeId);
          toast.success('Node moved successfully');
        } catch (error) {
          toast.error('Failed to move node');
        }
      }
    }
  }, [onNodeMove, validDropTargets]);

  const isDescendant = (parent: HierarchyNode, nodeId: string): boolean => {
    if (!parent.children) return false;
    
    for (const child of parent.children) {
      if (child.id === nodeId || isDescendant(child, nodeId)) {
        return true;
      }
    }
    return false;
  };

  const handleNodeSelect = useCallback((nodeId: string) => {
    onNodeSelect?.(nodeId);
  }, [onNodeSelect]);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const renderNode = useCallback((node: HierarchyNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    
    return (
      <div key={node.id} className="space-y-2">
        <DroppableZone
          nodeId={node.id}
          accepts={['hierarchy-node']}
          disabled={readOnly || !validDropTargets.has(node.id)}
        >
          <DraggableNode
            node={node}
            level={level}
            isSelected={selectedNodeId === node.id}
            onSelect={handleNodeSelect}
            onEdit={onNodeEdit!}
            onDelete={onNodeDelete!}
            onView={onNodeView!}
            onCreateChild={onNodeCreate!}
            showStats={showStats}
            showConflicts={showConflicts}
            readOnly={readOnly}
            compact={compact}
            isExpanded={isExpanded}
            onToggleExpand={handleToggleExpand}
          />
        </DroppableZone>
        
        {/* Render children */}
        <AnimatePresence>
          {isExpanded && node.children && node.children.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {node.children.map(child => renderNode(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }, [
    selectedNodeId,
    expandedNodes,
    validDropTargets,
    readOnly,
    showStats,
    showConflicts,
    compact,
    handleNodeSelect,
    handleToggleExpand,
    onNodeEdit,
    onNodeDelete,
    onNodeView,
    onNodeCreate
  ]);

  // Initialize expanded state for top level nodes
  useEffect(() => {
    const topLevelNodes = nodes.filter(node => node.level === 0);
    setExpandedNodes(new Set(topLevelNodes.map(node => node.id)));
  }, [nodes]);

  if (!enableDragDrop) {
    // Render without drag-and-drop
    return (
      <div className={cn('space-y-4', className)}>
        {nodes.filter(node => node.level === 0).map(node => renderNode(node))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className={cn('space-y-4', className)}>
        {nodes.filter(node => node.level === 0).map(node => renderNode(node))}
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && draggedNode ? (
          <div className="rotate-3 scale-105 opacity-90">
            <Card className="p-3 shadow-2xl border-2 border-blue-500 bg-white">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'p-2 rounded-lg bg-gradient-to-br',
                  draggedNode.type === 'company' ? 'from-purple-500 to-purple-600' :
                  draggedNode.type === 'estate' ? 'from-blue-500 to-blue-600' :
                  draggedNode.type === 'divisi' ? 'from-green-500 to-green-600' :
                  'from-orange-500 to-orange-600'
                )}>
                  {React.createElement(
                    draggedNode.type === 'company' ? Building :
                    draggedNode.type === 'estate' ? MapPin :
                    draggedNode.type === 'divisi' ? Grid3x3 :
                    Square,
                    { className: "w-4 h-4 text-white" }
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{draggedNode.name}</h3>
                  <p className="text-sm text-gray-500">{draggedNode.code}</p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}