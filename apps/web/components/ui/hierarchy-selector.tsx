'use client';

import * as React from 'react';
import { Company, Estate, Divisi } from '@/types/auth';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, MapPin, Grid3x3, Loader2, CircleAlert } from 'lucide-react';
import { mockCompanyDataService } from '@/lib/data/mock-company-data';

interface HierarchySelectorProps {
  selectedCompanyId?: string;
  selectedEstateId?: string;
  selectedDivisionId?: string;
  onCompanyChange?: (companyId: string) => void;
  onEstateChange?: (estateId: string) => void;
  onDivisionChange?: (divisionId: string) => void;
  restrictedToCompany?: string; // Restrict to specific company
  showCompany?: boolean;
  showEstate?: boolean;
  showDivision?: boolean;
  requiredCompany?: boolean;
  requiredEstate?: boolean;
  requiredDivision?: boolean;
  disabled?: boolean;
  errors?: {
    company?: string;
    estate?: string;
    division?: string;
  };
  className?: string;
}

interface HierarchyData {
  companies: Company[];
  estates: Estate[];
  divisions: Divisi[];
}

interface LoadingState {
  companies: boolean;
  estates: boolean;
  divisions: boolean;
}

export function HierarchySelector({
  selectedCompanyId = '',
  selectedEstateId = '',
  selectedDivisionId = '',
  onCompanyChange,
  onEstateChange,
  onDivisionChange,
  restrictedToCompany,
  showCompany = true,
  showEstate = true,
  showDivision = true,
  requiredCompany = false,
  requiredEstate = false,
  requiredDivision = false,
  disabled = false,
  errors = {},
  className = ''
}: HierarchySelectorProps) {
  const [data, setData] = React.useState<HierarchyData>({
    companies: [],
    estates: [],
    divisions: []
  });

  const [loading, setLoading] = React.useState<LoadingState>({
    companies: false,
    estates: false,
    divisions: false
  });

  // Load companies on mount
  React.useEffect(() => {
    if (showCompany) {
      loadCompanies();
    }
  }, [showCompany, restrictedToCompany]);

  // Load estates when company changes
  React.useEffect(() => {
    if (selectedCompanyId && showEstate) {
      loadEstates(selectedCompanyId);
    } else {
      setData(prev => ({ ...prev, estates: [], divisions: [] }));
      if (onEstateChange) onEstateChange('');
      if (onDivisionChange) onDivisionChange('');
    }
  }, [selectedCompanyId, showEstate]);

  // Load divisions when estate changes
  React.useEffect(() => {
    if (selectedEstateId && showDivision) {
      loadDivisions(selectedEstateId);
    } else {
      setData(prev => ({ ...prev, divisions: [] }));
      if (onDivisionChange) onDivisionChange('');
    }
  }, [selectedEstateId, showDivision]);

  const loadCompanies = async () => {
    try {
      setLoading(prev => ({ ...prev, companies: true }));
      
      if (restrictedToCompany) {
        const company = await mockCompanyDataService.getCompanyById(restrictedToCompany);
        if (company) {
          setData(prev => ({ ...prev, companies: [company] }));
        }
      } else {
        const companies = await mockCompanyDataService.getCompanies();
        setData(prev => ({ ...prev, companies }));
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(prev => ({ ...prev, companies: false }));
    }
  };

  const loadEstates = async (companyId: string) => {
    try {
      setLoading(prev => ({ ...prev, estates: true }));
      const estates = await mockCompanyDataService.getEstatesByCompany(companyId);
      setData(prev => ({ ...prev, estates, divisions: [] }));
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
      setData(prev => ({ ...prev, divisions }));
    } catch (error) {
      console.error('Failed to load divisions:', error);
    } finally {
      setLoading(prev => ({ ...prev, divisions: false }));
    }
  };

  const handleCompanyChange = (companyId: string) => {
    if (onCompanyChange) onCompanyChange(companyId);
    // Reset downstream selections
    if (onEstateChange) onEstateChange('');
    if (onDivisionChange) onDivisionChange('');
  };

  const handleEstateChange = (estateId: string) => {
    if (onEstateChange) onEstateChange(estateId);
    // Reset downstream selections
    if (onDivisionChange) onDivisionChange('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Company Selection */}
      {showCompany && (
        <div className="space-y-2">
          <Label htmlFor="company-select">
            Perusahaan {requiredCompany ? '*' : ''}
            <Building className="inline h-3 w-3 ml-1" />
          </Label>
          <Select
            value={selectedCompanyId}
            onValueChange={handleCompanyChange}
            disabled={disabled || !!restrictedToCompany || loading.companies}
          >
            <SelectTrigger 
              id="company-select"
              className={errors.company ? 'border-red-500' : ''}
            >
              <SelectValue placeholder="Pilih perusahaan" />
            </SelectTrigger>
            <SelectContent>
              {data.companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-gray-500">{company.code}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading.companies && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Memuat perusahaan...
            </div>
          )}
          {errors.company && (
            <p className="text-sm text-red-600 flex items-center">
              <CircleAlert className="h-4 w-4 mr-1" />
              {errors.company}
            </p>
          )}
        </div>
      )}

      {/* Estate Selection */}
      {showEstate && (
        <div className="space-y-2">
          <Label htmlFor="estate-select">
            Estate {requiredEstate ? '*' : '(Opsional)'}
            <MapPin className="inline h-3 w-3 ml-1" />
          </Label>
          <Select
            value={selectedEstateId}
            onValueChange={handleEstateChange}
            disabled={disabled || !selectedCompanyId || loading.estates}
          >
            <SelectTrigger 
              id="estate-select"
              className={errors.estate ? 'border-red-500' : ''}
            >
              <SelectValue placeholder={selectedCompanyId ? "Pilih estate" : "Pilih perusahaan dulu"} />
            </SelectTrigger>
            <SelectContent>
              {data.estates.map((estate) => (
                <SelectItem key={estate.id} value={estate.id}>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{estate.name}</div>
                      <div className="text-sm text-gray-500">
                        {estate.code} • {estate.area ? `${estate.area.toLocaleString()} ha` : 'Area tidak diketahui'}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading.estates && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Memuat estate...
            </div>
          )}
          {errors.estate && (
            <p className="text-sm text-red-600 flex items-center">
              <CircleAlert className="h-4 w-4 mr-1" />
              {errors.estate}
            </p>
          )}
        </div>
      )}

      {/* Division Selection */}
      {showDivision && (
        <div className="space-y-2">
          <Label htmlFor="division-select">
            Divisi {requiredDivision ? '*' : '(Opsional)'}
            <Grid3x3 className="inline h-3 w-3 ml-1" />
          </Label>
          <Select
            value={selectedDivisionId}
            onValueChange={onDivisionChange}
            disabled={disabled || !selectedEstateId || loading.divisions}
          >
            <SelectTrigger 
              id="division-select"
              className={errors.division ? 'border-red-500' : ''}
            >
              <SelectValue placeholder={selectedEstateId ? "Pilih divisi" : "Pilih estate dulu"} />
            </SelectTrigger>
            <SelectContent>
              {data.divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  <div className="flex items-center space-x-2">
                    <Grid3x3 className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">{division.name}</div>
                      <div className="text-sm text-gray-500">
                        {division.code} • {division.area ? `${division.area.toLocaleString()} ha` : 'Area tidak diketahui'}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loading.divisions && (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Memuat divisi...
            </div>
          )}
          {errors.division && (
            <p className="text-sm text-red-600 flex items-center">
              <CircleAlert className="h-4 w-4 mr-1" />
              {errors.division}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for managing hierarchy selection state
export function useHierarchySelection(initialValues?: {
  companyId?: string;
  estateId?: string;
  divisionId?: string;
}) {
  const [selectedCompanyId, setSelectedCompanyId] = React.useState(initialValues?.companyId || '');
  const [selectedEstateId, setSelectedEstateId] = React.useState(initialValues?.estateId || '');
  const [selectedDivisionId, setSelectedDivisionId] = React.useState(initialValues?.divisionId || '');

  const resetSelection = () => {
    setSelectedCompanyId('');
    setSelectedEstateId('');
    setSelectedDivisionId('');
  };

  const setCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedEstateId('');
    setSelectedDivisionId('');
  };

  const setEstate = (estateId: string) => {
    setSelectedEstateId(estateId);
    setSelectedDivisionId('');
  };

  const setDivision = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
  };

  return {
    selectedCompanyId,
    selectedEstateId,
    selectedDivisionId,
    setSelectedCompanyId: setCompany,
    setSelectedEstateId: setEstate,
    setSelectedDivisionId: setDivision,
    resetSelection,
    isComplete: (requireCompany = false, requireEstate = false, requireDivision = false) => {
      if (requireCompany && !selectedCompanyId) return false;
      if (requireEstate && !selectedEstateId) return false;
      if (requireDivision && !selectedDivisionId) return false;
      return true;
    }
  };
}