import { Company, Estate, Divisi, Block, CompanyAdmin, User, ROLE_PERMISSIONS } from '@/types/auth';

// Mock companies - aligned with auth mock data
export const mockCompanies: Company[] = [
  {
    id: 'agrinova_1',
    code: 'AGR001',
    name: 'PT Agrinova Sentosa',
    description: 'Perusahaan perkebunan kelapa sawit terdepan di Indonesia',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'super_1',
  },
  {
    id: 'sawit_makmur_1',
    code: 'SM001',
    name: 'PT Sawit Makmur',
    description: 'Perusahaan perkebunan kelapa sawit dengan fokus sustainability',
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    createdBy: 'super_1',
  },
  {
    id: 'palm_jaya_1',
    code: 'PJ001',
    name: 'PT Palm Jaya',
    description: 'Perusahaan perkebunan kelapa sawit dengan teknologi modern',
    isActive: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    createdBy: 'super_1',
  },
];

// Mock estates - aligned with auth mock data
export const mockEstates: Estate[] = [
  // PT Agrinova Sentosa Estates
  {
    id: 'estate_sawit_jaya_1',
    companyId: 'agrinova_1',
    code: 'AGR01',
    name: 'Sawit Jaya',
    description: 'Estate utama PT Agrinova Sentosa dengan luas 8000 hektar',
    location: 'Sumatera Utara, Indonesia',
    area: 8000,
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: 'estate_sawit_indah_1',
    companyId: 'agrinova_1',
    code: 'AGR02',
    name: 'Sawit Indah',
    description: 'Estate kedua PT Agrinova Sentosa dengan luas 6500 hektar',
    location: 'Sumatera Selatan, Indonesia',
    area: 6500,
    isActive: true,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-06'),
  },
  {
    id: 'estate_perkebunan_utara_1',
    companyId: 'agrinova_1',
    code: 'AGR03',
    name: 'Perkebunan Utara',
    description: 'Estate ketiga PT Agrinova Sentosa di wilayah utara',
    location: 'Aceh, Indonesia',
    area: 5200,
    isActive: true,
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-07'),
  },
  // PT Sawit Makmur Estates
  {
    id: 'estate_makmur_1',
    companyId: 'sawit_makmur_1',
    code: 'SM01',
    name: 'Makmur Estate',
    description: 'Estate utama PT Sawit Makmur dengan produktivitas tinggi',
    location: 'Riau, Indonesia',
    area: 5500,
    isActive: true,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08'),
  },
  {
    id: 'estate_sukses_1',
    companyId: 'sawit_makmur_1',
    code: 'SM02',
    name: 'Sukses Estate',
    description: 'Estate kedua PT Sawit Makmur di kawasan strategis',
    location: 'Jambi, Indonesia',
    area: 4800,
    isActive: true,
    createdAt: new Date('2024-01-09'),
    updatedAt: new Date('2024-01-09'),
  },
  // PT Palm Jaya Estates
  {
    id: 'estate_palm_central_1',
    companyId: 'palm_jaya_1',
    code: 'PJ01',
    name: 'Palm Central',
    description: 'Estate unggulan PT Palm Jaya dengan teknologi modern',
    location: 'Kalimantan Tengah, Indonesia',
    area: 7200,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'estate_palm_timur_1',
    companyId: 'palm_jaya_1',
    code: 'PJ02',
    name: 'Palm Timur',
    description: 'Estate ekspansi PT Palm Jaya dengan potensi besar',
    location: 'Kalimantan Timur, Indonesia',
    area: 5900,
    isActive: true,
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
  },
];

// Mock divisions - aligned with auth mock data
export const mockDivisions: Divisi[] = [
  // PT Agrinova Sentosa - Sawit Jaya Estate Divisions
  {
    id: 'div_sawit_jaya_a_1',
    estateId: 'estate_sawit_jaya_1',
    code: 'DIV-A',
    name: 'Divisi A',
    description: 'Divisi utama Estate Sawit Jaya',
    area: 3200,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'div_sawit_jaya_b_1',
    estateId: 'estate_sawit_jaya_1',
    code: 'DIV-B',
    name: 'Divisi B',
    description: 'Divisi kedua Estate Sawit Jaya',
    area: 2800,
    isActive: true,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: 'div_sawit_jaya_c_1',
    estateId: 'estate_sawit_jaya_1',
    code: 'DIV-C',
    name: 'Divisi C',
    description: 'Divisi ketiga Estate Sawit Jaya',
    area: 2000,
    isActive: true,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
  },
  // PT Agrinova Sentosa - Sawit Indah Estate Divisions
  {
    id: 'div_sawit_indah_a_1',
    estateId: 'estate_sawit_indah_1',
    code: 'DIV-A',
    name: 'Divisi A',
    description: 'Divisi utama Estate Sawit Indah',
    area: 3250,
    isActive: true,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: 'div_sawit_indah_b_1',
    estateId: 'estate_sawit_indah_1',
    code: 'DIV-B',
    name: 'Divisi B',
    description: 'Divisi kedua Estate Sawit Indah',
    area: 3250,
    isActive: true,
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-19'),
  },
  // PT Agrinova Sentosa - Perkebunan Utara Estate Divisions
  {
    id: 'div_perkebunan_utara_a_1',
    estateId: 'estate_perkebunan_utara_1',
    code: 'DIV-A',
    name: 'Divisi A',
    description: 'Divisi strategis Estate Perkebunan Utara',
    area: 2600,
    isActive: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  // PT Sawit Makmur - Makmur Estate Divisions
  {
    id: 'div_makmur_1_1',
    estateId: 'estate_makmur_1',
    code: 'DIV-1',
    name: 'Divisi 1',
    description: 'Divisi teknologi Estate Makmur',
    area: 2750,
    isActive: true,
    createdAt: new Date('2024-01-21'),
    updatedAt: new Date('2024-01-21'),
  },
  {
    id: 'div_makmur_2_1',
    estateId: 'estate_makmur_1',
    code: 'DIV-2',
    name: 'Divisi 2',
    description: 'Divisi inovasi Estate Makmur',
    area: 2750,
    isActive: true,
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-22'),
  },
  // PT Sawit Makmur - Sukses Estate Divisions
  {
    id: 'div_sukses_1_1',
    estateId: 'estate_sukses_1',
    code: 'DIV-1',
    name: 'Divisi 1',
    description: 'Divisi utama Estate Sukses',
    area: 2400,
    isActive: true,
    createdAt: new Date('2024-01-23'),
    updatedAt: new Date('2024-01-23'),
  },
  // PT Palm Jaya - Palm Central Estate Divisions
  {
    id: 'div_palm_central_north_1',
    estateId: 'estate_palm_central_1',
    code: 'NORTH',
    name: 'North Division',
    description: 'Divisi utara Estate Palm Central',
    area: 3600,
    isActive: true,
    createdAt: new Date('2024-01-24'),
    updatedAt: new Date('2024-01-24'),
  },
  {
    id: 'div_palm_central_south_1',
    estateId: 'estate_palm_central_1',
    code: 'SOUTH',
    name: 'South Division',
    description: 'Divisi selatan Estate Palm Central',
    area: 3600,
    isActive: true,
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-25'),
  },
  // PT Palm Jaya - Palm Timur Estate Divisions
  {
    id: 'div_palm_timur_north_1',
    estateId: 'estate_palm_timur_1',
    code: 'NORTH',
    name: 'North Division',
    description: 'Divisi utara Estate Palm Timur',
    area: 2950,
    isActive: true,
    createdAt: new Date('2024-01-26'),
    updatedAt: new Date('2024-01-26'),
  },
  {
    id: 'div_palm_timur_south_1',
    estateId: 'estate_palm_timur_1',
    code: 'SOUTH',
    name: 'South Division',
    description: 'Divisi selatan Estate Palm Timur',
    area: 2950,
    isActive: true,
    createdAt: new Date('2024-01-27'),
    updatedAt: new Date('2024-01-27'),
  },
];

// Mock blocks
export const mockBlocks: Block[] = [
  {
    id: 'block_1',
    divisiId: 'divisi_1',
    code: 'A001',
    name: 'Blok A001',
    description: 'Blok pertama Divisi A',
    area: 50,
    plantingYear: 2015,
    palmCount: 450,
    varietyType: 'Tenera',
    isActive: true,
    latitude: -0.5,
    longitude: 101.5,
    elevation: 25,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'block_2',
    divisiId: 'divisi_1',
    code: 'A002',
    name: 'Blok A002',
    description: 'Blok kedua Divisi A',
    area: 45,
    plantingYear: 2016,
    palmCount: 410,
    varietyType: 'Tenera',
    isActive: true,
    latitude: -0.51,
    longitude: 101.51,
    elevation: 30,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: 'block_3',
    divisiId: 'divisi_1',
    code: 'A003',
    name: 'Blok A003',
    description: 'Blok ketiga Divisi A',
    area: 48,
    plantingYear: 2014,
    palmCount: 435,
    varietyType: 'Dura',
    isActive: true,
    latitude: -0.49,
    longitude: 101.49,
    elevation: 22,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: 'block_4',
    divisiId: 'divisi_2',
    code: 'B001',
    name: 'Blok B001',
    description: 'Blok pertama Divisi B',
    area: 52,
    plantingYear: 2017,
    palmCount: 470,
    varietyType: 'Tenera',
    isActive: true,
    latitude: -0.48,
    longitude: 101.52,
    elevation: 28,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: 'block_5',
    divisiId: 'divisi_2',
    code: 'B002',
    name: 'Blok B002',
    description: 'Blok kedua Divisi B',
    area: 46,
    plantingYear: 2015,
    palmCount: 420,
    varietyType: 'Tenera',
    isActive: true,
    latitude: -0.47,
    longitude: 101.53,
    elevation: 26,
    createdAt: new Date('2024-01-19'),
    updatedAt: new Date('2024-01-19'),
  },
];

// Use users from auth service - import them from mock-auth
import { mockAuthService } from '@/lib/auth/mock-auth';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockCompanyDataService = {
  // Company management
  async getCompanies(): Promise<Company[]> {
    await delay(800);
    return mockCompanies;
  },

  async getCompanyById(id: string): Promise<Company | null> {
    await delay(500);
    return mockCompanies.find(company => company.id === id) || null;
  },

  async createCompany(companyData: Partial<Company>): Promise<Company> {
    await delay(1200);

    if (!companyData.code || !companyData.name) {
      throw new Error('Kode dan nama perusahaan wajib diisi');
    }

    // Check if code already exists
    const existingCompany = mockCompanies.find(c => c.code === companyData.code);
    if (existingCompany) {
      throw new Error('Kode perusahaan sudah digunakan');
    }

    const newCompany: Company = {
      id: `company_${Date.now()}`,
      code: companyData.code,
      name: companyData.name,
      description: companyData.description,
      isActive: companyData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: companyData.createdBy,
    };

    mockCompanies.push(newCompany);
    return newCompany;
  },

  async updateCompany(id: string, companyData: Partial<Company>): Promise<Company> {
    await delay(1000);

    const companyIndex = mockCompanies.findIndex(company => company.id === id);
    if (companyIndex === -1) {
      throw new Error('Perusahaan tidak ditemukan');
    }

    // Check if code change conflicts
    if (companyData.code) {
      const existingCompany = mockCompanies.find(c => c.code === companyData.code && c.id !== id);
      if (existingCompany) {
        throw new Error('Kode perusahaan sudah digunakan');
      }
    }

    const updatedCompany: Company = {
      ...mockCompanies[companyIndex],
      ...companyData,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    mockCompanies[companyIndex] = updatedCompany;
    return updatedCompany;
  },

  async deleteCompany(id: string): Promise<void> {
    await delay(800);

    const companyIndex = mockCompanies.findIndex(company => company.id === id);
    if (companyIndex === -1) {
      throw new Error('Perusahaan tidak ditemukan');
    }

    // Check if company has estates
    const hasEstates = mockEstates.some(estate => estate.companyId === id);
    if (hasEstates) {
      throw new Error('Tidak dapat menghapus perusahaan yang masih memiliki estate');
    }

    mockCompanies.splice(companyIndex, 1);
  },

  // Estate management
  async getEstatesByCompany(companyId: string): Promise<Estate[]> {
    await delay(600);
    return mockEstates.filter(estate => estate.companyId === companyId);
  },

  async createEstate(estateData: Partial<Estate>): Promise<Estate> {
    await delay(1200);

    if (!estateData.companyId || !estateData.code || !estateData.name) {
      throw new Error('Company ID, kode, dan nama estate wajib diisi');
    }

    // Check if code already exists in company
    const existingEstate = mockEstates.find(e => 
      e.code === estateData.code && e.companyId === estateData.companyId
    );
    if (existingEstate) {
      throw new Error('Kode estate sudah digunakan dalam perusahaan ini');
    }

    const newEstate: Estate = {
      id: `estate_${Date.now()}`,
      companyId: estateData.companyId,
      code: estateData.code,
      name: estateData.name,
      description: estateData.description,
      location: estateData.location,
      area: estateData.area,
      isActive: estateData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockEstates.push(newEstate);
    return newEstate;
  },

  async updateEstate(id: string, estateData: Partial<Estate>): Promise<Estate> {
    await delay(1000);

    const estateIndex = mockEstates.findIndex(estate => estate.id === id);
    if (estateIndex === -1) {
      throw new Error('Estate tidak ditemukan');
    }

    const currentEstate = mockEstates[estateIndex];

    // Check if code change conflicts
    if (estateData.code) {
      const existingEstate = mockEstates.find(e => 
        e.code === estateData.code && 
        e.companyId === currentEstate.companyId && 
        e.id !== id
      );
      if (existingEstate) {
        throw new Error('Kode estate sudah digunakan dalam perusahaan ini');
      }
    }

    const updatedEstate: Estate = {
      ...currentEstate,
      ...estateData,
      id, // Ensure ID doesn't change
      companyId: currentEstate.companyId, // Ensure company doesn't change
      updatedAt: new Date(),
    };

    mockEstates[estateIndex] = updatedEstate;
    return updatedEstate;
  },

  async deleteEstate(id: string): Promise<void> {
    await delay(800);

    const estateIndex = mockEstates.findIndex(estate => estate.id === id);
    if (estateIndex === -1) {
      throw new Error('Estate tidak ditemukan');
    }

    // Check if estate has divisions
    const hasDivisions = mockDivisions.some(divisi => divisi.estateId === id);
    if (hasDivisions) {
      throw new Error('Tidak dapat menghapus estate yang masih memiliki divisi');
    }

    mockEstates.splice(estateIndex, 1);
  },

  // Division management
  async getDivisionsByEstate(estateId: string): Promise<Divisi[]> {
    await delay(600);
    return mockDivisions.filter(divisi => divisi.estateId === estateId);
  },

  async getDivisionsByCompany(companyId: string): Promise<Divisi[]> {
    await delay(800);
    const companyEstates = mockEstates.filter(estate => estate.companyId === companyId);
    const estateIds = companyEstates.map(estate => estate.id);
    return mockDivisions.filter(divisi => estateIds.includes(divisi.estateId));
  },

  async createDivision(divisionData: Partial<Divisi>): Promise<Divisi> {
    await delay(1200);

    if (!divisionData.estateId || !divisionData.code || !divisionData.name) {
      throw new Error('Estate ID, kode, dan nama divisi wajib diisi');
    }

    // Check if code already exists in estate
    const existingDivision = mockDivisions.find(d => 
      d.code === divisionData.code && d.estateId === divisionData.estateId
    );
    if (existingDivision) {
      throw new Error('Kode divisi sudah digunakan dalam estate ini');
    }

    const newDivision: Divisi = {
      id: `divisi_${Date.now()}`,
      estateId: divisionData.estateId,
      code: divisionData.code,
      name: divisionData.name,
      description: divisionData.description,
      area: divisionData.area,
      isActive: divisionData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDivisions.push(newDivision);
    return newDivision;
  },

  async updateDivision(id: string, divisionData: Partial<Divisi>): Promise<Divisi> {
    await delay(1000);

    const divisionIndex = mockDivisions.findIndex(divisi => divisi.id === id);
    if (divisionIndex === -1) {
      throw new Error('Divisi tidak ditemukan');
    }

    const currentDivision = mockDivisions[divisionIndex];

    // Check if code change conflicts
    if (divisionData.code) {
      const existingDivision = mockDivisions.find(d => 
        d.code === divisionData.code && 
        d.estateId === currentDivision.estateId && 
        d.id !== id
      );
      if (existingDivision) {
        throw new Error('Kode divisi sudah digunakan dalam estate ini');
      }
    }

    const updatedDivision: Divisi = {
      ...currentDivision,
      ...divisionData,
      id, // Ensure ID doesn't change
      estateId: currentDivision.estateId, // Ensure estate doesn't change
      updatedAt: new Date(),
    };

    mockDivisions[divisionIndex] = updatedDivision;
    return updatedDivision;
  },

  async deleteDivision(id: string): Promise<void> {
    await delay(800);

    const divisionIndex = mockDivisions.findIndex(divisi => divisi.id === id);
    if (divisionIndex === -1) {
      throw new Error('Divisi tidak ditemukan');
    }

    // Check if division has blocks
    const hasBlocks = mockBlocks.some(block => block.divisiId === id);
    if (hasBlocks) {
      throw new Error('Tidak dapat menghapus divisi yang masih memiliki blok');
    }

    mockDivisions.splice(divisionIndex, 1);
  },

  // Block management
  async getBlocksByDivision(divisionId: string): Promise<Block[]> {
    await delay(600);
    return mockBlocks.filter(block => block.divisiId === divisionId);
  },

  async getBlocksByCompany(companyId: string): Promise<Block[]> {
    await delay(800);
    const companyEstates = mockEstates.filter(estate => estate.companyId === companyId);
    const estateIds = companyEstates.map(estate => estate.id);
    const companyDivisions = mockDivisions.filter(divisi => estateIds.includes(divisi.estateId));
    const divisionIds = companyDivisions.map(divisi => divisi.id);
    return mockBlocks.filter(block => divisionIds.includes(block.divisiId));
  },

  async createBlock(blockData: Partial<Block>): Promise<Block> {
    await delay(1200);

    if (!blockData.divisiId || !blockData.code || !blockData.name) {
      throw new Error('Division ID, kode, dan nama blok wajib diisi');
    }

    // Check if code already exists in division
    const existingBlock = mockBlocks.find(b => 
      b.code === blockData.code && b.divisiId === blockData.divisiId
    );
    if (existingBlock) {
      throw new Error('Kode blok sudah digunakan dalam divisi ini');
    }

    const newBlock: Block = {
      id: `block_${Date.now()}`,
      divisiId: blockData.divisiId,
      code: blockData.code,
      name: blockData.name,
      description: blockData.description,
      area: blockData.area,
      plantingYear: blockData.plantingYear,
      palmCount: blockData.palmCount,
      varietyType: blockData.varietyType,
      isActive: blockData.isActive ?? true,
      latitude: blockData.latitude,
      longitude: blockData.longitude,
      elevation: blockData.elevation,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockBlocks.push(newBlock);
    return newBlock;
  },

  // User management - delegate to auth service for consistency
  async getUsers(): Promise<User[]> {
    return await mockAuthService.getAllUsers();
  },

  async getUserById(id: string): Promise<User | null> {
    return await mockAuthService.getUserById(id);
  },

  async getUsersByRole(role: string): Promise<User[]> {
    const allUsers = await mockAuthService.getAllUsers();
    return allUsers.filter(user => user.role === role && (user.status || 'active') === 'active');
  },

  async getAreaManagersForManagerAssignment(companyId?: string): Promise<User[]> {
    await delay(700);
    
    const allUsers = await mockAuthService.getAllUsers();
    
    // Get all active Area Managers
    let areaManagers = allUsers.filter(user => 
      user.role === 'AREA_MANAGER' && 
      (user.status || 'active') === 'active'
    );

    // If companyId is specified, filter Area Managers that have access to that company
    if (companyId) {
      areaManagers = areaManagers.filter(areaManager =>
        areaManager.assignedCompanies?.includes(companyId) ||
        areaManager.companyId === companyId
      );
    }

    return areaManagers;
  },

  async getDirectReportManagers(areaManagerId: string): Promise<User[]> {
    await delay(500);
    
    const allUsers = await mockAuthService.getAllUsers();
    return allUsers.filter(user =>
      user.role === 'MANAGER' &&
      user.reportingToAreaManagerId === areaManagerId &&
      (user.status || 'active') === 'active'
    );
  },

  async updateUserReportingRelationship(userId: string, reportingToAreaManagerId: string | null): Promise<User> {
    await delay(800);
    
    const allUsers = await mockAuthService.getAllUsers();
    const user = allUsers.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    if (user.role !== 'MANAGER') {
      throw new Error('Hanya Manager yang dapat memiliki reporting relationship');
    }

    if (reportingToAreaManagerId) {
      const areaManager = allUsers.find(u => u.id === reportingToAreaManagerId);
      if (!areaManager || areaManager.role !== 'AREA_MANAGER') {
        throw new Error('Area Manager tidak ditemukan atau tidak valid');
      }

      // Return updated user (in real app, this would save to database)
      return {
        ...user,
        reportingToAreaManagerId,
        reportingToAreaManagerName: areaManager.name,
      };
    } else {
      // Return updated user (in real app, this would save to database)
      return {
        ...user,
        reportingToAreaManagerId: undefined,
        reportingToAreaManagerName: undefined,
      };
    }
  },
};