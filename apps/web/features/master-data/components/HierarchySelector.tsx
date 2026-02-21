'use client';

import { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { useCompanies } from '../hooks/useCompanies';
import { useEstates } from '../hooks/useEstates';
import { useDivisions } from '../hooks/useDivisions';
import { useBlocks } from '../hooks/useBlocks';

export interface HierarchySelection {
    companyId?: string;
    estateId?: string;
    divisionId?: string;
    blockId?: string;
}

interface HierarchySelectorProps {
    value?: HierarchySelection;
    onChange: (selection: HierarchySelection) => void;
    levels: Array<'company' | 'estate' | 'division' | 'block'>;
    error?: Partial<Record<'company' | 'estate' | 'division' | 'block', string>>;
    required?: boolean;
    disabled?: boolean;
    size?: 'small' | 'medium';
}

export function HierarchySelector({
    value = {},
    onChange,
    levels,
    error = {},
    required = false,
    disabled = false,
    size = 'medium',
}: HierarchySelectorProps) {
    const [selection, setSelection] = useState<HierarchySelection>(value);

    const { companies, isLoading: loadingCompanies } = useCompanies();
    const { estates, isLoading: loadingEstates } = useEstates(
        selection.companyId ? { companyId: selection.companyId } : undefined
    );
    const { divisions, isLoading: loadingDivisions } = useDivisions(
        selection.estateId ? { estateId: selection.estateId } : undefined
    );
    const { blocks, isLoading: loadingBlocks } = useBlocks(
        selection.divisionId ? { divisionId: selection.divisionId } : undefined
    );

    useEffect(() => {
        setSelection(value);
    }, [value]);

    const handleCompanyChange = (companyId: string) => {
        const newSelection = { companyId, estateId: '', divisionId: '', blockId: '' };
        setSelection(newSelection);
        onChange(newSelection);
    };

    const handleEstateChange = (estateId: string) => {
        const newSelection = { ...selection, estateId, divisionId: '', blockId: '' };
        setSelection(newSelection);
        onChange(newSelection);
    };

    const handleDivisionChange = (divisionId: string) => {
        const newSelection = { ...selection, divisionId, blockId: '' };
        setSelection(newSelection);
        onChange(newSelection);
    };

    const handleBlockChange = (blockId: string) => {
        const newSelection = { ...selection, blockId };
        setSelection(newSelection);
        onChange(newSelection);
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {levels.includes('company') && (
                <FormControl
                    sx={{ minWidth: 200, flex: 1 }}
                    size={size}
                    error={!!error.company}
                    required={required}
                    disabled={disabled}
                >
                    <InputLabel>Company</InputLabel>
                    <Select
                        value={selection.companyId || ''}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        label="Company"
                    >
                        <MenuItem value="">
                            <em>Pilih Company</em>
                        </MenuItem>
                        {companies.map((company) => (
                            <MenuItem key={company.id} value={company.id}>
                                {company.name} ({company.code})
                            </MenuItem>
                        ))}
                    </Select>
                    {error.company && <FormHelperText>{error.company}</FormHelperText>}
                </FormControl>
            )}

            {levels.includes('estate') && (
                <FormControl
                    sx={{ minWidth: 200, flex: 1 }}
                    size={size}
                    error={!!error.estate}
                    required={required}
                    disabled={disabled || !selection.companyId || loadingEstates}
                >
                    <InputLabel>Estate</InputLabel>
                    <Select
                        value={selection.estateId || ''}
                        onChange={(e) => handleEstateChange(e.target.value)}
                        label="Estate"
                    >
                        <MenuItem value="">
                            <em>Pilih Estate</em>
                        </MenuItem>
                        {estates.map((estate) => (
                            <MenuItem key={estate.id} value={estate.id}>
                                {estate.name} ({estate.code})
                            </MenuItem>
                        ))}
                    </Select>
                    {error.estate && <FormHelperText>{error.estate}</FormHelperText>}
                </FormControl>
            )}

            {levels.includes('division') && (
                <FormControl
                    sx={{ minWidth: 200, flex: 1 }}
                    size={size}
                    error={!!error.division}
                    required={required}
                    disabled={disabled || !selection.estateId || loadingDivisions}
                >
                    <InputLabel>Division</InputLabel>
                    <Select
                        value={selection.divisionId || ''}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        label="Division"
                    >
                        <MenuItem value="">
                            <em>Pilih Division</em>
                        </MenuItem>
                        {divisions.map((division) => (
                            <MenuItem key={division.id} value={division.id}>
                                {division.name} ({division.code})
                            </MenuItem>
                        ))}
                    </Select>
                    {error.division && <FormHelperText>{error.division}</FormHelperText>}
                </FormControl>
            )}

            {levels.includes('block') && (
                <FormControl
                    sx={{ minWidth: 200, flex: 1 }}
                    size={size}
                    error={!!error.block}
                    required={required}
                    disabled={disabled || !selection.divisionId || loadingBlocks}
                >
                    <InputLabel>Block</InputLabel>
                    <Select
                        value={selection.blockId || ''}
                        onChange={(e) => handleBlockChange(e.target.value)}
                        label="Block"
                    >
                        <MenuItem value="">
                            <em>Pilih Block</em>
                        </MenuItem>
                        {blocks.map((block) => (
                            <MenuItem key={block.id} value={block.id}>
                                {block.name} ({block.blockCode})
                            </MenuItem>
                        ))}
                    </Select>
                    {error.block && <FormHelperText>{error.block}</FormHelperText>}
                </FormControl>
            )}
        </Box>
    );
}
