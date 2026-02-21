'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Typography,
    Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { UserEstateAssignment, UserDivisionAssignment, UserCompanyAssignment } from '@/types/assignments';

type Assignment = UserEstateAssignment | UserDivisionAssignment | UserCompanyAssignment;

interface AssignmentTableProps {
    assignments: Assignment[];
    type: 'estate' | 'division' | 'company';
    onRemove: (id: string) => void;
    isRemoving?: boolean;
}

export function AssignmentTable({ assignments, type, onRemove, isRemoving }: AssignmentTableProps) {
    if (assignments.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">Belum ada assignment</Typography>
            </Box>
        );
    }

    const getEntityName = (assignment: Assignment) => {
        if ('estate' in assignment) return assignment.estate?.name || '-';
        if ('division' in assignment) return assignment.division?.name || '-';
        if ('company' in assignment) return assignment.company?.name || '-';
        return '-';
    };

    const getEntityCode = (assignment: Assignment) => {
        if ('estate' in assignment) return assignment.estate?.code || '-';
        if ('division' in assignment) return assignment.division?.code || '-';
        if ('company' in assignment) return assignment.company?.code || '-';
        return '-';
    };

    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>{type === 'estate' ? 'Estate' : type === 'division' ? 'Division' : 'Company'}</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Assigned At</TableCell>
                    <TableCell>Action</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                        <TableCell>
                            <Typography variant="body2" fontWeight="600">
                                {assignment.user?.name || '-'}
                            </Typography>
                        </TableCell>
                        <TableCell>{getEntityName(assignment)}</TableCell>
                        <TableCell>
                            <Chip label={getEntityCode(assignment)} size="small" />
                        </TableCell>
                        <TableCell>
                            <Chip label={assignment.role} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>
                            <Typography variant="caption">{new Date(assignment.assignedAt).toLocaleDateString()}</Typography>
                        </TableCell>
                        <TableCell>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => onRemove(assignment.id)}
                                disabled={isRemoving}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
