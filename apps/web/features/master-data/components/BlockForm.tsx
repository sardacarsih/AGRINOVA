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
import type { Block, CreateBlockInput } from '@/types/master-data';
import { useCompanies } from '../hooks/useCompanies';
import { useEstates } from '../hooks/useEstates';
import { useDivisions } from '../hooks/useDivisions';
import { useState } from 'react';

const blockSchema = z.object({
    blockCode: z.string().min(2, 'Kode blok minimal 2 karakter').max(20, 'Kode blok maksimal 20 karakter'),
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    companyId: z.string().min(1, 'Company wajib dipilih'),
    estateId: z.string().min(1, 'Estate wajib dipilih'),
    divisionId: z.string().min(1, 'Division wajib dipilih'),
    luasHa: z.number().positive('Luas harus lebih dari 0'),
    jumlahPohon: z.number().int().nonnegative('Jumlah pohon tidak boleh negatif').optional(),
    plantingYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    cropType: z.string().max(50).optional(),
    targetPanen: z.number().nonnegative('Target panen tidak boleh negatif').optional(),
    deskripsi: z.string().max(500).optional(),
});

type BlockFormData = z.infer<typeof blockSchema>;

interface BlockFormProps {
    block?: Block;
    onSubmit: (data: CreateBlockInput) => Promise<void>;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function BlockForm({ block, onSubmit, onCancel, isSubmitting }: BlockFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<BlockFormData>({
        resolver: zodResolver(blockSchema),
        defaultValues: block
            ? {
                blockCode: block.blockCode,
                name: block.name,
                companyId: block.companyId,
                estateId: block.estateId,
                divisionId: block.divisionId,
                luasHa: block.luasHa,
                jumlahPohon: block.jumlahPohon,
                plantingYear: block.plantingYear,
                cropType: block.cropType,
                targetPanen: block.targetPanen,
                deskripsi: block.deskripsi,
            }
            : undefined,
    });

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>(block?.companyId || '');
    const [selectedEstateId, setSelectedEstateId] = useState<string>(block?.estateId || '');

    const { companies, isLoading: loadingCompanies } = useCompanies();
    const { estates, isLoading: loadingEstates } = useEstates(
        selectedCompanyId ? { companyId: selectedCompanyId } : undefined
    );
    const { divisions, isLoading: loadingDivisions } = useDivisions(
        selectedEstateId ? { estateId: selectedEstateId } : undefined
    );

    const handleCompanyChange = (companyId: string) => {
        setSelectedCompanyId(companyId);
        setSelectedEstateId('');
        setValue('companyId', companyId);
        setValue('estateId', '');
        setValue('divisionId', '');
    };

    const handleEstateChange = (estateId: string) => {
        setSelectedEstateId(estateId);
        setValue('estateId', estateId);
        setValue('divisionId', '');
    };

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Grid container spacing={3}>
                {/* Hierarchical Selection */}
                <Grid size={{ xs: 12, md: 4 }}>
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

                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth error={!!errors.estateId} disabled={!selectedCompanyId}>
                        <InputLabel>Estate</InputLabel>
                        <Select
                            value={selectedEstateId}
                            onChange={(e) => handleEstateChange(e.target.value)}
                            disabled={loadingEstates || !selectedCompanyId}
                        >
                            {estates.map((estate) => (
                                <MenuItem key={estate.id} value={estate.id}>
                                    {estate.name} ({estate.code})
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.estateId && <FormHelperText>{errors.estateId.message}</FormHelperText>}
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <FormControl fullWidth error={!!errors.divisionId} disabled={!selectedEstateId}>
                        <InputLabel>Division</InputLabel>
                        <Select {...register('divisionId')} disabled={loadingDivisions || !selectedEstateId}>
                            {divisions.map((division) => (
                                <MenuItem key={division.id} value={division.id}>
                                    {division.name} ({division.code})
                                </MenuItem>
                            ))}
                        </Select>
                        {errors.divisionId && <FormHelperText>{errors.divisionId.message}</FormHelperText>}
                    </FormControl>
                </Grid>

                {/* Block Details */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Kode Blok"
                        {...register('blockCode')}
                        error={!!errors.blockCode}
                        helperText={errors.blockCode?.message}
                        required
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Nama Blok"
                        {...register('name')}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        required
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        fullWidth
                        label="Luas (Hektar)"
                        type="number"
                        {...register('luasHa', { valueAsNumber: true })}
                        error={!!errors.luasHa}
                        helperText={errors.luasHa?.message}
                        required
                        inputProps={{ step: '0.01', min: '0' }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        fullWidth
                        label="Jumlah Pohon"
                        type="number"
                        {...register('jumlahPohon', { valueAsNumber: true })}
                        error={!!errors.jumlahPohon}
                        helperText={errors.jumlahPohon?.message}
                        inputProps={{ step: '1', min: '0' }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        fullWidth
                        label="Tahun Tanam"
                        type="number"
                        {...register('plantingYear', { valueAsNumber: true })}
                        error={!!errors.plantingYear}
                        helperText={errors.plantingYear?.message}
                        inputProps={{ min: '1900', max: new Date().getFullYear() }}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Jenis Tanaman"
                        {...register('cropType')}
                        error={!!errors.cropType}
                        helperText={errors.cropType?.message}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="Target Panen (kg/bulan)"
                        type="number"
                        {...register('targetPanen', { valueAsNumber: true })}
                        error={!!errors.targetPanen}
                        helperText={errors.targetPanen?.message}
                        inputProps={{ step: '0.01', min: '0' }}
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
                            {isSubmitting ? <CircularProgress size={24} /> : block ? 'Update' : 'Simpan'}
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
