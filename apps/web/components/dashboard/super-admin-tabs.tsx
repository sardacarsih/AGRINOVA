'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Building, 
  GitBranch, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// Import our new components
import { SuperAdminStatistics, SystemStatistics } from './super-admin-statistics';
import { GlobalSearch, SearchResult } from './global-search';
import { OrganizationalHierarchy } from './organizational-hierarchy';
import { SystemHealthMonitor, SystemHealthData } from './system-health-monitor';
import { MultiAssignmentAnalytics, MultiAssignmentData } from './multi-assignment-analytics';

// Import types and mock data
import { User, Company, Estate, Divisi, Block } from '@/types/auth';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';

interface SuperAdminTabsProps {
  initialTab?: string;
  className?: string;
}

export function SuperAdminTabs({ initialTab = 'overview', className = '' }: SuperAdminTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [divisions, setDivisions] = useState<Divisi[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Statistics and system data
  const [systemStats, setSystemStats] = useState<SystemStatistics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [multiAssignmentData, setMultiAssignmentData] = useState<MultiAssignmentData | null>(null);
  
  // Tab notification counts
  const [notifications, setNotifications] = useState({
    users: 0,
    companies: 0,
    hierarchy: 0,
    system: 0
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load basic data
      const [companiesData, usersData] = await Promise.all([
        mockCompanyDataService.getCompanies(),
        mockCompanyDataService.getUsers()
      ]);
      
      setCompanies(companiesData);
      setUsers(usersData);
      
      // Mock additional data - in real app these would be API calls
      const mockEstates: Estate[] = [
        {
          id: 'estate_1',
          companyId: 'agrinova_1',
          code: 'SJ001',
          name: 'Estate Sawit Jaya',
          location: 'Riau, Indonesia',
          area: 5000,
          isActive: true,
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-05'),
        }
      ];
      
      const mockDivisions: Divisi[] = [
        {
          id: 'divisi_1',
          estateId: 'estate_1',
          code: 'DIV-A',
          name: 'Divisi A',
          area: 2000,
          isActive: true,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        }
      ];
      
      const mockBlocks: Block[] = [
        {
          id: 'block_1',
          divisiId: 'divisi_1',
          code: 'A001',
          name: 'Blok A001',
          area: 50,
          plantingYear: 2015,
          palmCount: 450,
          varietyType: 'Tenera',
          isActive: true,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        }
      ];
      
      setEstates(mockEstates);
      setDivisions(mockDivisions);
      setBlocks(mockBlocks);
      
      // Generate system statistics
      const stats: SystemStatistics = {
        totalCompanies: companiesData.length,
        activeCompanies: companiesData.filter(c => c.isActive).length,
        totalEstates: mockEstates.length,
        totalDivisions: mockDivisions.length,
        totalBlocks: mockBlocks.length,
        totalUsers: usersData.length,
        activeUsers: usersData.filter(u => u.status === 'active').length,
        inactiveUsers: usersData.filter(u => u.status === 'inactive').length,
        suspendedUsers: usersData.filter(u => u.status === 'suspended').length,
        superAdmins: usersData.filter(u => u.role === 'SUPER_ADMIN').length,
        companyAdmins: usersData.filter(u => u.role === 'COMPANY_ADMIN').length,
        areaManagers: usersData.filter(u => u.role === 'AREA_MANAGER').length,
        managers: usersData.filter(u => u.role === 'MANAGER').length,
        asistens: usersData.filter(u => u.role === 'ASISTEN').length,
        mandors: usersData.filter(u => u.role === 'MANDOR').length,
        satpams: usersData.filter(u => u.role === 'SATPAM').length,
        multiCompanyAreaManagers: usersData.filter(u => 
          u.role === 'AREA_MANAGER' && u.assignedCompanies && u.assignedCompanies.length > 1
        ).length,
        multiEstateManagers: usersData.filter(u => 
          u.role === 'MANAGER' && u.assignedEstates && u.assignedEstates.length > 1
        ).length,
        multiDivisionAsistens: usersData.filter(u => 
          u.role === 'ASISTEN' && u.assignedDivisions && u.assignedDivisions.length > 1
        ).length,
        orphanedUsers: usersData.filter(u => 
          !u.company && !u.assignedCompanies?.length
        ).length,
        systemHealth: 'healthy',
        systemUptime: '99.97%',
        databaseStatus: 'connected',
        redisStatus: 'connected',
        wsConnectionStatus: 'connected',
        totalAPIRequests: 145720,
        avgResponseTime: 245,
        errorRate: 0.12,
        dailyActiveUsers: Math.floor(usersData.length * 0.85),
        weeklyActiveUsers: Math.floor(usersData.length * 0.95),
        monthlyActiveUsers: usersData.length,
        pendingApprovals: 12,
        gateChecksToday: 48,
        harvestRecordsToday: 156,
        trends: {
          users: 3.2,
          companies: 1.1,
          activities: 12.5,
          performance: -2.1
        },
        lastUpdated: new Date()
      };
      setSystemStats(stats);
      
      // Generate system health data
      const healthData: SystemHealthData = {
        overall: {
          status: 'healthy',
          uptime: '15d 8h 42m',
          lastChecked: new Date(),
          version: '2.1.4'
        },
        database: {
          status: 'connected',
          connectionPool: { active: 12, idle: 8, max: 50 },
          queryMetrics: { avgResponseTime: 85, slowQueries: 2, errorRate: 0.05 },
          storage: { used: 2.1e9, total: 10e9, growth: 2.3 }
        },
        redis: {
          status: 'connected',
          memory: { used: 125e6, peak: 180e6, fragmentation: 1.2 },
          operations: { opsPerSecond: 1250, hitRate: 94.5, keyspace: 45678 }
        },
        webSocket: {
          status: 'connected',
          connections: { active: 234, peak: 312, rejected: 3 },
          messages: { sent: 15234, received: 14987, failed: 12 }
        },
        api: {
          status: 'healthy',
          performance: { avgResponseTime: 245, requestsPerMinute: 1850, errorRate: 0.12 },
          endpoints: { healthy: 42, degraded: 2, down: 0 }
        },
        system: {
          cpu: { usage: 34.5, cores: 8, load: [1.2, 1.5, 1.8] },
          memory: { used: 6.2e9, total: 16e9, cached: 2.1e9 },
          disk: { used: 450e9, total: 1e12, iops: 1250 },
          network: { inbound: 12.5e6, outbound: 8.7e6, connections: 234 }
        },
        security: {
          failedLogins: 8,
          suspiciousActivity: 2,
          blockedIPs: 15,
          lastSecurityScan: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        monitoring: {
          alerts: { critical: 0, warning: 3, info: 12 },
          notifications: { sent: 145, failed: 2, pending: 1 }
        }
      };
      setSystemHealth(healthData);
      
      // Generate multi-assignment analytics
      const multiData: MultiAssignmentData = {
        summary: {
          totalMultiAssignedUsers: usersData.filter(u => 
            (u.assignedCompanies && u.assignedCompanies.length > 1) ||
            (u.assignedEstates && u.assignedEstates.length > 1) ||
            (u.assignedDivisions && u.assignedDivisions.length > 1)
          ).length,
          multiCompanyAreaManagers: usersData.filter(u => 
            u.role === 'AREA_MANAGER' && u.assignedCompanies && u.assignedCompanies.length > 1
          ).length,
          multiEstateManagers: usersData.filter(u => 
            u.role === 'MANAGER' && u.assignedEstates && u.assignedEstates.length > 1
          ).length,
          multiDivisionAsistens: usersData.filter(u => 
            u.role === 'ASISTEN' && u.assignedDivisions && u.assignedDivisions.length > 1
          ).length,
          orphanedUsers: 3,
          efficiencyScore: 87.2,
          coverageScore: 92.8
        },
        trends: {
          multiAssignments: { current: 15, previous: 12, change: 25.0 },
          efficiency: { current: 87.2, previous: 84.1, change: 3.7 },
          coverage: { current: 92.8, previous: 91.2, change: 1.8 }
        },
        roleBreakdown: [
          {
            role: 'AREA_MANAGER',
            total: usersData.filter(u => u.role === 'AREA_MANAGER').length,
            multiAssigned: 2,
            averageAssignments: 2.1,
            maxAssignments: 3,
            efficiency: 92
          },
          {
            role: 'MANAGER',
            total: usersData.filter(u => u.role === 'MANAGER').length,
            multiAssigned: 1,
            averageAssignments: 1.8,
            maxAssignments: 2,
            efficiency: 85
          }
        ],
        companyAnalysis: companiesData.map(company => ({
          companyId: company.id,
          companyName: company.name,
          areaManagersAssigned: 1,
          managersAssigned: 2,
          assistensAssigned: 3,
          totalUsers: usersData.filter(u => u.companyId === company.id).length,
          multiAssignmentRatio: 0.25,
          coverage: 0.92
        })),
        assignmentMatrix: usersData
          .filter(u => ['AREA_MANAGER', 'MANAGER', 'ASISTEN'].includes(u.role))
          .map(user => ({
            userId: user.id,
            userName: user.name,
            role: user.role,
            assignments: [
              ...(user.assignedCompanies?.map(id => ({ type: 'company' as const, id, name: companies.find(c => c.id === id)?.name || id })) || []),
              ...(user.assignedEstates?.map(id => ({ type: 'estate' as const, id, name: `Estate ${id}` })) || []),
              ...(user.assignedDivisions?.map(id => ({ type: 'division' as const, id, name: `Division ${id}` })) || [])
            ],
            workload: Math.floor(Math.random() * 40) + 50,
            performance: Math.floor(Math.random() * 30) + 70,
            recommendations: [
              'Consider redistributing some assignments',
              'Schedule workload review meeting'
            ]
          })),
        hotspots: [
          {
            type: 'overloaded',
            severity: 'high',
            title: 'High Workload Alert',
            description: 'Some users are handling excessive assignments',
            affectedUsers: 3,
            recommendations: ['Redistribute assignments', 'Add more personnel']
          },
          {
            type: 'underutilized',
            severity: 'medium',
            title: 'Capacity Available',
            description: 'Some users have spare capacity for additional assignments',
            affectedUsers: 2,
            recommendations: ['Increase assignments', 'Cross-train for flexibility']
          }
        ]
      };
      setMultiAssignmentData(multiData);
      
      // Calculate notifications
      const pendingApprovals = 12;
      const criticalAlerts = healthData.monitoring.alerts.critical + healthData.monitoring.alerts.warning;
      const orphanedUsers = stats.orphanedUsers;
      const systemIssues = healthData.overall.status !== 'healthy' ? 1 : 0;
      
      setNotifications({
        users: orphanedUsers + pendingApprovals,
        companies: 0,
        hierarchy: orphanedUsers,
        system: criticalAlerts + systemIssues
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSearchResults = (results: SearchResult[]) => {
    // Handle global search results
    console.log('Search results:', results);
  };

  const handleEntitySelect = (result: SearchResult) => {
    // Navigate to entity or show details
    console.log('Entity selected:', result);
  };

  const handleUserSelect = (user: User) => {
    // Navigate to user details or show user modal
    console.log('User selected:', user);
  };

  const handleOptimizeAssignments = () => {
    // Trigger assignment optimization
    console.log('Optimizing assignments...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Global Search */}
      <div className="max-w-2xl">
        <GlobalSearch
          onSearchResults={handleSearchResults}
          onEntitySelect={handleEntitySelect}
          placeholder="Search across all companies, users, estates, divisions..."
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
            {notifications.users > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {notifications.users}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="companies" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Companies</span>
            {notifications.companies > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {notifications.companies}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="hierarchy" className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4" />
            <span>Hierarchy</span>
            {notifications.hierarchy > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {notifications.hierarchy}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>System</span>
            {notifications.system > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                {notifications.system}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {systemStats && (
              <SuperAdminStatistics
                data={systemStats}
                loading={refreshing}
                onRefresh={handleRefresh}
              />
            )}
          </motion.div>

          {multiAssignmentData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <MultiAssignmentAnalytics
                data={multiAssignmentData}
                users={users}
                onUserSelect={handleUserSelect}
                onOptimizationRequest={handleOptimizeAssignments}
              />
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* This would integrate the existing users page */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">User Management</h3>
                  <p className="text-gray-600 mb-4">
                    The comprehensive user management interface will be integrated here.
                  </p>
                  <p className="text-sm text-blue-600">
                    Navigate to /dashboard/super-admin/users for the full interface
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Company Management</h3>
                  <p className="text-gray-600 mb-4">
                    Company management interface with estate, division, and block hierarchy.
                  </p>
                  <p className="text-sm text-blue-600">
                    Navigate to /dashboard/super-admin/companies for the full interface
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <OrganizationalHierarchy
              companies={companies}
              estates={estates}
              divisions={divisions}
              blocks={blocks}
              users={users}
              onUserSelect={handleUserSelect}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {systemHealth && (
              <SystemHealthMonitor
                data={systemHealth}
                onRefresh={handleRefresh}
                autoRefresh={false} // Disable continuous polling
                refreshInterval={60000} // Increased interval if enabled
                enableSmartPolling={true} // Enable intelligent polling features
              />
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}