import { LoginFormData, User, AuthSession, LoginResponse, UserRole, ROLE_PERMISSIONS } from '@/types/auth';

// ================================================
// STANDARDIZED MOCK DATA STRUCTURE
// ================================================
// 
// Company Structure:
// 1. PT Agrinova Sentosa (agrinova_1)
//    - Estate: Sawit Jaya, Sawit Indah, Perkebunan Utara
//    - Divisions: Divisi A, Divisi B, Divisi C per estate
//
// 2. PT Sawit Makmur (sawit_makmur_1) 
//    - Estate: Makmur Estate, Sukses Estate
//    - Divisions: Divisi 1, Divisi 2 per estate
//
// 3. PT Palm Jaya (palm_jaya_1)
//    - Estate: Palm Central, Palm Timur
//    - Divisions: North Division, South Division per estate

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock users with standardized company hierarchy
const mockUsers: Record<string, { password: string; user: User }> = {
  
  // ================================================
  // SUPER ADMIN - Cross-company system access
  // ================================================
  'super-admin@agrinova.com': {
    password: 'superadmin123',
    user: {
      id: 'super_1',
      email: 'super-admin@agrinova.com',
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
      avatar: '/avatars/super-admin.jpg',
      company: 'Agrinova System',
      companyId: 'system',
      permissions: ROLE_PERMISSIONS['SUPER_ADMIN'],
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
      employeeId: 'SYS001',
      phoneNumber: '081234567000',
      position: 'System Administrator',
      status: 'active',
      notes: 'Super Admin dengan akses ke seluruh sistem',
    },
  },

  // ================================================
  // COMPANY ADMINS - Per company management
  // ================================================
  
  // Company Admin - PT Agrinova Sentosa
  'company-admin@agrinova.com': {
    password: 'companyadmin123',
    user: {
      id: 'ca_1',
      email: 'company-admin@agrinova.com',
      name: 'Admin PT Agrinova Sentosa',
      role: 'COMPANY_ADMIN',
      avatar: '/avatars/company-admin.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      permissions: ROLE_PERMISSIONS['COMPANY_ADMIN'],
      createdAt: new Date('2024-01-02'),
      lastLogin: new Date(),
      employeeId: 'CA001',
      phoneNumber: '081234567001',
      position: 'Company Administrator',
      status: 'active',
      notes: 'Company Admin untuk PT Agrinova Sentosa',
      companyAdminFor: ['agrinova_1'],
      isCurrentCompanyAdmin: true,
    },
  },

  // Company Admin - PT Sawit Makmur
  'company-admin-sawit@agrinova.com': {
    password: 'companyadmin123',
    user: {
      id: 'ca_2',
      email: 'company-admin-sawit@agrinova.com',
      name: 'Admin PT Sawit Makmur',
      role: 'COMPANY_ADMIN',
      avatar: '/avatars/company-admin2.jpg',
      company: 'PT Sawit Makmur',
      companyId: 'sawit_makmur_1',
      permissions: ROLE_PERMISSIONS['COMPANY_ADMIN'],
      createdAt: new Date('2024-01-02'),
      lastLogin: new Date(),
      employeeId: 'CA002',
      phoneNumber: '081234567002',
      position: 'Company Administrator',
      status: 'active',
      notes: 'Company Admin untuk PT Sawit Makmur',
      companyAdminFor: ['sawit_makmur_1'],
      isCurrentCompanyAdmin: true,
    },
  },

  // Company Admin - PT Palm Jaya
  'company-admin-palm@agrinova.com': {
    password: 'companyadmin123',
    user: {
      id: 'ca_3',
      email: 'company-admin-palm@agrinova.com',
      name: 'Admin PT Palm Jaya',
      role: 'COMPANY_ADMIN',
      avatar: '/avatars/company-admin3.jpg',
      company: 'PT Palm Jaya',
      companyId: 'palm_jaya_1',
      permissions: ROLE_PERMISSIONS['COMPANY_ADMIN'],
      createdAt: new Date('2024-01-02'),
      lastLogin: new Date(),
      employeeId: 'CA003',
      phoneNumber: '081234567003',
      position: 'Company Administrator',
      status: 'active',
      notes: 'Company Admin untuk PT Palm Jaya',
      companyAdminFor: ['palm_jaya_1'],
      isCurrentCompanyAdmin: true,
    },
  },

  // ================================================
  // AREA MANAGERS - Multi-company assignments
  // ================================================
  
  // Area Manager - Multi-company Regional Sumatera
  'area-manager@agrinova.com': {
    password: 'area123',
    user: {
      id: 'am_1',
      email: 'area-manager@agrinova.com',
      name: 'Rita Sari Wijaya',
      role: 'AREA_MANAGER',
      avatar: '/avatars/area-manager.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Regional Office Pekanbaru',
      permissions: ROLE_PERMISSIONS['AREA_MANAGER'],
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
      employeeId: 'AM001',
      phoneNumber: '081234567010',
      position: 'Senior Area Manager Regional Sumatera',
      status: 'active',
      notes: 'Senior Area Manager dengan 12 tahun pengalaman, mengawasi operasi lintas perusahaan di Sumatera',
      assignedCompanies: ['agrinova_1', 'sawit_makmur_1'],
      assignedCompanyNames: ['PT Agrinova Sentosa', 'PT Sawit Makmur'],
    },
  },

  // Area Manager - Multi-company Head Office
  'area-manager-chief@agrinova.com': {
    password: 'area123',
    user: {
      id: 'am_2',
      email: 'area-manager-chief@agrinova.com',
      name: 'Dr. Bambang Setiawan',
      role: 'AREA_MANAGER',
      avatar: '/avatars/area-manager2.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Head Office Jakarta',
      permissions: ROLE_PERMISSIONS['AREA_MANAGER'],
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
      employeeId: 'AM002',
      phoneNumber: '081234567011',
      position: 'Chief Area Manager Multi-Regional',
      status: 'active',
      notes: 'Chief Area Manager dengan PhD in Agricultural Management. Mengelola operasi strategis lintas 3 perusahaan.',
      assignedCompanies: ['agrinova_1', 'sawit_makmur_1', 'palm_jaya_1'],
      assignedCompanyNames: ['PT Agrinova Sentosa', 'PT Sawit Makmur', 'PT Palm Jaya'],
    },
  },

  // ================================================
  // PT AGRINOVA SENTOSA USERS (companyId: 'agrinova_1')
  // ================================================

  // MANAGERS - PT Agrinova Sentosa
  'manager-agrinova@agrinova.com': {
    password: 'manager123',
    user: {
      id: 'mgr_ag_1',
      email: 'manager-agrinova@agrinova.com',
      name: 'Andi Setiawan',
      role: 'MANAGER',
      avatar: '/avatars/manager.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      permissions: ROLE_PERMISSIONS['MANAGER'],
      createdAt: new Date('2024-01-05'),
      lastLogin: new Date(),
      employeeId: 'MGR001',
      phoneNumber: '081234567020',
      position: 'Manager Estate Sawit Jaya',
      status: 'active',
      notes: 'Manager senior dengan track record yang baik',
      assignedEstates: ['estate_sawit_jaya_1'],
      assignedEstateNames: ['Sawit Jaya'],
    },
  },

  'manager-multi-agrinova@agrinova.com': {
    password: 'manager123',
    user: {
      id: 'mgr_ag_2',
      email: 'manager-multi-agrinova@agrinova.com',
      name: 'Siti Rahayu',
      role: 'MANAGER',
      avatar: '/avatars/manager2.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Indah', // Primary estate
      permissions: ROLE_PERMISSIONS['MANAGER'],
      createdAt: new Date('2024-01-05'),
      lastLogin: new Date(),
      employeeId: 'MGR002',
      phoneNumber: '081234567021',
      position: 'Senior Manager Multi-Estate',
      status: 'active',
      notes: 'Manager senior yang mengelola multiple estate',
      assignedEstates: ['estate_sawit_indah_1', 'estate_perkebunan_utara_1'],
      assignedEstateNames: ['Sawit Indah', 'Perkebunan Utara'],
    },
  },

  // ASISTEN - PT Agrinova Sentosa
  'asisten-agrinova@agrinova.com': {
    password: 'asisten123',
    user: {
      id: 'ast_ag_1',
      email: 'asisten-agrinova@agrinova.com',
      name: 'Sari Wulandari',
      role: 'ASISTEN',
      avatar: '/avatars/asisten.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      divisi: 'Divisi A',
      permissions: ROLE_PERMISSIONS['ASISTEN'],
      createdAt: new Date('2024-01-10'),
      lastLogin: new Date(),
      employeeId: 'AST001',
      phoneNumber: '081234567030',
      position: 'Asisten Kebun',
      status: 'active',
      notes: 'Asisten berpengalaman dalam approval workflow',
      assignedDivisions: ['div_sawit_jaya_a_1'],
      assignedDivisionNames: ['Divisi A'],
    },
  },

  'asisten-multi-agrinova@agrinova.com': {
    password: 'asisten123',
    user: {
      id: 'ast_ag_2',
      email: 'asisten-multi-agrinova@agrinova.com',
      name: 'Dewi Kartika',
      role: 'ASISTEN',
      avatar: '/avatars/asisten2.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      divisi: 'Divisi A', // Primary division
      permissions: ROLE_PERMISSIONS['ASISTEN'],
      createdAt: new Date('2024-01-10'),
      lastLogin: new Date(),
      employeeId: 'AST002',
      phoneNumber: '081234567031',
      position: 'Senior Asisten Multi-Divisi',
      status: 'active',
      notes: 'Senior Asisten yang mengelola multiple divisi',
      assignedDivisions: ['div_sawit_jaya_a_1', 'div_sawit_jaya_b_1'],
      assignedDivisionNames: ['Divisi A', 'Divisi B'],
    },
  },

  // MANDOR - PT Agrinova Sentosa
  'mandor-agrinova@agrinova.com': {
    password: 'mandor123',
    user: {
      id: 'mdr_ag_1',
      email: 'mandor-agrinova@agrinova.com',
      name: 'Budi Santoso',
      role: 'MANDOR',
      avatar: '/avatars/mandor.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      divisi: 'Divisi A',
      permissions: ROLE_PERMISSIONS['MANDOR'],
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date(),
      employeeId: 'MDR001',
      phoneNumber: '081234567040',
      position: 'Mandor Panen',
      status: 'active',
      notes: 'Mandor senior dengan pengalaman 10 tahun',
    },
  },

  'mandor2-agrinova@agrinova.com': {
    password: 'mandor123',
    user: {
      id: 'mdr_ag_2',
      email: 'mandor2-agrinova@agrinova.com',
      name: 'Joko Widodo',
      role: 'MANDOR',
      avatar: '/avatars/mandor2.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      divisi: 'Divisi B',
      permissions: ROLE_PERMISSIONS['MANDOR'],
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date(),
      employeeId: 'MDR002',
      phoneNumber: '081234567041',
      position: 'Mandor Panen',
      status: 'active',
      notes: 'Mandor dengan spesialisasi quality control',
    },
  },

  // SATPAM - PT Agrinova Sentosa
  'satpam-agrinova@agrinova.com': {
    password: 'satpam123',
    user: {
      id: 'sat_ag_1',
      email: 'satpam-agrinova@agrinova.com',
      name: 'Joko Susilo',
      role: 'SATPAM',
      avatar: '/avatars/satpam.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      permissions: ROLE_PERMISSIONS['SATPAM'],
      createdAt: new Date('2024-01-20'),
      lastLogin: new Date(),
      employeeId: 'SAT001',
      phoneNumber: '081234567050',
      position: 'Satpam Gate',
      status: 'active',
      notes: 'Petugas keamanan gate dengan sertifikat keamanan',
    },
  },

  'satpam2-agrinova@agrinova.com': {
    password: 'satpam123',
    user: {
      id: 'sat_ag_2',
      email: 'satpam2-agrinova@agrinova.com',
      name: 'Rahmat Hidayat',
      role: 'SATPAM',
      avatar: '/avatars/satpam2.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Indah',
      permissions: ROLE_PERMISSIONS['SATPAM'],
      createdAt: new Date('2024-01-20'),
      lastLogin: new Date(),
      employeeId: 'SAT002',
      phoneNumber: '081234567051',
      position: 'Satpam Gate',
      status: 'active',
      notes: 'Security officer estate Sawit Indah',
    },
  },

  // ================================================
  // PT SAWIT MAKMUR USERS (companyId: 'sawit_makmur_1')
  // ================================================

  // MANAGERS - PT Sawit Makmur
  'manager-sawit@agrinova.com': {
    password: 'manager123',
    user: {
      id: 'mgr_sm_1',
      email: 'manager-sawit@agrinova.com',
      name: 'Ahmad Fauzi',
      role: 'MANAGER',
      avatar: '/avatars/manager3.jpg',
      company: 'PT Sawit Makmur',
      companyId: 'sawit_makmur_1',
      estate: 'Makmur Estate',
      permissions: ROLE_PERMISSIONS['MANAGER'],
      createdAt: new Date('2024-01-05'),
      lastLogin: new Date(),
      employeeId: 'MGR003',
      phoneNumber: '081234567060',
      position: 'Manager Estate Makmur',
      status: 'active',
      notes: 'Manager estate dengan pengalaman sustainability',
      assignedEstates: ['estate_makmur_1'],
      assignedEstateNames: ['Makmur Estate'],
    },
  },

  // ASISTEN - PT Sawit Makmur
  'asisten-sawit@agrinova.com': {
    password: 'asisten123',
    user: {
      id: 'ast_sm_1',
      email: 'asisten-sawit@agrinova.com',
      name: 'Rina Amelia',
      role: 'ASISTEN',
      avatar: '/avatars/asisten3.jpg',
      company: 'PT Sawit Makmur',
      companyId: 'sawit_makmur_1',
      estate: 'Makmur Estate',
      divisi: 'Divisi 1',
      permissions: ROLE_PERMISSIONS['ASISTEN'],
      createdAt: new Date('2024-01-10'),
      lastLogin: new Date(),
      employeeId: 'AST003',
      phoneNumber: '081234567070',
      position: 'Asisten Kebun',
      status: 'active',
      notes: 'Asisten dengan spesialisasi quality management',
      assignedDivisions: ['div_makmur_1_1'],
      assignedDivisionNames: ['Divisi 1'],
    },
  },

  // MANDOR - PT Sawit Makmur
  'mandor-sawit@agrinova.com': {
    password: 'mandor123',
    user: {
      id: 'mdr_sm_1',
      email: 'mandor-sawit@agrinova.com',
      name: 'Eko Prasetyo',
      role: 'MANDOR',
      avatar: '/avatars/mandor3.jpg',
      company: 'PT Sawit Makmur',
      companyId: 'sawit_makmur_1',
      estate: 'Makmur Estate',
      divisi: 'Divisi 1',
      permissions: ROLE_PERMISSIONS['MANDOR'],
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date(),
      employeeId: 'MDR003',
      phoneNumber: '081234567080',
      position: 'Mandor Panen',
      status: 'active',
      notes: 'Mandor dengan keahlian modern harvesting',
    },
  },

  // SATPAM - PT Sawit Makmur
  'satpam-sawit@agrinova.com': {
    password: 'satpam123',
    user: {
      id: 'sat_sm_1',
      email: 'satpam-sawit@agrinova.com',
      name: 'Agus Salim',
      role: 'SATPAM',
      avatar: '/avatars/satpam3.jpg',
      company: 'PT Sawit Makmur',
      companyId: 'sawit_makmur_1',
      estate: 'Makmur Estate',
      permissions: ROLE_PERMISSIONS['SATPAM'],
      createdAt: new Date('2024-01-20'),
      lastLogin: new Date(),
      employeeId: 'SAT003',
      phoneNumber: '081234567090',
      position: 'Satpam Gate',
      status: 'active',
      notes: 'Security officer dengan pengalaman IT gate system',
    },
  },

  // ================================================
  // PT PALM JAYA USERS (companyId: 'palm_jaya_1')
  // ================================================

  // MANAGERS - PT Palm Jaya
  'manager-palm@agrinova.com': {
    password: 'manager123',
    user: {
      id: 'mgr_pj_1',
      email: 'manager-palm@agrinova.com',
      name: 'Yusuf Ibrahim',
      role: 'MANAGER',
      avatar: '/avatars/manager4.jpg',
      company: 'PT Palm Jaya',
      companyId: 'palm_jaya_1',
      estate: 'Palm Central',
      permissions: ROLE_PERMISSIONS['MANAGER'],
      createdAt: new Date('2024-01-05'),
      lastLogin: new Date(),
      employeeId: 'MGR004',
      phoneNumber: '081234567100',
      position: 'Manager Estate Palm Central',
      status: 'active',
      notes: 'Manager dengan background engineering',
      assignedEstates: ['estate_palm_central_1'],
      assignedEstateNames: ['Palm Central'],
    },
  },

  // ASISTEN - PT Palm Jaya
  'asisten-palm@agrinova.com': {
    password: 'asisten123',
    user: {
      id: 'ast_pj_1',
      email: 'asisten-palm@agrinova.com',
      name: 'Maya Sari',
      role: 'ASISTEN',
      avatar: '/avatars/asisten4.jpg',
      company: 'PT Palm Jaya',
      companyId: 'palm_jaya_1',
      estate: 'Palm Central',
      divisi: 'North Division',
      permissions: ROLE_PERMISSIONS['ASISTEN'],
      createdAt: new Date('2024-01-10'),
      lastLogin: new Date(),
      employeeId: 'AST004',
      phoneNumber: '081234567110',
      position: 'Asisten Kebun',
      status: 'active',
      notes: 'Asisten dengan background agronomy',
      assignedDivisions: ['div_palm_central_north_1'],
      assignedDivisionNames: ['North Division'],
    },
  },

  // MANDOR - PT Palm Jaya
  'mandor-palm@agrinova.com': {
    password: 'mandor123',
    user: {
      id: 'mdr_pj_1',
      email: 'mandor-palm@agrinova.com',
      name: 'Dedi Kurniawan',
      role: 'MANDOR',
      avatar: '/avatars/mandor4.jpg',
      company: 'PT Palm Jaya',
      companyId: 'palm_jaya_1',
      estate: 'Palm Central',
      divisi: 'North Division',
      permissions: ROLE_PERMISSIONS['MANDOR'],
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date(),
      employeeId: 'MDR004',
      phoneNumber: '081234567120',
      position: 'Mandor Panen',
      status: 'active',
      notes: 'Mandor dengan sertifikasi RSPO',
    },
  },

  // SATPAM - PT Palm Jaya
  'satpam-palm@agrinova.com': {
    password: 'satpam123',
    user: {
      id: 'sat_pj_1',
      email: 'satpam-palm@agrinova.com',
      name: 'Hendra Gunawan',
      role: 'SATPAM',
      avatar: '/avatars/satpam4.jpg',
      company: 'PT Palm Jaya',
      companyId: 'palm_jaya_1',
      estate: 'Palm Central',
      permissions: ROLE_PERMISSIONS['SATPAM'],
      createdAt: new Date('2024-01-20'),
      lastLogin: new Date(),
      employeeId: 'SAT004',
      phoneNumber: '081234567130',
      position: 'Satpam Gate',
      status: 'active',
      notes: 'Security dengan background military',
    },
  },

  // ================================================
  // LEGACY COMPATIBILITY USERS (for backward compatibility)
  // ================================================

  // Legacy admin user
  'admin': {
    password: 'admin123',
    user: {
      id: 'admin_legacy',
      email: 'admin@agrinova.com',
      name: 'Administrator Legacy',
      role: 'SUPER_ADMIN',
      avatar: '/avatars/admin.jpg',
      company: 'Agrinova System',
      companyId: 'system',
      permissions: ROLE_PERMISSIONS['SUPER_ADMIN'],
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date(),
      employeeId: 'LEG001',
      phoneNumber: '+628123456789',
      position: 'Legacy Administrator',
      status: 'active',
      notes: 'Legacy admin user for backward compatibility',
    },
  },

  // Legacy role-based quick access users
  'manager': {
    password: 'admin123',
    user: {
      id: 'manager_legacy',
      email: 'manager@agrinova.com',
      name: 'Manager Legacy',
      role: 'MANAGER',
      avatar: '/avatars/manager.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      permissions: ROLE_PERMISSIONS['MANAGER'],
      createdAt: new Date('2024-01-10'),
      lastLogin: new Date(),
      employeeId: 'LEG002',
      phoneNumber: '+628123456780',
      position: 'Legacy Manager',
      status: 'active',
      notes: 'Legacy manager for quick testing',
      assignedEstates: ['estate_sawit_jaya_1'],
      assignedEstateNames: ['Sawit Jaya'],
    },
  },

  'asisten': {
    password: 'admin123',
    user: {
      id: 'asisten_legacy',
      email: 'asisten@agrinova.com',
      name: 'Asisten Legacy',
      role: 'ASISTEN',
      avatar: '/avatars/asisten.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      divisi: 'Divisi A',
      permissions: ROLE_PERMISSIONS['ASISTEN'],
      createdAt: new Date('2024-01-12'),
      lastLogin: new Date(),
      employeeId: 'LEG003',
      phoneNumber: '+628123456781',
      position: 'Legacy Asisten',
      status: 'active',
      notes: 'Legacy asisten for quick testing',
      assignedDivisions: ['div_sawit_jaya_a_1'],
      assignedDivisionNames: ['Divisi A'],
    },
  },

  'mandor': {
    password: 'admin123',
    user: {
      id: 'mandor_legacy',
      email: 'mandor@agrinova.com',
      name: 'Mandor Legacy',
      role: 'MANDOR',
      avatar: '/avatars/mandor.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      divisi: 'Divisi A',
      permissions: ROLE_PERMISSIONS['MANDOR'],
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date(),
      employeeId: 'LEG004',
      phoneNumber: '+628123456782',
      position: 'Legacy Mandor',
      status: 'active',
      notes: 'Legacy mandor for quick testing',
    },
  },

  'satpam': {
    password: 'admin123',
    user: {
      id: 'satpam_legacy',
      email: 'satpam@agrinova.com',
      name: 'Satpam Legacy',
      role: 'SATPAM',
      avatar: '/avatars/satpam.jpg',
      company: 'PT Agrinova Sentosa',
      companyId: 'agrinova_1',
      estate: 'Sawit Jaya',
      permissions: ROLE_PERMISSIONS['SATPAM'],
      createdAt: new Date('2024-01-16'),
      lastLogin: new Date(),
      employeeId: 'LEG005',
      phoneNumber: '+628123456783',
      position: 'Legacy Satpam',
      status: 'active',
      notes: 'Legacy satpam for quick testing',
    },
  },
};

export const mockAuthService = {
  // Authentication methods
  async login(credentials: LoginFormData): Promise<LoginResponse> {
    await delay(1500);
    
    const userKey = credentials.email.toLowerCase();
    const userEntry = mockUsers[userKey];
    
    if (!userEntry || userEntry.password !== credentials.password) {
      return {
        success: false,
        message: 'Email atau password salah',
        errors: {
          email: ['Email tidak terdaftar'],
          password: ['Password salah']
        }
      };
    }

    const user = userEntry.user;
    const session: AuthSession = {
      user,
      accessToken: `mock_token_${user.id}_${Date.now()}`,
      refreshToken: `mock_refresh_${user.id}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    // Update last login
    user.lastLogin = new Date();

    return {
      success: true,
      message: 'Login berhasil',
      data: session
    };
  },

  async logout(): Promise<void> {
    await delay(500);
    // Mock logout - in real app would invalidate tokens
  },

  async refreshToken(refreshToken: string): Promise<AuthSession | null> {
    await delay(800);
    // Mock refresh - would validate and return new tokens
    return null;
  },

  async getCurrentUser(token: string): Promise<User | null> {
    await delay(600);
    // Mock current user lookup by token
    return Object.values(mockUsers).map(u => u.user)[0] || null;
  },

  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    await delay(1200);
    return {
      success: true,
      message: 'Link reset password telah dikirim ke email Anda'
    };
  },

  // User Management Functions
  async getAllUsers(): Promise<User[]> {
    await delay(800);
    return Object.values(mockUsers).map(u => ({
      ...u.user,
      status: u.user.status || 'active'
    }));
  },

  async getUserById(id: string): Promise<User | null> {
    await delay(500);
    const user = Object.values(mockUsers).find(u => u.user.id === id);
    return user ? { ...user.user, status: user.user.status || 'active' } : null;
  },

  async createUser(userData: Partial<User>): Promise<User> {
    await delay(1200);
    
    const newUser: User = {
      id: `user_${Date.now()}`,
      email: userData.email || '',
      name: userData.name || '',
      role: userData.role || 'MANDOR',
      avatar: userData.avatar,
      company: userData.company,
      companyId: userData.companyId,
      estate: userData.estate,
      divisi: userData.divisi,
      permissions: userData.permissions || ROLE_PERMISSIONS[userData.role || 'MANDOR'],
      createdAt: new Date(),
      lastLogin: undefined,
      employeeId: userData.employeeId,
      phoneNumber: userData.phoneNumber,
      position: userData.position,
      status: userData.status || 'active',
      notes: userData.notes,
      // Multi-assignment fields
      assignedEstates: userData.assignedEstates,
      assignedEstateNames: userData.assignedEstateNames,
      assignedDivisions: userData.assignedDivisions,
      assignedDivisionNames: userData.assignedDivisionNames,
      assignedCompanies: userData.assignedCompanies,
      assignedCompanyNames: userData.assignedCompanyNames,
    };

    return newUser;
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    await delay(1000);
    
    const existingUserEntry = Object.values(mockUsers).find(u => u.user.id === id);
    if (!existingUserEntry) {
      throw new Error('User tidak ditemukan');
    }

    const updatedUser: User = {
      ...existingUserEntry.user,
      ...userData,
      id, // Preserve ID
    };

    return updatedUser;
  },

  async deleteUser(id: string): Promise<boolean> {
    await delay(800);
    // Mock deletion - would remove from database
    return true;
  },

  async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<User> {
    await delay(600);
    
    const existingUserEntry = Object.values(mockUsers).find(u => u.user.id === id);
    if (!existingUserEntry) {
      throw new Error('User tidak ditemukan');
    }

    const updatedUser: User = {
      ...existingUserEntry.user,
      status,
    };

    return updatedUser;
  },

  // User search and filtering
  async searchUsers(query: string, filters?: {
    role?: UserRole;
    company?: string;
    estate?: string;
    status?: string;
  }): Promise<User[]> {
    await delay(600);
    
    let users = Object.values(mockUsers).map(u => ({
      ...u.user,
      status: u.user.status || 'active'
    }));

    // Apply search query
    if (query) {
      users = users.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.employeeId?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply filters
    if (filters) {
      if (filters.role) {
        users = users.filter(user => user.role === filters.role);
      }
      if (filters.company) {
        users = users.filter(user => user.company === filters.company);
      }
      if (filters.estate) {
        users = users.filter(user => user.estate === filters.estate);
      }
      if (filters.status) {
        users = users.filter(user => user.status === filters.status);
      }
    }

    return users;
  },

  // Company and organizational data
  async getCompanies(): Promise<Array<{ id: string; name: string; userCount: number }>> {
    await delay(500);
    
    const users = Object.values(mockUsers).map(u => u.user);
    const companies = [
      { id: 'agrinova_1', name: 'PT Agrinova Sentosa' },
      { id: 'sawit_makmur_1', name: 'PT Sawit Makmur' },
      { id: 'palm_jaya_1', name: 'PT Palm Jaya' }
    ];

    return companies.map(company => ({
      ...company,
      userCount: users.filter(u => u.companyId === company.id).length
    }));
  },

  async getEstatesByCompany(companyId: string): Promise<Array<{ id: string; name: string; userCount: number }>> {
    await delay(400);
    
    const users = Object.values(mockUsers).map(u => u.user);
    let estates: Array<{ id: string; name: string }> = [];

    switch (companyId) {
      case 'agrinova_1':
        estates = [
          { id: 'estate_sawit_jaya_1', name: 'Sawit Jaya' },
          { id: 'estate_sawit_indah_1', name: 'Sawit Indah' },
          { id: 'estate_perkebunan_utara_1', name: 'Perkebunan Utara' }
        ];
        break;
      case 'sawit_makmur_1':
        estates = [
          { id: 'estate_makmur_1', name: 'Makmur Estate' },
          { id: 'estate_sukses_1', name: 'Sukses Estate' }
        ];
        break;
      case 'palm_jaya_1':
        estates = [
          { id: 'estate_palm_central_1', name: 'Palm Central' },
          { id: 'estate_palm_timur_1', name: 'Palm Timur' }
        ];
        break;
    }

    return estates.map(estate => ({
      ...estate,
      userCount: users.filter(u => u.companyId === companyId && u.estate === estate.name).length
    }));
  },

  // QR Code Login methods
  async generateQRCode(): Promise<{
    success: boolean;
    sessionId?: string;
    expiresAt?: Date;
    message?: string;
  }> {
    await delay(800);
    
    const sessionId = `qr_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    return {
      success: true,
      sessionId,
      expiresAt
    };
  },

  async checkQRLogin(sessionId: string): Promise<{
    status: 'pending' | 'approved' | 'expired';
    user?: User;
    accessToken?: string;
    message?: string;
  }> {
    await delay(500);
    
    // Mock QR login check - in real app would check if mobile app has approved the session
    // For demo purposes, we'll simulate different scenarios based on session age
    const sessionTimestamp = sessionId.split('_')[2];
    const sessionAge = Date.now() - parseInt(sessionTimestamp);
    
    // Simulate session expiry after 5 minutes
    if (sessionAge > 5 * 60 * 1000) {
      return { status: 'expired' };
    }
    
    // For demo, randomly simulate approval after 10 seconds
    if (sessionAge > 10000 && Math.random() > 0.7) {
      // Simulate successful QR login with a default user
      const defaultUser = mockUsers['manager-agrinova@agrinova.com'].user;
      return {
        status: 'approved',
        user: defaultUser,
        accessToken: `qr_token_${defaultUser.id}_${Date.now()}`
      };
    }
    
    return { status: 'pending' };
  },
};