'use client';

import { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Alert,
    Snackbar,
    Breadcrumbs,
    Link,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useUserAssignments } from '@/features/master-data/hooks/useAssignments';
import { useCompanies } from '@/features/master-data/hooks/useCompanies';
import { useEstates } from '@/features/master-data/hooks/useEstates';
import { useDivisions } from '@/features/master-data/hooks/useDivisions';
import { AssignmentTable } from '@/features/master-data/components/AssignmentTable';

export default function AssignmentsPage() {
    const [activeTab, setActiveTab] = useState(0);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedEntityId, setSelectedEntityId] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success',
    });

    const {
        assignments,
        assignToCompany,
        assignToEstate,
        assignToDivision,
        removeCompanyAssignment,
        removeEstateAssignment,
        removeDivisionAssignment,
        isAssigning,
        isRemoving,
    } = useUserAssignments(selectedUserId);

    const { companies } = useCompanies();
    const { estates } = useEstates();
    const { divisions } = useDivisions();

    const handleAssign = async () => {
        if (!selectedUserId || !selectedEntityId || !selectedRole) {
            setSnackbar({ open: true, message: 'Mohon lengkapi semua field', severity: 'error' });
            return;
        }

        try {
            if (activeTab === 0) {
                await assignToCompany({ userId: selectedUserId, companyId: selectedEntityId, role: selectedRole });
            } else if (activeTab === 1) {
                await assignToEstate({ userId: selectedUserId, estateId: selectedEntityId, role: selectedRole });
            } else {
                await assignToDivision({ userId: selectedUserId, divisionId: selectedEntityId, role: selectedRole });
            }
            setSnackbar({ open: true, message: 'Assignment berhasil ditambahkan', severity: 'success' });
            setSelectedEntityId('');
            setSelectedRole('');
        } catch (error) {
            setSnackbar({ open: true, message: 'Gagal menambahkan assignment', severity: 'error' });
        }
    };

    const handleRemove = async (id: string) => {
        try {
            if (activeTab === 0) {
                await removeCompanyAssignment(id);
            } else if (activeTab === 1) {
                await removeEstateAssignment(id);
            } else {
                await removeDivisionAssignment(id);
            }
            setSnackbar({ open: true, message: 'Assignment berhasil dihapus', severity: 'success' });
        } catch (error) {
            setSnackbar({ open: true, message: 'Gagal menghapus assignment', severity: 'error' });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Breadcrumbs sx={{ mb: 3 }}>
                <Link href="/dashboard" underline="hover" color="inherit">
                    Dashboard
                </Link>
                <Typography color="text.primary">User Assignments</Typography>
            </Breadcrumbs>

            <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                Manage User Assignments
            </Typography>

            {/* Assignment Form */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Assign User
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                fullWidth
                                label="User ID"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                placeholder="Enter user ID"
                                size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>
                                    {activeTab === 0 ? 'Company' : activeTab === 1 ? 'Estate' : 'Division'}
                                </InputLabel>
                                <Select value={selectedEntityId} onChange={(e) => setSelectedEntityId(e.target.value)}>
                                    {activeTab === 0 &&
                                        companies.map((company) => (
                                            <MenuItem key={company.id} value={company.id}>
                                                {company.name}
                                            </MenuItem>
                                        ))}
                                    {activeTab === 1 &&
                                        estates.map((estate) => (
                                            <MenuItem key={estate.id} value={estate.id}>
                                                {estate.name} ({estate.code})
                                            </MenuItem>
                                        ))}
                                    {activeTab === 2 &&
                                        divisions.map((division) => (
                                            <MenuItem key={division.id} value={division.id}>
                                                {division.name} ({division.code})
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Role</InputLabel>
                                <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                                    <MenuItem value="MANDOR">Mandor</MenuItem>
                                    <MenuItem value="ASISTEN">Asisten</MenuItem>
                                    <MenuItem value="MANAGER">Manager</MenuItem>
                                    <MenuItem value="AREA_MANAGER">Area Manager</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAssign}
                                disabled={isAssigning}
                            >
                                Assign
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Card>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                    <Tab label="Company Assignments" />
                    <Tab label="Estate Assignments" />
                    <Tab label="Division Assignments" />
                </Tabs>
                <CardContent>
                    {activeTab === 0 && (
                        <AssignmentTable
                            assignments={assignments.companies}
                            type="company"
                            onRemove={handleRemove}
                            isRemoving={isRemoving}
                        />
                    )}
                    {activeTab === 1 && (
                        <AssignmentTable
                            assignments={assignments.estates}
                            type="estate"
                            onRemove={handleRemove}
                            isRemoving={isRemoving}
                        />
                    )}
                    {activeTab === 2 && (
                        <AssignmentTable
                            assignments={assignments.divisions}
                            type="division"
                            onRemove={handleRemove}
                            isRemoving={isRemoving}
                        />
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
