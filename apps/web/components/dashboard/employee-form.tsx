'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDivisions } from '@/features/master-data/hooks/useDivisions';
import { cn } from '@/lib/utils';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, EmployeeType, EMPLOYEE_TYPE_LABELS } from '@/lib/api/employee-api';

const NO_DIVISION_VALUE = '__NO_DIVISION__';

// Form validation schema
const employeeFormSchema = z.object({
  employeeId: z.string()
    .min(3, 'ID karyawan minimal 3 karakter')
    .max(20, 'ID karyawan maksimal 20 karakter')
    .regex(/^[A-Z0-9_-]+$/, 'ID karyawan hanya boleh huruf kapital, angka, tanda hubung, dan underscore'),
  fullName: z.string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  position: z.string()
    .max(100, 'Posisi maksimal 100 karakter')
    .optional(),
  department: z.string()
    .max(100, 'Departemen maksimal 100 karakter')
    .optional(),
  phone: z.string()
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .optional(),
  address: z.string()
    .max(500, 'Alamat maksimal 500 karakter')
    .optional(),
  birthDate: z.string().optional(),
  hireDate: z.string().optional(),
  isActive: z.boolean().optional(),
  employeeType: z.enum(['BULANAN', 'KHT', 'BORONGAN', 'KHL']).optional(),
  divisionId: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

// Type mapping for backward compatibility
const mapLegacyEmployeeType = (type: EmployeeType | string): 'BULANAN' | 'KHT' | 'BORONGAN' | 'KHL' => {
  switch (type) {
    case 'PERMANENT':
      return 'BULANAN';
    case 'CONTRACT':
      return 'KHT';
    case 'DAILY':
      return 'BORONGAN';
    case 'SEASONAL':
      return 'KHL';
    default:
      return type as 'BULANAN' | 'KHT' | 'BORONGAN' | 'KHL';
  }
};

interface EmployeeFormProps {
  employee?: Employee;
  companyId?: string;
  onSubmit: (data: CreateEmployeeRequest | UpdateEmployeeRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EmployeeForm({ employee, companyId, onSubmit, onCancel, isLoading }: EmployeeFormProps) {
  const [birthDate, setBirthDate] = React.useState<Date | undefined>(
    employee?.birthDate ? new Date(employee.birthDate) : undefined
  );
  const [hireDate, setHireDate] = React.useState<Date | undefined>(
    employee?.hireDate ? new Date(employee.hireDate) : undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeId: employee?.employeeId || '',
      fullName: employee?.fullName || '',
      position: employee?.position || '',
      department: employee?.department || '',
      phone: employee?.phone || '',
      address: employee?.address || '',
      birthDate: employee?.birthDate || '',
      hireDate: employee?.hireDate || '',
      isActive: employee?.isActive ?? true,
      employeeType: employee?.employeeType ? mapLegacyEmployeeType(employee.employeeType) : 'BULANAN',
      divisionId: employee?.divisionId || NO_DIVISION_VALUE,
    },
  });
  const { divisions } = useDivisions(companyId ? { companyId } : { companyId: '' });
  const divisionOptions = React.useMemo(
    () => (divisions || []).map((division) => ({ id: division.id, name: division.name })),
    [divisions]
  );

  const employeeType = watch('employeeType');
  const isActive = watch('isActive');
  const divisionId = watch('divisionId');

  const handleFormSubmit = async (data: EmployeeFormData) => {
    try {
      const formData: CreateEmployeeRequest | UpdateEmployeeRequest = {
        ...data,
        employeeType: data.employeeType as EmployeeType,
        divisionId: data.divisionId && data.divisionId !== NO_DIVISION_VALUE ? data.divisionId : undefined,
        birthDate: birthDate ? birthDate.toISOString() : undefined,
        hireDate: hireDate ? hireDate.toISOString() : undefined,
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">
                ID Karyawan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="employeeId"
                {...register('employeeId')}
                placeholder="contoh: EMP001"
                className={errors.employeeId ? 'border-red-500' : ''}
              />
              {errors.employeeId && (
                <p className="text-sm text-red-500">{errors.employeeId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                {...register('fullName')}
                placeholder="contoh: Ahmad Supardi"
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Posisi</Label>
              <Input
                id="position"
                {...register('position')}
                placeholder="contoh: Mandor Panen"
                className={errors.position ? 'border-red-500' : ''}
              />
              {errors.position && (
                <p className="text-sm text-red-500">{errors.position.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departemen</Label>
              <Input
                id="department"
                {...register('department')}
                placeholder="contoh: Divisi A"
                className={errors.department ? 'border-red-500' : ''}
              />
              {errors.department && (
                <p className="text-sm text-red-500">{errors.department.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="contoh: +6281234567890"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detail Kepegawaian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeType">Jenis Karyawan</Label>
              <Select
                value={employeeType}
                onValueChange={(value) => setValue('employeeType', value as 'BULANAN' | 'KHT' | 'BORONGAN' | 'KHL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMPLOYEE_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="divisionId">Divisi</Label>
              <Select
                value={divisionId || NO_DIVISION_VALUE}
                onValueChange={(value) => setValue('divisionId', value)}
                disabled={!companyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={companyId ? 'Pilih divisi' : 'Perusahaan tidak ditemukan'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DIVISION_VALUE}>Tidak ada</SelectItem>
                  {divisionOptions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Masuk</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !hireDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {hireDate ? format(hireDate, "PPP") : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={hireDate}
                    onSelect={setHireDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Tanggal Lahir</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !birthDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? format(birthDate, "PPP") : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    initialFocus
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked as boolean)}
              />
              <Label htmlFor="isActive">Karyawan Aktif</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="contoh: Jl. Kebun Raya No. 123, Kecamatan ABC"
              className={cn(
                "min-h-[100px]",
                errors.address ? 'border-red-500' : ''
              )}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isLoading}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {employee ? 'Memperbarui...' : 'Menyimpan...'}
            </>
          ) : (
            employee ? 'Simpan Perubahan' : 'Tambah Karyawan'
          )}
        </Button>
      </div>
    </form>
  );
}
