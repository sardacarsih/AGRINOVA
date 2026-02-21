'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Badge as BadgeIcon,
  Crown,
  Award,
  User as UserIcon,
  Phone,
  Mail,
  Eye,
  MessageCircle,
  Filter,
  Search,
  Download
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/types/auth';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';
import { cn } from '@/lib/utils';

interface HierarchicalOrgChartProps {
  className?: string;
  companyId?: string;
  showContactInfo?: boolean;
  interactive?: boolean;
  expandedByDefault?: boolean;
}

interface OrgNode {
  user: User;
  directReports: OrgNode[];
  level: number;
  isExpanded: boolean;
}

interface OrgChartFilters {
  search: string;
  role: string;
  company: string;
  showInactive: boolean;
}

export function HierarchicalOrgChart({ 
  className, 
  companyId,
  showContactInfo = false,
  interactive = true,
  expandedByDefault = true
}: HierarchicalOrgChartProps) {
  const [orgData, setOrgData] = React.useState<OrgNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [filters, setFilters] = React.useState<OrgChartFilters>({
    search: '',
    role: 'all',
    company: companyId || 'all',
    showInactive: false
  });

  React.useEffect(() => {
    loadOrgData();
  }, [companyId, filters.showInactive]);

  const loadOrgData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const users = await mockCompanyDataService.getUsers();
      const filteredUsers = users.filter(user => {
        if (companyId && user.companyId !== companyId) return false;
        if (!filters.showInactive && user.status !== 'active') return false;
        return true;
      });

      // Build hierarchical structure
      const orgStructure = buildOrgHierarchy(filteredUsers, expandedByDefault);
      setOrgData(orgStructure);
    } catch (err) {
      console.error('Failed to load org data:', err);
      setError('Failed to load organizational data');
    } finally {
      setLoading(false);
    }
  };

  const buildOrgHierarchy = (users: User[], defaultExpanded: boolean): OrgNode[] => {
    const areaManagers = users.filter(u => u.role === 'AREA_MANAGER');
    const managers = users.filter(u => u.role === 'MANAGER');

    // Create area manager nodes with their direct reports
    const areaManagerNodes: OrgNode[] = areaManagers.map(areaManager => ({
      user: areaManager,
      directReports: managers
        .filter(manager => manager.reportingToAreaManagerId === areaManager.id)
        .map(manager => ({
          user: manager,
          directReports: [],
          level: 1,
          isExpanded: defaultExpanded
        })),
      level: 0,
      isExpanded: defaultExpanded
    }));

    // Add orphaned managers (those without area manager assignments)
    const orphanedManagers = managers.filter(m => !m.reportingToAreaManagerId);
    if (orphanedManagers.length > 0) {
      const orphanedNode: OrgNode = {
        user: {
          id: 'unassigned',
          name: 'Unassigned Managers',
          role: 'MANAGER' as const,
          email: 'unassigned@agrinova.com',
          permissions: [],
          createdAt: new Date(),
          status: 'active' as const,
          company: 'Various Companies'
        },
        directReports: orphanedManagers.map(manager => ({
          user: manager,
          directReports: [],
          level: 1,
          isExpanded: defaultExpanded
        })),
        level: 0,
        isExpanded: defaultExpanded
      };
      areaManagerNodes.push(orphanedNode);
    }

    return areaManagerNodes;
  };

  const applyFilters = (nodes: OrgNode[]): OrgNode[] => {
    if (!filters.search && filters.role === 'all') return nodes;

    return nodes.map(node => {
      const matchesSearch = filters.search === '' || 
        node.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        node.user.employeeId?.toLowerCase().includes(filters.search.toLowerCase()) ||
        node.user.email.toLowerCase().includes(filters.search.toLowerCase());

      const matchesRole = filters.role === 'all' || node.user.role === filters.role;

      let filteredReports = node.directReports;
      if (filters.search || filters.role !== 'all') {
        filteredReports = node.directReports.filter(report => {
          const reportMatchesSearch = filters.search === '' || 
            report.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            report.user.employeeId?.toLowerCase().includes(filters.search.toLowerCase()) ||
            report.user.email.toLowerCase().includes(filters.search.toLowerCase());

          const reportMatchesRole = filters.role === 'all' || report.user.role === filters.role;

          return reportMatchesSearch && reportMatchesRole;
        });
      }

      return {
        ...node,
        directReports: filteredReports,
        isExpanded: filteredReports.length > 0 ? node.isExpanded : false
      };
    }).filter(node => {
      // Show node if it matches or has matching reports
      const nodeMatches = (filters.search === '' || 
        node.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        node.user.employeeId?.toLowerCase().includes(filters.search.toLowerCase()) ||
        node.user.email.toLowerCase().includes(filters.search.toLowerCase())) &&
        (filters.role === 'all' || node.user.role === filters.role);
      
      const hasMatchingReports = node.directReports.length > 0;
      return nodeMatches || hasMatchingReports;
    });
  };

  const toggleExpansion = (nodeId: string) => {
    if (!interactive) return;
    
    setOrgData(prevData => 
      prevData.map(node => 
        node.user.id === nodeId 
          ? { ...node, isExpanded: !node.isExpanded }
          : node
      )
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'area_manager':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'manager':
        return <Award className="h-4 w-4 text-blue-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'area_manager':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleTitle = (role: string) => {
    switch (role) {
      case 'area_manager':
        return 'Area Manager';
      case 'manager':
        return 'Manager';
      default:
        return role;
    }
  };

  const filteredOrgData = applyFilters(orgData);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            Organizational Chart
          </CardTitle>
          <CardDescription>Hierarchical structure showing reporting relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-500" />
            Organizational Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadOrgData} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Organizational Chart
              <Badge variant="secondary" className="ml-2">
                {filteredOrgData.reduce((acc, node) => acc + 1 + node.directReports.length, 0)} people
              </Badge>
            </CardTitle>
            <CardDescription>Hierarchical structure showing Manager-Area Manager reporting relationships</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, employee ID, or email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="max-w-sm"
            />
          </div>
          <Select 
            value={filters.role} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="area-manager">Area Manager</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredOrgData.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No organizational data found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters or check if users have been assigned properly</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrgData.map((areaManagerNode, index) => (
              <motion.div
                key={areaManagerNode.user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Area Manager Node */}
                <div 
                  className={cn(
                    "p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200",
                    interactive && "cursor-pointer hover:from-yellow-100 hover:to-yellow-200",
                    areaManagerNode.user.id === 'unassigned' && "from-gray-50 to-gray-100 border-gray-200"
                  )}
                  onClick={() => toggleExpansion(areaManagerNode.user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {interactive && areaManagerNode.directReports.length > 0 && (
                          <Button variant="ghost" size="sm" className="p-1">
                            {areaManagerNode.isExpanded ? 
                              <ChevronDown className="h-4 w-4" /> : 
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                        )}
                        <Avatar className="h-12 w-12 border-2 border-yellow-300">
                          <AvatarFallback className={cn(
                            "font-bold text-sm",
                            areaManagerNode.user.id === 'unassigned' 
                              ? "bg-gray-300 text-gray-700" 
                              : "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white"
                          )}>
                            {areaManagerNode.user.id === 'unassigned' 
                              ? '?' 
                              : areaManagerNode.user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'AM'
                            }
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg flex items-center space-x-2">
                          <span>{areaManagerNode.user.name}</span>
                          {getRoleIcon(areaManagerNode.user.role)}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge className={getRoleColor(areaManagerNode.user.role)}>
                            {getRoleTitle(areaManagerNode.user.role)}
                          </Badge>
                          {areaManagerNode.user.employeeId && (
                            <div className="flex items-center space-x-1">
                              <BadgeIcon className="h-3 w-3 text-gray-500" />
                              <span className="text-sm text-gray-600">{areaManagerNode.user.employeeId}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3 text-gray-500" />
                            <span className="text-sm text-gray-600">{areaManagerNode.user.company}</span>
                          </div>
                        </div>
                        {areaManagerNode.user.assignedCompanyNames && (
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-500">Companies:</span>
                            {areaManagerNode.user.assignedCompanyNames.map((company, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {company}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Direct Reports</p>
                        <p className="font-bold text-lg text-gray-900">{areaManagerNode.directReports.length}</p>
                      </div>
                      {showContactInfo && areaManagerNode.user.id !== 'unassigned' && (
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-xs">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs">
                            <Eye className="h-4 w-4 mr-1" />
                            Profile
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Reports */}
                {areaManagerNode.isExpanded && areaManagerNode.directReports.length > 0 && (
                  <div className="bg-white">
                    {areaManagerNode.directReports.map((managerNode, managerIndex) => (
                      <motion.div
                        key={managerNode.user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: managerIndex * 0.1 }}
                        className="p-4 border-b border-gray-100 last:border-b-0 ml-8 relative"
                      >
                        {/* Connection Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300"></div>
                        <div className="absolute left-0 top-6 w-4 h-px bg-gray-300"></div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10 border-2 border-blue-200">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm">
                                {managerNode.user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'M'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                                <span>{managerNode.user.name}</span>
                                {getRoleIcon(managerNode.user.role)}
                              </h4>
                              <div className="flex items-center space-x-4 mt-1">
                                <Badge className={getRoleColor(managerNode.user.role)}>
                                  {getRoleTitle(managerNode.user.role)}
                                </Badge>
                                {managerNode.user.employeeId && (
                                  <div className="flex items-center space-x-1">
                                    <BadgeIcon className="h-3 w-3 text-gray-500" />
                                    <span className="text-sm text-gray-600">{managerNode.user.employeeId}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <Building2 className="h-3 w-3 text-gray-500" />
                                  <span className="text-sm text-gray-600">{managerNode.user.company}</span>
                                </div>
                              </div>
                              {managerNode.user.assignedEstateNames && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className="text-xs text-gray-500">Estates:</span>
                                  {managerNode.user.assignedEstateNames.slice(0, 3).map((estate, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {estate}
                                    </Badge>
                                  ))}
                                  {managerNode.user.assignedEstateNames.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{managerNode.user.assignedEstateNames.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {showContactInfo && (
                            <div className="flex items-center space-x-2">
                              {managerNode.user.phoneNumber && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3 text-gray-500" />
                                  <span className="text-xs text-gray-600">{managerNode.user.phoneNumber}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3 text-gray-500" />
                                <span className="text-xs text-gray-600">{managerNode.user.email}</span>
                              </div>
                              <Button variant="ghost" size="sm" className="text-xs">
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Contact
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}