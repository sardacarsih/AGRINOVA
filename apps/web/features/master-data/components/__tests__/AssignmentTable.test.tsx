import { render, screen, fireEvent } from '@testing-library/react';
import { AssignmentTable } from '../AssignmentTable';
import type { UserEstateAssignment } from '@/types/assignments';

const mockOnRemove = jest.fn();

const mockEstateAssignments: UserEstateAssignment[] = [
    {
        id: '1',
        userId: 'user1',
        estateId: 'estate1',
        role: 'MANDOR',
        assignedBy: 'admin1',
        assignedAt: '2024-01-15T10:00:00Z',
        estate: {
            id: 'estate1',
            name: 'Kebun Utara',
            code: 'KBU',
        },
        user: {
            id: 'user1',
            name: 'John Doe',
            role: 'MANDOR',
        },
    },
    {
        id: '2',
        userId: 'user2',
        estateId: 'estate2',
        role: 'ASISTEN',
        assignedBy: 'admin1',
        assignedAt: '2024-01-16T10:00:00Z',
        estate: {
            id: 'estate2',
            name: 'Kebun Selatan',
            code: 'KBS',
        },
        user: {
            id: 'user2',
            name: 'Jane Smith',
            role: 'ASISTEN',
        },
    },
];

describe('AssignmentTable', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty state when no assignments', () => {
        render(
            <AssignmentTable
                assignments={[]}
                type="estate"
                onRemove={mockOnRemove}
            />
        );

        expect(screen.getByText(/Belum ada assignment/i)).toBeInTheDocument();
    });

    it('renders assignment data correctly', () => {
        render(
            <AssignmentTable
                assignments={mockEstateAssignments}
                type="estate"
                onRemove={mockOnRemove}
            />
        );

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Kebun Utara')).toBeInTheDocument();
        expect(screen.getByText('Kebun Selatan')).toBeInTheDocument();
        expect(screen.getByText('MANDOR')).toBeInTheDocument();
        expect(screen.getByText('ASISTEN')).toBeInTheDocument();
    });

    it('displays estate codes', () => {
        render(
            <AssignmentTable
                assignments={mockEstateAssignments}
                type="estate"
                onRemove={mockOnRemove}
            />
        );

        expect(screen.getByText('KBU')).toBeInTheDocument();
        expect(screen.getByText('KBS')).toBeInTheDocument();
    });

    it('calls onRemove when delete button is clicked', () => {
        render(
            <AssignmentTable
                assignments={mockEstateAssignments}
                type="estate"
                onRemove={mockOnRemove}
            />
        );

        const deleteButtons = screen.getAllByRole('button');
        fireEvent.click(deleteButtons[0]);

        expect(mockOnRemove).toHaveBeenCalledWith('1');
    });

    it('disables delete buttons when isRemoving is true', () => {
        render(
            <AssignmentTable
                assignments={mockEstateAssignments}
                type="estate"
                onRemove={mockOnRemove}
                isRemoving={true}
            />
        );

        const deleteButtons = screen.getAllByRole('button');
        deleteButtons.forEach(button => {
            expect(button).toBeDisabled();
        });
    });

    it('formats assigned date correctly', () => {
        render(
            <AssignmentTable
                assignments={mockEstateAssignments}
                type="estate"
                onRemove={mockOnRemove}
            />
        );

        // Check that dates are rendered (format may vary based on locale)
        const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
    });

    it('renders correct table headers for estate type', () => {
        render(
            <AssignmentTable
                assignments={mockEstateAssignments}
                type="estate"
                onRemove={mockOnRemove}
            />
        );

        expect(screen.getByText('User')).toBeInTheDocument();
        expect(screen.getByText('Estate')).toBeInTheDocument();
        expect(screen.getByText('Code')).toBeInTheDocument();
        expect(screen.getByText('Role')).toBeInTheDocument();
        expect(screen.getByText('Assigned At')).toBeInTheDocument();
        expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('handles assignments with missing related data gracefully', () => {
        const incompleteAssignment: UserEstateAssignment[] = [
            {
                id: '3',
                userId: 'user3',
                estateId: 'estate3',
                role: 'MANAGER',
                assignedBy: 'admin1',
                assignedAt: '2024-01-17T10:00:00Z',
            },
        ];

        render(
            <AssignmentTable
                assignments={incompleteAssignment}
                type="estate"
                onRemove={mockOnRemove}
            />
        );

        // Should render dashes for missing data
        expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
});
