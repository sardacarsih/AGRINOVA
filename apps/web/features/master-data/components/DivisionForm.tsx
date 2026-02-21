'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Box,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    CircularProgress,
} from '@mui/material';
import type { Division, CreateDivisionInput } from '@/types/master-data';
import { useCompanies } from '../hooks/useCompanies';
import { useEstates } from '../hooks/useEstates';
import { useState } from 'react';

const divisionSchema = z.object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    code: z.string().min(2, 'Kode divisi minimal 2 karakter').max(20, 'Kode divisi maksimal 20 karakter'),
    companyId: z.string().min(1, 'Company wajib dipilih'),
    estateId: z.string().min(1, 'Estate wajib dipilih'),
    managerId: z.string().optional(),
    luasHa: z.number().positive('Luas harus lebih dari 0').optional(),
    deskripsi: z.string().max(500).optional(),
});

type DivisionFormData = z.infer<typeof divisionSchema>;

interface DivisionFormProps {
    division?: Division;
    onSubmit: (data: CreateDivisionInput) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function DivisionForm({ division, onSubmit, onCancel, isSubmitting }: DivisionFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<DivisionFormData>({
        resolver: zodResolver(divisionSchema),
        defaultValues: division
            ? {
                name: division.name,
                code: division.code,
                companyId: division.companyId,
                estateId: division.estateId,
                managerId: division.managerId,
                luasHa: division.luasHa,
                deskripsi: division.deskripsi,
            }
            : undefined,
    });

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(division?.companyId || '');

    const { companies, isLoading: loadingCompanies } = useCompanies();
    const { estates, isLoading: loadingEstates } = useEstates(
        selectedCompanyId ? { companyId: selectedCompanyId } : undefined
    );

    const handleCompanyChange = (companyId: string) => {
        setSelectedCompanyId(companyId);
        setValue('companyId', companyId);
        setValue('estateId', '');
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Grid container spacing={3}>
                {/* Hierarchical Selection */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth error={!!errors.companyId}>
                        <InputLabel>Company</InputLabel>
                        <Select
                            value={selectedCompanyId}
                            onChange={(e) => handleCompanyChange(e.target.value)}
                            disabled={loadingCompanies}
                        >
                            {companies.map((company) => (
                                <MenuItem key={company.id} value={company.id}>
                                    {company.name}
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.companyId && <FormHelperText>{errors.companyId.message}</FormHelperText>}
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth error={!!errors.estateId} disabled={!selectedCompanyId}>
                        <InputLabel>Estate</InputLabel>
                        <Select {...register('estateId')} disabled={loadingEstates || !selectedCompanyId}>
                            {estates.map((estate) => (
                                <MenuItem key={estate.id} value={estate.id}>
                                    {estate.name} ({estate.code})
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.estateId && <FormHelperText>{errors.estateId.message}</FormHelperText>}
                    </FormControl>
                </Grid>

                {/* Division Details */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Kode Divisi"
                        {...register('code')}
                        error={!!errors.code}
                        helperText={errors.code?.message}
                        required
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Nama Divisi"
                        {...register('name')}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        required
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Luas (Hektar)"
                        type="number"
                        {...register('luasHa', { valueAsNumber: true })}
                        error={!!errors.luasHa}
                        helperText={errors.luasHa?.message}
                        inputProps={{ step: '0.01', min: '0' }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Manager ID"
                        {...register('managerId')}
                        error={!!errors.managerId}
                        helperText={errors.managerId?.message || 'Opsional - ID user yang menjadi manager'}
                    />
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <TextField
                        fullWidth
                        label="Deskripsi"
                        multiline
                        rows={3}
                        {...register('deskripsi')}
                        error={!!errors.deskripsi}
                        helperText={errors.deskripsi?.message}
                    />
                </Grid>

                {/* Actions */}
                <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button onClick={onCancel} disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={24} /> : division ? 'Update' : 'Simpan'}
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
