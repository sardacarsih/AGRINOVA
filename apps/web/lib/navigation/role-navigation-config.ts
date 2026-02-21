import { UserRole } from '@/types/auth';
import {
  Building,
  Users,
  MapPin,
  UserCheck,
  Settings,
  BarChart3,
  Calendar,
  FileText,
  Shield,
  Home,
  Building2,
  UserCog,
  Activity,
  TrendingUp,
  Leaf,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  History,
  LogOut,
  Crown,
  Terminal,
  Globe,
  QrCode,
  Truck,
  Package,
  AlertTriangle,
  Eye,
  LineChart,
  PieChart,
  Database,
  Zap,
  Monitor,
  Layers,
  Scale,
  Award
} from 'lucide-react';

export interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  description: string;
  badge?: string | number;
  subItems?: NavigationItem[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export interface StatusItem {
  label: string;
  value: string;
  badgeClass: string;
}

export interface NavigationConfig {
  role: string;
  variant?: "sidebar" | "floating" | "inset";
  theme: {
    avatar: string;
    badge: string;
    active: string;
    subActive: string;
    iconActive: string;
    indicator: string;
  };
  groups: NavigationGroup[];
  statusSection?: {
    items: StatusItem[];
  };
  statusText: string;
}

// Super Admin Navigation
const SUPER_ADMIN_CONFIG: NavigationConfig = {
  role: 'Super Admin',
  theme: {
    avatar: 'bg-purple-600',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    active: 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm',
    subActive: 'bg-purple-100 text-purple-700',
    iconActive: 'text-purple-600',
    indicator: 'bg-purple-500',
  },
  groups: [
    {
      label: 'System Management',
      items: [
        {
          title: 'System Overview',
          href: '/dashboard',
          icon: BarChart3,
          description: 'Complete system monitoring and control',
        },
        {
          title: 'Company Management',
          href: '/companies',
          icon: Building,
          description: 'Manage all companies in the system',
          badge: '12',
        },
        {
          title: 'User Administration',
          href: '/users',
          icon: Users,
          description: 'Global user management across companies',
          badge: '245',
        },
        {
          title: 'System Monitoring',
          href: '/dashboard/monitoring',
          icon: Monitor,
          description: 'System health and performance monitoring',
        },
        {
          title: 'API Management',
          href: '/api-keys',
          icon: Terminal,
          description: 'API keys, rate limits, and access control',
        },
      ],
    },
    {
      label: 'Reports & Analytics',
      items: [
        {
          title: 'Global Analytics',
          href: '/analytics',
          icon: PieChart,
          description: 'Cross-company analytics and insights',
        },
        {
          title: 'System Reports',
          href: '/reports',
          icon: FileText,
          description: 'Generate system-wide reports',
        },
      ],
    },
  ],
  statusText: 'System Active',
};

// Company Admin Navigation
const COMPANY_ADMIN_CONFIG: NavigationConfig = {
  role: 'Company Admin',
  theme: {
    avatar: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    active: 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm',
    subActive: 'bg-orange-100 text-orange-700',
    iconActive: 'text-orange-600',
    indicator: 'bg-orange-500',
  },
  groups: [
    {
      label: 'Company Management',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: Home,
          description: 'Company overview and key metrics',
        },
        {
          title: 'Estates',
          href: '/dashboard/estates',
          icon: MapPin,
          description: 'Manage company estates',
          badge: '12',
        },
        {
          title: 'Divisions',
          href: '/dashboard/divisions',
          icon: Layers,
          description: 'Manage estate divisions',
          badge: '45',
        },
        {
          title: 'TPH Locations',
          href: '/dashboard/tph-locations',
          icon: MapPin,
          description: 'Manage collection points',
          badge: '78',
        },
        {
          title: 'Karyawan',
          href: '/employees',
          icon: Users,
          description: 'Kelola data karyawan perusahaan',
          badge: '234',
        },
        {
          title: 'Unit Kendaraan',
          href: '/vehicles',
          icon: Truck,
          description: 'Kelola unit kendaraan perusahaan',
        },
        {
          title: 'Workers',
          href: '/dashboard/workers',
          icon: UserCog,
          description: 'Manage field workers and staff',
        },
        {
          title: 'User Management',
          href: '/dashboard/users',
          icon: UserCog,
          description: 'Manage user accounts',
          badge: '67',
        },
      ],
    },
    {
      label: 'Operations',
      items: [
        {
          title: 'Analytics',
          href: '/dashboard/analytics',
          icon: BarChart3,
          description: 'Company performance analytics',
        },
        {
          title: 'Reports',
          href: '/dashboard/reports',
          icon: FileText,
          description: 'Generate company reports',
        },
      ],
    },
  ],
  statusText: 'Company System Active',
};

// Area Manager Navigation
const AREA_MANAGER_CONFIG: NavigationConfig = {
  role: 'Area Manager',
  theme: {
    avatar: 'bg-blue-600',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    active: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm',
    subActive: 'bg-blue-100 text-blue-700',
    iconActive: 'text-blue-600',
    indicator: 'bg-blue-500',
  },
  groups: [
    {
      label: 'Regional Management',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: BarChart3,
          description: 'Regional overview and analytics',
        },
        {
          title: 'Regional Analytics',
          href: '/dashboard/analytics',
          icon: LineChart,
          description: 'Cross-company performance analysis',
        },
        {
          title: 'Executive Reports',
          href: '/dashboard/reports',
          icon: FileText,
          description: 'High-level regional reports',
        },
        {
          title: 'Comparison Analysis',
          href: '/dashboard/comparison',
          icon: TrendingUp,
          description: 'Compare performance across companies',
        },
      ],
    },
    {
      label: 'Oversight',
      items: [
        {
          title: 'System Monitoring',
          href: '/dashboard/monitoring',
          icon: Monitor,
          description: 'Monitor system health across region',
        },
      ],
    },
  ],
  statusText: 'Regional Operations Active',
};

// Manager Navigation
const MANAGER_CONFIG: NavigationConfig = {
  role: 'Manager',
  theme: {
    avatar: 'bg-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    active: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm',
    subActive: 'bg-indigo-100 text-indigo-700',
    iconActive: 'text-indigo-600',
    indicator: 'bg-indigo-500',
  },
  groups: [
    {
      label: 'Estate Management',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: Home,
          description: 'Estate overview and monitoring',
        },
        {
          title: 'Harvest Reports',
          href: '/dashboard/harvest',
          icon: Leaf,
          description: 'Monitor harvest data and approvals',
        },
        {
          title: 'Analytics',
          href: '/dashboard/analytics',
          icon: BarChart3,
          description: 'Estate performance analytics',
        },
        {
          title: 'User Management',
          href: '/dashboard/users',
          icon: Users,
          description: 'Manage estate staff',
        },
        {
          title: 'Workers',
          href: '/dashboard/workers',
          icon: UserCog,
          description: 'Manage field workers and staff',
        },
        {
          title: 'TPH Management',
          href: '/dashboard/tph-locations',
          icon: MapPin,
          description: 'Manage collection points',
        },
      ],
    },
  ],
  statusText: 'Estate Operations Active',
};

// Asisten Navigation
const ASISTEN_CONFIG: NavigationConfig = {
  role: 'Asisten',
  theme: {
    avatar: 'bg-yellow-600',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    active: 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm',
    subActive: 'bg-yellow-100 text-yellow-700',
    iconActive: 'text-yellow-600',
    indicator: 'bg-yellow-500',
  },
  groups: [
    {
      label: 'Operations',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: Home,
          description: 'Division operations overview',
        },
        {
          title: 'Harvest Approvals',
          href: '/dashboard/approvals',
          icon: CheckCircle,
          description: 'Review and approve harvest data',
          badge: '15',
        },
        {
          title: 'Harvest Reports',
          href: '/dashboard/harvest',
          icon: Leaf,
          description: 'Monitor harvest performance',
        },
        {
          title: 'Worker Management',
          href: '/dashboard/workers',
          icon: Users,
          description: 'Manage field workers',
        },
        {
          title: 'TPH Status',
          href: '/dashboard/tph-locations',
          icon: MapPin,
          description: 'Monitor collection point status',
        },
      ],
    },
    {
      label: 'Monitoring',
      items: [
        {
          title: 'Performance Analytics',
          href: '/dashboard/analytics',
          icon: BarChart3,
          description: 'Division performance metrics',
        },
        {
          title: 'Daily Reports',
          href: '/dashboard/reports',
          icon: FileText,
          description: 'Generate daily operation reports',
        },
      ],
    },
  ],
  statusSection: {
    items: [
      {
        label: 'Pending Approvals',
        value: '15',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
      },
      {
        label: 'Today\'s Target',
        value: '850 kg',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        label: 'Current Progress',
        value: '847 kg',
        badgeClass: 'bg-green-50 text-green-700 border-green-200',
      },
    ],
  },
  statusText: 'Division Operations Active',
};

// Mandor Navigation
const MANDOR_CONFIG: NavigationConfig = {
  role: 'Mandor',
  variant: 'inset',
  theme: {
    avatar: 'bg-green-600',
    badge: 'bg-green-50 text-green-700 border-green-200',
    active: 'bg-green-50 text-green-700 border-green-200 shadow-sm',
    subActive: 'bg-green-100 text-green-700',
    iconActive: 'text-green-600',
    indicator: 'bg-green-500',
  },
  groups: [
    {
      label: 'Field Operations',
      items: [
        {
          title: 'Dashboard',
          href: '/',
          icon: BarChart3,
          description: 'Team overview and daily productivity'
        },
        {
          title: 'Record Sync Mobile',
          href: '/harvest',
          icon: History,
          description: 'View synced harvest records from mobile',
        },
      ],
    },
  ],
  statusSection: {
    items: [
      {
        label: 'Team Present',
        value: '15/17',
        badgeClass: 'bg-green-50 text-green-700 border-green-200',
      },
      {
        label: 'Daily Target',
        value: '850 kg',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        label: 'Progress',
        value: '847 kg',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
    ],
  },
  statusText: 'Field Team Active',
};

// Satpam Navigation
const SATPAM_CONFIG: NavigationConfig = {
  role: 'Satpam',
  theme: {
    avatar: 'bg-gray-600',
    badge: 'bg-gray-50 text-gray-700 border-gray-200',
    active: 'bg-gray-50 text-gray-700 border-gray-200 shadow-sm',
    subActive: 'bg-gray-100 text-gray-700',
    iconActive: 'text-gray-600',
    indicator: 'bg-gray-500',
  },
  groups: [
    {
      label: 'Operasional Keamanan',
      items: [
        {
          title: 'Dasbor',
          href: '/dashboard',
          icon: Shield,
          description: 'Ikhtisar keamanan dan pemantauan',
        },
        {
          title: 'Pemeriksaan Gerbang',
          href: '/dashboard/gate-check',
          icon: QrCode,
          description: 'Manajemen keluar/masuk kendaraan',
        },
        {
          title: 'Log Kendaraan',
          href: '/dashboard/vehicles',
          icon: Truck,
          description: 'Catatan pergerakan kendaraan',
        },
        {
          title: 'Laporan Insiden',
          href: '/dashboard/incidents',
          icon: AlertTriangle,
          description: 'Pelaporan insiden keamanan',
        },
        {
          title: 'Manajemen Pengunjung',
          href: '/dashboard/visitors',
          icon: UserCheck,
          description: 'Registrasi dan pelacakan tamu',
        },
      ],
    },
    {
      label: 'Pemantauan',
      items: [
        {
          title: 'Log Aktivitas',
          href: '/dashboard/logs',
          icon: Eye,
          description: 'Pemantauan aktivitas keamanan',
        },
        {
          title: 'Laporan',
          href: '/dashboard/reports',
          icon: FileText,
          description: 'Laporan dan ringkasan keamanan',
        },
      ],
    },
  ],
  statusSection: {
    items: [
      {
        label: 'Kendaraan Hari Ini',
        value: '42',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        label: 'Pemeriksaan Menunggu',
        value: '3',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      },
    ],
  },
  statusText: 'Sistem Keamanan Aktif',
};

// Timbangan Navigation
const TIMBANGAN_CONFIG: NavigationConfig = {
  role: 'Timbangan',
  theme: {
    avatar: 'bg-teal-600',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    active: 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm',
    subActive: 'bg-teal-100 text-teal-700',
    iconActive: 'text-teal-600',
    indicator: 'bg-teal-500',
  },
  groups: [
    {
      label: 'Weighing Operations',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: Home,
          description: 'Weighing overview and daily metrics',
        },
        {
          title: 'Timbang TBS',
          href: '/dashboard/weighing',
          icon: Scale,
          description: 'Record FFB weight measurements',
        },
        {
          title: 'Riwayat Timbang',
          href: '/dashboard/weighing/history',
          icon: History,
          description: 'View weighing records',
        },
        {
          title: 'Kendaraan',
          href: '/dashboard/vehicles',
          icon: Truck,
          description: 'Vehicle weight tracking',
        },
      ],
    },
    {
      label: 'Reports',
      items: [
        {
          title: 'Laporan Harian',
          href: '/dashboard/reports',
          icon: FileText,
          description: 'Daily weighing reports',
        },
        {
          title: 'Analytics',
          href: '/dashboard/analytics',
          icon: BarChart3,
          description: 'Weight statistics and trends',
        },
      ],
    },
  ],
  statusSection: {
    items: [
      {
        label: 'Today\'s Weighing',
        value: '42',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        label: 'Total Weight',
        value: '12.5 ton',
        badgeClass: 'bg-green-50 text-green-700 border-green-200',
      },
    ],
  },
  statusText: 'Weighing Operations Active',
};

// Grading Navigation
const GRADING_CONFIG: NavigationConfig = {
  role: 'Grading',
  theme: {
    avatar: 'bg-rose-600',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    active: 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm',
    subActive: 'bg-rose-100 text-rose-700',
    iconActive: 'text-rose-600',
    indicator: 'bg-rose-500',
  },
  groups: [
    {
      label: 'Quality Inspection',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: Home,
          description: 'Quality inspection overview',
        },
        {
          title: 'Inspeksi Mutu',
          href: '/dashboard/grading',
          icon: Award,
          description: 'Perform quality assessments',
        },
        {
          title: 'Riwayat Grading',
          href: '/dashboard/grading/history',
          icon: History,
          description: 'View grading records',
        },
        {
          title: 'Approval Queue',
          href: '/dashboard/approvals',
          icon: CheckCircle,
          description: 'Pending quality approvals',
          badge: '8',
        },
      ],
    },
    {
      label: 'Reports',
      items: [
        {
          title: 'Laporan Mutu',
          href: '/dashboard/reports',
          icon: FileText,
          description: 'Quality assessment reports',
        },
        {
          title: 'Analytics',
          href: '/dashboard/analytics',
          icon: BarChart3,
          description: 'Quality trends and statistics',
        },
      ],
    },
  ],
  statusSection: {
    items: [
      {
        label: 'Today\'s Inspections',
        value: '38',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      {
        label: 'Pending Approval',
        value: '8',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
      },
      {
        label: 'Avg Quality',
        value: 'A',
        badgeClass: 'bg-green-50 text-green-700 border-green-200',
      },
    ],
  },
  statusText: 'Quality Inspection Active',
};

// Translation key based configuration templates
const CONFIG_TEMPLATES = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    groups: [
      {
        label: 'navigation.groups.systemManagement.title',
        items: [
          {
            title: 'navigation.items.systemOverview',
            href: '/dashboard',
            icon: 'BarChart3',
            description: 'navigation.descriptions.completeSystemMonitoring',
          },
          {
            title: 'navigation.items.companyManagement',
            href: '/companies',
            icon: 'Building',
            description: 'navigation.descriptions.companyDataManagement',
            badge: '12',
          },
          {
            title: 'navigation.items.userAdministration',
            href: '/users',
            icon: 'Users',
            description: 'navigation.descriptions.companyDataManagement',
            badge: '245',
          },
          {
            title: 'navigation.items.systemMonitoring',
            href: '/dashboard/monitoring',
            icon: 'Monitor',
            description: 'navigation.descriptions.completeSystemMonitoring',
          },
          {
            title: 'navigation.items.apiManagement',
            href: '/dashboard/api',
            icon: 'Terminal',
            description: 'navigation.descriptions.companyDataManagement',
          },
        ],
      },
      {
        label: 'navigation.groups.reportsAnalytics.title',
        items: [
          {
            title: 'navigation.items.globalAnalytics',
            href: '/dashboard/analytics',
            icon: 'PieChart',
            description: 'navigation.descriptions.comprehensiveReports',
          },
          {
            title: 'navigation.items.systemReports',
            href: '/dashboard/reports',
            icon: 'FileText',
            description: 'navigation.descriptions.comprehensiveReports',
          },
        ],
      },
    ],
    statusText: 'navigation.status.systemActive',
  },
  COMPANY_ADMIN: {
    role: 'COMPANY_ADMIN',
    groups: [
      {
        label: 'navigation.groups.companyManagement.title',
        items: [
          {
            title: 'navigation.items.dashboard',
            href: '/dashboard',
            icon: 'Home',
            description: 'navigation.descriptions.companyDataManagement',
          },
          {
            title: 'navigation.items.estates',
            href: '/dashboard/estates',
            icon: 'MapPin',
            description: 'navigation.descriptions.estateOperations',
            badge: '12',
          },
          {
            title: 'navigation.items.divisions',
            href: '/dashboard/divisions',
            icon: 'Layers',
            description: 'navigation.descriptions.estateOperations',
            badge: '45',
          },
          {
            title: 'navigation.items.tphLocations',
            href: '/dashboard/tph-locations',
            icon: 'MapPin',
            description: 'navigation.descriptions.estateOperations',
            badge: '78',
          },
          {
            title: 'navigation.items.employees',
            href: '/employees',
            icon: 'Users',
            description: 'navigation.descriptions.companyDataManagement',
            badge: '234',
          },
          {
            title: 'navigation.items.vehicles',
            href: '/vehicles',
            icon: 'Truck',
            description: 'navigation.descriptions.vehicleMovement',
          },
          {
            title: 'navigation.items.workers',
            href: '/dashboard/workers',
            icon: 'UserCog',
            description: 'navigation.descriptions.companyDataManagement',
          },
          {
            title: 'navigation.items.userManagement',
            href: '/dashboard/users',
            icon: 'UserCog',
            description: 'navigation.descriptions.companyDataManagement',
            badge: '67',
          },
        ],
      },
      {
        label: 'navigation.groups.operations.title',
        items: [
          {
            title: 'navigation.items.analytics',
            href: '/dashboard/analytics',
            icon: 'BarChart3',
            description: 'navigation.descriptions.comprehensiveReports',
          },
          {
            title: 'navigation.items.reportsAnalytics',
            href: '/dashboard/reports',
            icon: 'FileText',
            description: 'navigation.descriptions.comprehensiveReports',
          },
        ],
      },
    ],
    statusText: 'navigation.status.companySystemActive',
  },
  AREA_MANAGER: {
    role: 'AREA_MANAGER',
    groups: [
      {
        label: 'navigation.groups.regionalManagement.title',
        items: [
          {
            title: 'navigation.items.dashboard',
            href: '/dashboard',
            icon: 'BarChart3',
            description: 'navigation.descriptions.regionalOverview',
          },
          {
            title: 'navigation.items.regionalAnalytics',
            href: '/dashboard/analytics',
            icon: 'LineChart',
            description: 'navigation.descriptions.crossCompanyAnalysis',
          },
          {
            title: 'navigation.items.executiveReports',
            href: '/dashboard/reports',
            icon: 'FileText',
            description: 'navigation.descriptions.highLevelReports',
          },
          {
            title: 'navigation.items.comparisonAnalysis',
            href: '/dashboard/comparison',
            icon: 'TrendingUp',
            description: 'navigation.descriptions.comparePerformance',
          },
        ],
      },
      {
        label: 'navigation.groups.oversight.title',
        items: [
          {
            title: 'navigation.items.systemMonitoring',
            href: '/dashboard/monitoring',
            icon: 'Monitor',
            description: 'navigation.descriptions.monitorSystemHealth',
          },
        ],
      },
    ],
    statusText: 'navigation.status.regionalOperationsActive',
  },
  MANAGER: {
    role: 'MANAGER',
    groups: [
      {
        label: 'navigation.groups.estateManagement.title',
        items: [
          {
            title: 'navigation.items.dashboard',
            href: '/dashboard',
            icon: 'Home',
            description: 'navigation.descriptions.estateOverview',
          },
          {
            title: 'navigation.items.harvestReports',
            href: '/dashboard/harvest',
            icon: 'Leaf',
            description: 'navigation.descriptions.monitorHarvest',
          },
          {
            title: 'navigation.items.analytics',
            href: '/dashboard/analytics',
            icon: 'BarChart3',
            description: 'navigation.descriptions.estatePerformance',
          },
          {
            title: 'navigation.items.userManagement',
            href: '/dashboard/users',
            icon: 'Users',
            description: 'navigation.descriptions.manageEstateStaff',
          },
          {
            title: 'navigation.items.workers',
            href: '/dashboard/workers',
            icon: 'UserCog',
            description: 'navigation.descriptions.manageFieldWorkers',
          },
          {
            title: 'navigation.items.tphManagement',
            href: '/dashboard/tph-locations',
            icon: 'MapPin',
            description: 'navigation.descriptions.manageCollectionPoints',
          },
        ],
      },
    ],
    statusText: 'navigation.status.estateOperationsActive',
  },
  ASISTEN: {
    role: 'ASISTEN',
    groups: [
      {
        label: 'navigation.groups.operations.title',
        items: [
          {
            title: 'navigation.items.dashboard',
            href: '/dashboard',
            icon: 'Home',
            description: 'navigation.descriptions.divisionOverview',
          },
          {
            title: 'navigation.items.harvestApprovals',
            href: '/dashboard/approvals',
            icon: 'CheckCircle',
            description: 'navigation.descriptions.reviewHarvest',
            badge: '15',
          },
          {
            title: 'navigation.items.harvestReports',
            href: '/dashboard/harvest',
            icon: 'Leaf',
            description: 'navigation.descriptions.monitorHarvestPerf',
          },
          {
            title: 'navigation.items.workerManagement',
            href: '/dashboard/workers',
            icon: 'Users',
            description: 'navigation.descriptions.manageFieldWorkersSimple',
          },
          {
            title: 'navigation.items.tphStatus',
            href: '/dashboard/tph-locations',
            icon: 'MapPin',
            description: 'navigation.descriptions.monitorCollectionPoints',
          },
        ],
      },
      {
        label: 'navigation.groups.monitoring.title',
        items: [
          {
            title: 'navigation.items.performanceAnalytics',
            href: '/dashboard/analytics',
            icon: 'BarChart3',
            description: 'navigation.descriptions.divisionPerformance',
          },
          {
            title: 'navigation.items.dailyReports',
            href: '/dashboard/reports',
            icon: 'FileText',
            description: 'navigation.descriptions.generateDailyReports',
          },
        ],
      },
    ],
    statusSection: {
      items: [
        {
          label: 'pendingApprovals',
          value: '15',
          badgeClass: 'bg-red-50 text-red-700 border-red-200',
        },
        {
          label: 'todayTarget',
          value: '850 kg',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
          label: 'currentProgress',
          value: '847 kg',
          badgeClass: 'bg-green-50 text-green-700 border-green-200',
        },
      ],
    },
    statusText: 'navigation.status.divisionOperationsActive',
  },
  MANDOR: {
    role: 'MANDOR',
    variant: 'inset',
    groups: [
      {
        label: 'navigation.groups.fieldOperations.title',
        items: [
          {
            title: 'navigation.items.dashboard',
            href: '/',
            icon: 'BarChart3',
            description: 'navigation.descriptions.teamOverview',
          },
          {
            title: 'navigation.items.mobileSyncRecords',
            href: '/harvest',
            icon: 'History',
            description: 'navigation.descriptions.viewMobileSyncRecords',
          },
        ],
      },
    ],
    statusSection: {
      items: [
        {
          label: 'teamPresent',
          value: '15/17',
          badgeClass: 'bg-green-50 text-green-700 border-green-200',
        },
        {
          label: 'dailyTarget',
          value: '850 kg',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        },
        {
          label: 'progress',
          value: '847 kg',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        },
      ],
    },
    statusText: 'navigation.status.fieldTeamActive',
  },
} as const;

// Icon mapping function
function getIcon(iconName: string) {
  const iconMap = {
    BarChart3, Building, Users, MapPin, UserCheck, Settings, Home, Layers,
    FileText, Shield, Terminal, Globe, QrCode, Truck, Package, AlertTriangle,
    Eye, LineChart, PieChart, Database, Zap, Monitor, Scale, Award,
    Leaf, Clock, CheckCircle, XCircle, Plus, History, LogOut, Crown,
    UserCog, Activity, TrendingUp
  };
  return iconMap[iconName as keyof typeof iconMap] || Home;
}

// Helper function to translate configuration
function translateConfig(template: any, t: any): NavigationConfig {
  const translate = (key: string) => {
    if (typeof t === 'function') {
      // Remove 'navigation.' prefix since t is already scoped to navigation namespace
      const cleanKey = key.startsWith('navigation.') ? key.substring(11) : key;
      return t(cleanKey);
    }
    const parts = key.split('.');
    let value = t;
    for (const part of parts) {
      value = value?.[part];
    }
    return value || key;
  };

  return {
    ...template,
    role: template.role, // Keep original role, not displayed in sidebar
    groups: template.groups.map((group: any) => ({
      ...group,
      label: translate(group.label),
      items: group.items.map((item: any) => ({
        ...item,
        title: translate(item.title),
        description: translate(item.description),
        icon: getIcon(item.icon),
      })),
    })),
    statusText: translate(template.statusText),
    statusSection: template.statusSection ? {
      items: template.statusSection.items.map((item: any) => ({
        ...item,
        label: translate(`status.${item.label.replace(/[^a-zA-Z0-9]/g, '')}`),
      })),
    } : undefined,
  };
}

// Main configuration function with translations
export function getRoleNavigationConfig(role: UserRole, t?: any): NavigationConfig {
  // Use translated version if translation function is provided
  if (t) {
    const template = CONFIG_TEMPLATES[role as keyof typeof CONFIG_TEMPLATES];
    if (template) {
      return translateConfig(template, t);
    }
  }

  // Fallback to original hardcoded configs
  switch (role) {
    case 'SUPER_ADMIN':
      return SUPER_ADMIN_CONFIG;
    case 'COMPANY_ADMIN':
      return COMPANY_ADMIN_CONFIG;
    case 'AREA_MANAGER':
      return AREA_MANAGER_CONFIG;
    case 'MANAGER':
      return MANAGER_CONFIG;
    case 'ASISTEN':
      return ASISTEN_CONFIG;
    case 'MANDOR':
      return MANDOR_CONFIG;
    case 'SATPAM':
      return SATPAM_CONFIG;
    case 'TIMBANGAN':
      return TIMBANGAN_CONFIG;
    case 'GRADING':
      return GRADING_CONFIG;
    default:
      return MANDOR_CONFIG; // Fallback
  }
}
