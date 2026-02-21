'use client';

import * as React from 'react';
import { User, UserRole, Company, Estate, Divisi, ROLE_PERMISSIONS, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CircleAlert, Eye, EyeOff, Save, X, Building, MapPin, Grid3x3, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { HierarchicalValidationService } from '@/lib/auth/hierarchical-validation';

interface HierarchicalUserFormProps {
  user?: User;
  onSubmit: (userData: Partial<User>) => void;
  onCancel: () => void;
  restrictedToCompany?: string; // For company-admin users - restrict to their company
  allowedRoles?: UserRole[]; // Roles that can be assigned by current user
}

interface FormData {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  companyId: string;
  estateId: string;
  divisiId: string;
  employeeId: string;
  phoneNumber: string;
  position: string;
  status: 'active' | 'inactive' | 'suspended';
  notes: string;
  // Multi-assignment fields
  assignedEstates: string[];
  assignedDivisions: string[];
  assignedCompanies: string[];
  // Hierarchical Reporting
  reportingToAreaManagerId: string;
}

interface HierarchyData {
  companies: Company[];
  estates: Estate[];
  divisions: Divisi[];
  areaManagers: User[]; // Available Area Managers for Manager reporting
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif', description: 'Pengguna dapat mengakses sistem' },
  { value: 'inactive', label: 'Tidak Aktif', description: 'Pengguna tidak dapat login' },
  { value: 'suspended', label: 'Suspended', description: 'Akses ditangguhkan sementara' }
];

// Role assignment rules based on current user role
const ROLE_ASSIGNMENT_RULES: Record<UserRole, UserRole[]> = {
  'SUPER_ADMIN': ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AREA_MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
  'COMPANY_ADMIN': ['MANAGER', 'AREA_MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
  'AREA_MANAGER': ['MANAGER', 'ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
  'MANAGER': ['ASISTEN', 'MANDOR', 'SATPAM', 'TIMBANGAN', 'GRADING'],
  'ASISTEN': [],
  'MANDOR': [],
  'SATPAM': [],
  'TIMBANGAN': [],
  'GRADING': [],
};

// Determine required fields based on role
const getRoleRequirements = (role: UserRole) => {
  const requirements = {
    needsCompany: false,
    needsEstate: false,
    needsDivision: false,
    allowsMultiEstate: false,
    allowsMultiDivision: false,
    allowsMultiCompany: false,
    needsAreaManagerReporting: false,
    description: ''
  };

  switch (role) {
    case 'SUPER_ADMIN':
      requirements.description = 'Akses penuh sistem - tidak terikat ke perusahaan tertentu';
      break;
    case 'COMPANY_ADMIN':
      requirements.needsCompany = true;
      requirements.description = 'Kelola seluruh estate dan divisi dalam perusahaan yang ditugaskan';
      break;
    case 'AREA_MANAGER':
      requirements.needsCompany = true;
      requirements.allowsMultiCompany = true;
      requirements.description = 'Kelola lintas perusahaan - dapat dipilih multiple perusahaan untuk area manager';
      break;
    case 'MANAGER':
      requirements.needsCompany = true;
      requirements.needsEstate = true;
      requirements.allowsMultiEstate = true;
      requirements.needsAreaManagerReporting = true;
      requirements.description = 'Kelola beberapa estate sekaligus - harus memilih Area Manager sebagai atasan langsung';
      break;
    case 'ASISTEN':
      requirements.needsCompany = true;
      requirements.needsEstate = true;
      requirements.needsDivision = true;
      requirements.allowsMultiDivision = true;
      requirements.description = 'Mengelola beberapa divisi sekaligus - dapat dipilih multiple divisi dalam estate';
      break;
    case 'MANDOR':
      requirements.needsCompany = true;
      requirements.needsEstate = true;
      requirements.needsDivision = true;
      requirements.allowsMultiDivision = true;
      requirements.description = 'Bertanggung jawab atas divisi - dapat dipilih multiple divisi dalam estate untuk mandor';
      break;
    case 'SATPAM':
      requirements.needsCompany = true;
      requirements.needsEstate = true;
      requirements.description = 'Gate check estate tertentu - pilihan divisi opsional';
      break;
  }

  return requirements;
};

export function HierarchicalUserForm({ 
  user, 
  onSubmit, 
  onCancel, 
  restrictedToCompany,
  allowedRoles 
}: HierarchicalUserFormProps) {
  const { user: currentUser } = useAuth();
  
  const [formData, setFormData] = React.useState<FormData>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'MANDOR',
    companyId: user?.companyId || restrictedToCompany || '',
    estateId: user?.estate || '',
    divisiId: user?.divisi || '',
    employeeId: user?.employeeId || '',
    phoneNumber: user?.phoneNumber || '',
    position: user?.position || '',
    status: (user?.status as any) || 'active',
    notes: user?.notes || '',
    // Initialize multi-assignment fields
    assignedEstates: user?.assignedEstates || [],
    assignedDivisions: user?.assignedDivisions || [],
    assignedCompanies: user?.assignedCompanies || [],
    // Initialize hierarchical reporting
    reportingToAreaManagerId: user?.reportingToAreaManagerId || ''
  });

  const [hierarchyData, setHierarchyData] = React.useState<HierarchyData>({
    companies: [],
    estates: [],
    divisions: [],
    areaManagers: []
  });

  const [loading, setLoading] = React.useState({
    companies: false,
    estates: false,
    divisions: false,
    areaManagers: false
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationWarnings, setValidationWarnings] = React.useState<string[]>([]);

  // Get allowed roles for current user
  const getAllowedRoles = (): UserRole[] => {
    if (allowedRoles) return allowedRoles;
    if (!currentUser) return [];
    return ROLE_ASSIGNMENT_RULES[currentUser.role] || [];
  };

  const allowedRolesList = getAllowedRoles();
  const roleRequirements = getRoleRequirements(formData.role);

  // Load companies on mount and area managers if needed
  React.useEffect(() => {
    loadCompanies();
    if (roleRequirements.needsAreaManagerReporting) {
      loadAreaManagers();
    }
  }, []);

  // Load Area Managers when role changes to Manager
  React.useEffect(() => {
    if (roleRequirements.needsAreaManagerReporting) {
      loadAreaManagers();
    } else {
      setHierarchyData(prev => ({ ...prev, areaManagers: [] }));
      setFormData(prev => ({ ...prev, reportingToAreaManagerId: '' }));
    }
  }, [formData.role, roleRequirements.needsAreaManagerReporting]);

  // Load estates when company changes
  React.useEffect(() => {
    if (formData.companyId && roleRequirements.needsEstate) {
      loadEstates(formData.companyId);
    } else {
      setHierarchyData(prev => ({ ...prev, estates: [], divisions: [] }));
      setFormData(prev => ({ ...prev, estateId: '', divisiId: '' }));
    }
  }, [formData.companyId, roleRequirements.needsEstate]);

  // Load divisions when estate changes or when multi-estate assignments change
  React.useEffect(() => {
    if (roleRequirements.allowsMultiDivision) {
      // For multi-division roles (Asisten, Mandor), load divisions from assigned estates
      if (formData.assignedEstates.length > 0) {
        loadDivisionsFromMultipleEstates(formData.assignedEstates);
      } else if (formData.estateId) {
        // Fallback to single estate if no multi-estates selected but estate is selected
        loadDivisions(formData.estateId);
      } else {
        setHierarchyData(prev => ({ ...prev, divisions: [] }));
        setFormData(prev => ({ ...prev, assignedDivisions: [] }));
      }
    } else if (formData.estateId && roleRequirements.needsDivision) {
      // For single-division roles
      loadDivisions(formData.estateId);
    } else {
      setHierarchyData(prev => ({ ...prev, divisions: [] }));
      setFormData(prev => ({ ...prev, divisiId: '', assignedDivisions: [] }));
    }
  }, [formData.estateId, formData.assignedEstates, roleRequirements.needsDivision, roleRequirements.allowsMultiDivision]);

  // Reset hierarchy when role changes
  React.useEffect(() => {
    const newRequirements = getRoleRequirements(formData.role);
    
    // Reset form fields based on new requirements
    setFormData(prev => ({
      ...prev,
      companyId: newRequirements.needsCompany ? prev.companyId : '',
      estateId: newRequirements.needsEstate ? prev.estateId : '',
      divisiId: newRequirements.needsDivision ? prev.divisiId : '',
      // Reset multi-assignment fields if role doesn't support them
      assignedEstates: newRequirements.allowsMultiEstate ? prev.assignedEstates : [],
      assignedDivisions: newRequirements.allowsMultiDivision ? prev.assignedDivisions : [],
      assignedCompanies: newRequirements.allowsMultiCompany ? prev.assignedCompanies : [],
      // Reset area manager reporting if role doesn't need it
      reportingToAreaManagerId: newRequirements.needsAreaManagerReporting ? prev.reportingToAreaManagerId : '',
    }));
  }, [formData.role]);

  // Validate reporting relationship when relevant data changes
  React.useEffect(() => {
    if (roleRequirements.needsAreaManagerReporting) {
      validateReportingRelationship();
    }
  }, [
    formData.reportingToAreaManagerId,
    formData.companyId,
    formData.assignedEstates,
    hierarchyData.estates,
    hierarchyData.companies,
    hierarchyData.areaManagers
  ]);

  const loadCompanies = async () => {
    if (restrictedToCompany) {
      // If restricted to company, get only that company
      try {
        setLoading(prev => ({ ...prev, companies: true }));
        const company = await mockCompanyDataService.getCompanyById(restrictedToCompany);
        if (company) {
          setHierarchyData(prev => ({ ...prev, companies: [company] }));
        }
      } catch (error) {
        console.error('Failed to load restricted company:', error);
      } finally {
        setLoading(prev => ({ ...prev, companies: false }));
      }
    } else {
      // Load all companies for super-admin
      try {
        setLoading(prev => ({ ...prev, companies: true }));
        const companies = await mockCompanyDataService.getCompanies();
        setHierarchyData(prev => ({ ...prev, companies }));
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoading(prev => ({ ...prev, companies: false }));
      }
    }
  };

  const loadEstates = async (companyId: string) => {
    try {
      setLoading(prev => ({ ...prev, estates: true }));
      const estates = await mockCompanyDataService.getEstatesByCompany(companyId);
      setHierarchyData(prev => ({ ...prev, estates, divisions: [] }));
    } catch (error) {
      console.error('Failed to load estates:', error);
    } finally {
      setLoading(prev => ({ ...prev, estates: false }));
    }
  };

  const loadDivisions = async (estateId: string) => {
    try {
      setLoading(prev => ({ ...prev, divisions: true }));
      const divisions = await mockCompanyDataService.getDivisionsByEstate(estateId);
      setHierarchyData(prev => ({ ...prev, divisions }));
    } catch (error) {
      console.error('Failed to load divisions:', error);
    } finally {
      setLoading(prev => ({ ...prev, divisions: false }));
    }
  };

  const loadDivisionsFromMultipleEstates = async (estateIds: string[]) => {
    try {
      setLoading(prev => ({ ...prev, divisions: true }));
      const allDivisions: Divisi[] = [];
      
      // Load divisions from all selected estates
      for (const estateId of estateIds) {
        const divisions = await mockCompanyDataService.getDivisionsByEstate(estateId);
        allDivisions.push(...divisions);
      }
      
      setHierarchyData(prev => ({ ...prev, divisions: allDivisions }));
    } catch (error) {
      console.error('Failed to load divisions from multiple estates:', error);
    } finally {
      setLoading(prev => ({ ...prev, divisions: false }));
    }
  };

  const loadAreaManagers = async () => {
    try {
      setLoading(prev => ({ ...prev, areaManagers: true }));
      // Load Area Managers that have access to companies where Manager can operate
      const areaManagers = await mockCompanyDataService.getAreaManagersForManagerAssignment(formData.companyId);
      setHierarchyData(prev => ({ ...prev, areaManagers }));
    } catch (error) {
      console.error('Failed to load area managers:', error);
      // Fallback: load all active area managers
      try {
        const allUsers = await mockCompanyDataService.getUsers();
        const areaManagers = allUsers.filter(u => u.role === 'AREA_MANAGER' && u.status === 'active');
        setHierarchyData(prev => ({ ...prev, areaManagers }));
      } catch (fallbackError) {
        console.error('Failed to load area managers fallback:', fallbackError);
      }
    } finally {
      setLoading(prev => ({ ...prev, areaManagers: false }));
    }
  };

  const validateReportingRelationship = () => {
    if (!roleRequirements.needsAreaManagerReporting || !formData.reportingToAreaManagerId) {
      setValidationWarnings([]);
      return;
    }

    const selectedAreaManager = hierarchyData.areaManagers.find(am => am.id === formData.reportingToAreaManagerId);
    if (!selectedAreaManager) {
      setValidationWarnings([]);
      return;
    }

    const managerData = {
      role: formData.role as 'MANAGER',
      companyId: formData.companyId,
      assignedEstates: formData.assignedEstates
    };

    const validation = HierarchicalValidationService.validateManagerToAreaManagerAssignment({
      manager: managerData,
      areaManager: selectedAreaManager,
      estates: hierarchyData.estates,
      companies: hierarchyData.companies
    });

    setValidationWarnings(validation.warnings);
    
    // Add validation errors to form errors
    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        reportingToAreaManagerId: validation.errors.join('. ')
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.reportingToAreaManagerId;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!user && !formData.password) {
      newErrors.password = 'Password wajib diisi untuk pengguna baru';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'ID Karyawan wajib diisi';
    }

    // Role-based validation
    if (roleRequirements.needsCompany) {
      if (roleRequirements.allowsMultiCompany) {
        // For Area Manager role: require at least one company
        if (formData.assignedCompanies.length === 0) {
          newErrors.assignedCompanies = 'Minimal satu perusahaan wajib dipilih untuk role Area Manager';
        }
      } else {
        // For single company roles
        if (!formData.companyId) {
          newErrors.companyId = 'Perusahaan wajib dipilih untuk role ini';
        }
      }
    }

    // Estate validation with multi-assignment support
    if (roleRequirements.needsEstate) {
      if (roleRequirements.allowsMultiEstate) {
        // For Manager role: require at least one estate
        if (formData.assignedEstates.length === 0) {
          newErrors.assignedEstates = 'Minimal satu estate wajib dipilih untuk role Manager';
        }
      } else {
        // For single estate roles
        if (!formData.estateId) {
          newErrors.estateId = 'Estate wajib dipilih untuk role ini';
        }
      }
    }

    // Division validation with multi-assignment support  
    if (roleRequirements.needsDivision) {
      if (roleRequirements.allowsMultiDivision) {
        // For Asisten and Mandor roles: require at least one division
        if (formData.assignedDivisions.length === 0) {
          const roleLabel = formData.role === 'ASISTEN' ? 'Asisten' : formData.role === 'MANDOR' ? 'Mandor' : 'role ini';
          newErrors.assignedDivisions = `Minimal satu divisi wajib dipilih untuk role ${roleLabel}`;
        }
      } else {
        // For single division roles (if any)
        if (!formData.divisiId) {
          newErrors.divisiId = 'Divisi wajib dipilih untuk role ini';
        }
      }
    }

    // Area Manager reporting validation
    if (roleRequirements.needsAreaManagerReporting && !formData.reportingToAreaManagerId) {
      newErrors.reportingToAreaManagerId = 'Area Manager harus dipilih untuk role Manager';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Find selected hierarchy names
      const selectedCompany = hierarchyData.companies.find(c => c.id === formData.companyId);
      const selectedEstate = hierarchyData.estates.find(e => e.id === formData.estateId);
      const selectedDivision = hierarchyData.divisions.find(d => d.id === formData.divisiId);

      // Process multi-assignment data
      const selectedEstatesData = hierarchyData.estates.filter(e => formData.assignedEstates.includes(e.id));
      const selectedDivisionsData = hierarchyData.divisions.filter(d => formData.assignedDivisions.includes(d.id));
      const selectedCompaniesData = hierarchyData.companies.filter(c => formData.assignedCompanies.includes(c.id));
      
      // Process reporting relationship data
      const selectedAreaManager = hierarchyData.areaManagers.find(am => am.id === formData.reportingToAreaManagerId);

      const userData: Partial<User> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        companyId: roleRequirements.allowsMultiCompany 
          ? (selectedCompaniesData.length > 0 ? selectedCompaniesData[0].id : undefined)
          : (formData.companyId || undefined),
        company: roleRequirements.allowsMultiCompany 
          ? (selectedCompaniesData.length > 0 ? selectedCompaniesData[0].name : undefined)
          : (selectedCompany?.name || undefined),
        employeeId: formData.employeeId,
        phoneNumber: formData.phoneNumber,
        position: formData.position,
        status: formData.status as any,
        notes: formData.notes,
        permissions: ROLE_PERMISSIONS[formData.role],
        
        // Multi-assignment fields
        assignedEstates: roleRequirements.allowsMultiEstate ? formData.assignedEstates : undefined,
        assignedEstateNames: roleRequirements.allowsMultiEstate ? selectedEstatesData.map(e => e.name) : undefined,
        assignedDivisions: roleRequirements.allowsMultiDivision ? formData.assignedDivisions : undefined,
        assignedDivisionNames: roleRequirements.allowsMultiDivision ? selectedDivisionsData.map(d => d.name) : undefined,
        assignedCompanies: roleRequirements.allowsMultiCompany ? formData.assignedCompanies : undefined,
        assignedCompanyNames: roleRequirements.allowsMultiCompany ? selectedCompaniesData.map(c => c.name) : undefined,
        
        // Legacy single assignment fields (for backward compatibility and display)
        estate: roleRequirements.allowsMultiEstate 
          ? (selectedEstatesData.length > 0 ? selectedEstatesData[0].name : undefined)
          : selectedEstate?.name || undefined,
        divisi: roleRequirements.allowsMultiDivision 
          ? (selectedDivisionsData.length > 0 ? selectedDivisionsData[0].name : undefined)
          : selectedDivision?.name || undefined,
        
        // Hierarchical Reporting fields
        reportingToAreaManagerId: roleRequirements.needsAreaManagerReporting ? formData.reportingToAreaManagerId : undefined,
        reportingToAreaManagerName: roleRequirements.needsAreaManagerReporting ? selectedAreaManager?.name : undefined,
      };

      // Include password only if provided
      if (formData.password) {
        (userData as any).password = formData.password;
      }

      await onSubmit(userData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Informasi Dasar</h3>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Masukkan nama lengkap"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="nama@agrinova.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Masukkan password"
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId">ID Karyawan *</Label>
            <Input
              id="employeeId"
              value={formData.employeeId}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
              placeholder="EMP001"
              className={errors.employeeId ? 'border-red-500' : ''}
            />
            {errors.employeeId && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.employeeId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Nomor Telepon</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="08123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Jabatan</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder="Contoh: Kepala Mandor"
            />
          </div>
        </div>

        {/* Role & Organization */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Role & Organisasi</h3>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {allowedRolesList.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center space-x-2">
                      <span>{USER_ROLE_LABELS[role]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
              {roleRequirements.description}
            </div>
          </div>

          {/* Company Selection - Single or Multi based on role */}
          {roleRequirements.needsCompany && (
            <div className="space-y-2">
              <Label htmlFor="companyId">
                Perusahaan {roleRequirements.needsCompany ? '*' : '(Opsional)'}
                <Building className="inline h-3 w-3 ml-1" />
                {roleRequirements.allowsMultiCompany && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Multi-select
                  </span>
                )}
              </Label>
              
              {roleRequirements.allowsMultiCompany ? (
                // Multi-select for Area Manager role
                <div>
                  <MultiSelect
                    options={hierarchyData.companies.map(company => ({
                      value: company.id,
                      label: `${company.name} (${company.code})`,
                      description: company.description
                    }))}
                    selected={formData.assignedCompanies}
                    onSelectionChange={(selected) => 
                      setFormData(prev => ({ ...prev, assignedCompanies: selected }))
                    }
                    placeholder="Pilih perusahaan untuk dikelola"
                    emptyMessage="Tidak ada perusahaan tersedia"
                    disabled={!!restrictedToCompany || loading.companies}
                    loading={loading.companies}
                    className={errors.assignedCompanies ? 'border-red-500' : ''}
                  />
                  {errors.assignedCompanies && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <CircleAlert className="h-4 w-4 mr-1" />
                      {errors.assignedCompanies}
                    </p>
                  )}
                </div>
              ) : (
                // Single select for other roles
                <div>
                  <Select 
                    value={formData.companyId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}
                    disabled={!!restrictedToCompany || loading.companies}
                  >
                    <SelectTrigger className={errors.companyId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih perusahaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {hierarchyData.companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name} ({company.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.companyId && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <CircleAlert className="h-4 w-4 mr-1" />
                      {errors.companyId}
                    </p>
                  )}
                </div>
              )}
              
              {loading.companies && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Memuat perusahaan...
                </div>
              )}
            </div>
          )}

          {/* Estate Selection - Single or Multi based on role */}
          {roleRequirements.needsEstate && (
            <div className="space-y-2">
              <Label htmlFor="estateId">
                Estate {roleRequirements.needsEstate ? '*' : '(Opsional)'}
                <MapPin className="inline h-3 w-3 ml-1" />
                {roleRequirements.allowsMultiEstate && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Multi-select
                  </span>
                )}
              </Label>
              
              {roleRequirements.allowsMultiEstate ? (
                // Multi-select for Manager role
                <div>
                  <MultiSelect
                    options={hierarchyData.estates.map(estate => ({
                      value: estate.id,
                      label: `${estate.name} (${estate.code})`,
                      description: estate.description
                    }))}
                    selected={formData.assignedEstates}
                    onSelectionChange={(selected) => 
                      setFormData(prev => ({ ...prev, assignedEstates: selected }))
                    }
                    placeholder="Pilih estate untuk dikelola"
                    emptyMessage="Tidak ada estate tersedia"
                    disabled={!formData.companyId || loading.estates}
                    loading={loading.estates}
                    className={errors.assignedEstates ? 'border-red-500' : ''}
                  />
                  {errors.assignedEstates && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <CircleAlert className="h-4 w-4 mr-1" />
                      {errors.assignedEstates}
                    </p>
                  )}
                </div>
              ) : (
                // Single select for other roles
                <div>
                  <Select 
                    value={formData.estateId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, estateId: value }))}
                    disabled={!formData.companyId || loading.estates}
                  >
                    <SelectTrigger className={errors.estateId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih estate" />
                    </SelectTrigger>
                    <SelectContent>
                      {hierarchyData.estates.map((estate) => (
                        <SelectItem key={estate.id} value={estate.id}>
                          {estate.name} ({estate.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.estateId && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <CircleAlert className="h-4 w-4 mr-1" />
                      {errors.estateId}
                    </p>
                  )}
                </div>
              )}
              
              {loading.estates && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Memuat estate...
                </div>
              )}
            </div>
          )}

          {/* Division Selection - Single or Multi based on role */}
          {roleRequirements.needsDivision && (
            <div className="space-y-2">
              <Label htmlFor="divisiId">
                Divisi *
                <Grid3x3 className="inline h-3 w-3 ml-1" />
                {roleRequirements.allowsMultiDivision && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Multi-select
                  </span>
                )}
              </Label>
              
              {roleRequirements.allowsMultiDivision ? (
                // Multi-select for Asisten and Mandor roles
                <div>
                  <MultiSelect
                    options={hierarchyData.divisions.map(divisi => ({
                      value: divisi.id,
                      label: `${divisi.name} (${divisi.code})`,
                      description: divisi.description
                    }))}
                    selected={formData.assignedDivisions}
                    onSelectionChange={(selected) => 
                      setFormData(prev => ({ ...prev, assignedDivisions: selected }))
                    }
                    placeholder="Pilih divisi untuk dikelola"
                    emptyMessage="Tidak ada divisi tersedia"
                    disabled={(formData.assignedEstates.length === 0 && !formData.estateId) || loading.divisions}
                    loading={loading.divisions}
                    className={errors.assignedDivisions ? 'border-red-500' : ''}
                  />
                  {errors.assignedDivisions && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <CircleAlert className="h-4 w-4 mr-1" />
                      {errors.assignedDivisions}
                    </p>
                  )}
                </div>
              ) : (
                // Single select for other roles (not used currently)
                <div>
                  <Select 
                    value={formData.divisiId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, divisiId: value }))}
                    disabled={!formData.estateId || loading.divisions}
                  >
                    <SelectTrigger className={errors.divisiId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih divisi" />
                    </SelectTrigger>
                    <SelectContent>
                      {hierarchyData.divisions.map((divisi) => (
                        <SelectItem key={divisi.id} value={divisi.id}>
                          {divisi.name} ({divisi.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.divisiId && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <CircleAlert className="h-4 w-4 mr-1" />
                      {errors.divisiId}
                    </p>
                  )}
                </div>
              )}
              
              {loading.divisions && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Memuat divisi...
                </div>
              )}
            </div>
          )}

          {/* Area Manager Selection - Only for Manager role */}
          {roleRequirements.needsAreaManagerReporting && (
            <div className="space-y-2">
              <Label htmlFor="reportingToAreaManagerId">
                Area Manager (Atasan Langsung) *
                <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  Wajib
                </span>
              </Label>
              <Select 
                value={formData.reportingToAreaManagerId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, reportingToAreaManagerId: value }))}
                disabled={loading.areaManagers}
              >
                <SelectTrigger className={errors.reportingToAreaManagerId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Pilih Area Manager sebagai atasan langsung" />
                </SelectTrigger>
                <SelectContent>
                  {hierarchyData.areaManagers.map((areaManager) => (
                    <SelectItem key={areaManager.id} value={areaManager.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{areaManager.name}</span>
                        <span className="text-xs text-gray-500">
                          {areaManager.employeeId} • {areaManager.assignedCompanyNames?.join(', ') || areaManager.company}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading.areaManagers && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Memuat Area Manager...
                </div>
              )}
              {errors.reportingToAreaManagerId && (
                <p className="text-sm text-red-600 flex items-center">
                  <CircleAlert className="h-4 w-4 mr-1" />
                  {errors.reportingToAreaManagerId}
                </p>
              )}
              <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                Manager akan bertanggung jawab langsung kepada Area Manager yang dipilih
              </div>
              
              {/* Display validation warnings */}
              {validationWarnings.length > 0 && (
                <div className="space-y-1">
                  {validationWarnings.map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded flex items-start">
                      <CircleAlert className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex flex-col">
                      <span>{status.label}</span>
                      <span className="text-xs text-gray-500">{status.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Role Permissions Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Izin Akses Role: {USER_ROLE_LABELS[formData.role]}</CardTitle>
          <CardDescription>
            Berikut adalah izin yang akan diberikan kepada pengguna
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ROLE_PERMISSIONS[formData.role].map((permission) => (
              <Badge key={permission} variant="secondary" className="text-xs">
                {permission.replace(':', ': ').replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Catatan tambahan tentang pengguna ini..."
          rows={3}
        />
      </div>

      <Separator />

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Menyimpan...' : user ? 'Perbarui' : 'Simpan'}
        </Button>
      </div>
    </form>
  );
}