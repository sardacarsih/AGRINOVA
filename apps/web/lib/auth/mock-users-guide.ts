// Mock Users Guide for Development
// This file provides a comprehensive list of available test users for development and testing

export interface MockUser {
  email: string;
  password: string;
  role: string;
  name: string;
  employeeId?: string;
  phoneNumber?: string;
  position?: string;
  company?: string;
  estate?: string;
  divisi?: string;
  specialFeatures?: string[];
}

export const MOCK_USERS_GUIDE: MockUser[] = [
  // Super Admin
  {
    email: 'super-admin@agrinova.com',
    password: 'demo123',
    role: 'Super Admin',
    name: 'Dadang Haryadi',
    employeeId: 'SA001',
    phoneNumber: '+62-811-1234-001',
    position: 'System Administrator',
    specialFeatures: ['Full system access', 'Manage all companies', 'Assign company admins']
  },

  // Company Admins
  {
    email: 'admin-agrindo@agrinova.com',
    password: 'demo123',
    role: 'Company Admin',
    name: 'Siti Nurhaliza',
    employeeId: 'CA001',
    company: 'PT. Agrindo Sawit Mandiri',
    position: 'Company Administrator',
    specialFeatures: ['Manage estates', 'Manage divisions', 'Manage users in company']
  },
  {
    email: 'admin-sawita@agrinova.com',
    password: 'demo123',
    role: 'Company Admin',
    name: 'Bambang Sutrisno',
    employeeId: 'CA002',
    company: 'PT. Sawita Unggul Nusantara',
    position: 'Company Administrator',
    specialFeatures: ['Manage estates', 'Manage divisions', 'Manage users in company']
  },

  // Area Managers (Multi-Company Access)
  {
    email: 'area-manager-sumatra@agrinova.com',
    password: 'demo123',
    role: 'Area Manager',
    name: 'Rita Sari Dewi',
    employeeId: 'AM001',
    position: 'Area Manager Sumatera',
    specialFeatures: [
      'Multi-company access (Agrindo + Sawita)',
      'Receives reports from managers',
      'Regional analytics',
      'Cross-company oversight'
    ]
  },
  {
    email: 'area-manager-kalimantan@agrinova.com',
    password: 'demo123',
    role: 'Area Manager',
    name: 'Hendra Wijaya',
    employeeId: 'AM002',
    position: 'Area Manager Kalimantan',
    specialFeatures: [
      'Single-company access (Agrindo)',
      'Receives reports from managers',
      'Regional analytics'
    ]
  },

  // Managers (Multi-Estate Access)
  {
    email: 'manager-multi@agrinova.com',
    password: 'demo123',
    role: 'Manager',
    name: 'Andi Pratama',
    employeeId: 'MG001',
    company: 'PT. Agrindo Sawit Mandiri',
    position: 'Estate Manager',
    specialFeatures: [
      'Multi-estate assignment (Sari Indah + Maju Jaya)',
      'Reports to Rita Sari Dewi (Area Manager)',
      'Manage multiple estates',
      'Estate analytics'
    ]
  },
  {
    email: 'manager-sawita@agrinova.com',
    password: 'demo123',
    role: 'Manager',
    name: 'Dewi Lestari',
    employeeId: 'MG002',
    company: 'PT. Sawita Unggul Nusantara',
    estate: 'Kebun Harapan Baru',
    position: 'Estate Manager',
    specialFeatures: [
      'Single-estate assignment',
      'Reports to Rita Sari Dewi (Area Manager)',
      'Estate monitoring'
    ]
  },

  // Asisten (Multi-Division Access)
  {
    email: 'asisten-multi@agrinova.com',
    password: 'demo123',
    role: 'Asisten',
    name: 'Sari Wulandari',
    employeeId: 'AS001',
    company: 'PT. Agrindo Sawit Mandiri',
    estate: 'Kebun Sari Indah',
    position: 'Asisten Kebun',
    specialFeatures: [
      'Multi-division assignment (A, B, C)',
      'Approval workflow',
      'Offline capability',
      'Real-time notifications'
    ]
  },
  {
    email: 'asisten-produksi@agrinova.com',
    password: 'demo123',
    role: 'Asisten',
    name: 'Maya Sartika',
    employeeId: 'AS002',
    company: 'PT. Sawita Unggul Nusantara',
    estate: 'Kebun Harapan Baru',
    divisi: 'Divisi Utara',
    position: 'Asisten Produksi',
    specialFeatures: [
      'Single-division assignment',
      'Approval workflow',
      'Production monitoring'
    ]
  },

  // Mandor (Field Supervisors)
  {
    email: 'mandor-divisi-a@agrinova.com',
    password: 'demo123',
    role: 'Mandor',
    name: 'Budi Santoso',
    employeeId: 'MD001',
    company: 'PT. Agrindo Sawit Mandiri',
    estate: 'Kebun Sari Indah',
    divisi: 'Divisi A',
    position: 'Mandor Panen',
    specialFeatures: [
      'Harvest input',
      'Worker management',
      'Offline data entry',
      'Mobile-first interface'
    ]
  },
  {
    email: 'mandor-divisi-b@agrinova.com',
    password: 'demo123',
    role: 'Mandor',
    name: 'Joko Widodo',
    employeeId: 'MD002',
    company: 'PT. Agrindo Sawit Mandiri',
    estate: 'Kebun Sari Indah',
    divisi: 'Divisi B',
    position: 'Mandor Pemeliharaan',
    specialFeatures: [
      'Maintenance input',
      'Worker management',
      'Field operations'
    ]
  },
  {
    email: 'mandor-sawita@agrinova.com',
    password: 'demo123',
    role: 'Mandor',
    name: 'Rahman Hakim',
    employeeId: 'MD003',
    company: 'PT. Sawita Unggul Nusantara',
    estate: 'Kebun Harapan Baru',
    divisi: 'Divisi Utara',
    position: 'Mandor Panen',
    specialFeatures: [
      'Harvest operations',
      'Team coordination',
      'Quality control'
    ]
  },

  // Satpam (Security Guards)
  {
    email: 'satpam-gate1@agrinova.com',
    password: 'demo123',
    role: 'Satpam',
    name: 'Joko Susilo',
    employeeId: 'SP001',
    company: 'PT. Agrindo Sawit Mandiri',
    estate: 'Kebun Sari Indah',
    position: 'Satpam Gate 1',
    specialFeatures: [
      'Gate check operations',
      'Vehicle logging',
      'QR code scanning',
      'Offline sync capability'
    ]
  },
  {
    email: 'satpam-gate2@agrinova.com',
    password: 'demo123',
    role: 'Satpam',
    name: 'Udin Sedunia',
    employeeId: 'SP002',
    company: 'PT. Agrindo Sawit Mandiri',
    estate: 'Kebun Maju Jaya',
    position: 'Satpam Gate 2',
    specialFeatures: [
      'Gate check operations',
      'Security monitoring',
      'Daily reporting'
    ]
  },
  {
    email: 'satpam-sawita@agrinova.com',
    password: 'demo123',
    role: 'Satpam',
    name: 'Wawan Kurniawan',
    employeeId: 'SP003',
    company: 'PT. Sawita Unggul Nusantara',
    estate: 'Kebun Harapan Baru',
    position: 'Satpam Utama',
    specialFeatures: [
      'Main gate operations',
      'Vehicle coordination',
      'Security oversight'
    ]
  }
];

// Helper function to get users by role
export const getUsersByRole = (role: string) => {
  return MOCK_USERS_GUIDE.filter(user => user.role.toLowerCase().includes(role.toLowerCase()));
};

// Helper function to get multi-assignment users
export const getMultiAssignmentUsers = () => {
  return MOCK_USERS_GUIDE.filter(user => 
    user.specialFeatures?.some(feature => 
      feature.includes('Multi-') || feature.includes('multi-')
    )
  );
};

// Helper function to print login credentials for console
export const printLoginCredentials = () => {
  console.group('🔐 Available Test Users - Agrinova System');
  
  MOCK_USERS_GUIDE.forEach(user => {
    console.group(`👤 ${user.role} - ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Password: ${user.password}`);
    if (user.employeeId) console.log(`🆔 Employee ID: ${user.employeeId}`);
    if (user.company) console.log(`🏢 Company: ${user.company}`);
    if (user.estate) console.log(`🌴 Estate: ${user.estate}`);
    if (user.divisi) console.log(`📍 Division: ${user.divisi}`);
    if (user.specialFeatures) {
      console.log('✨ Special Features:');
      user.specialFeatures.forEach(feature => console.log(`   • ${feature}`));
    }
    console.groupEnd();
  });
  
  console.groupEnd();
};

export default MOCK_USERS_GUIDE;