import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { DivisionForm } from '../DivisionForm';
import type { CreateDivisionInput } from '@/types/master-data';

const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

const mockCompanies = [
    { id: '1', name: 'PT Agrinova', code: 'AGR' },
    { id: '2', name: 'PT Sawit Jaya', code: 'SWT' },
];

const mockEstates = [
    { id: '1', name: 'Kebun Utara', code: 'KBU' },
    { id: '2', name: 'Kebun Selatan', code: 'KBS' },
];

// Mock the custom hooks
jest.mock('../hooks/useCompanies', () => ({
    useCompanies: () => ({
        companies: mockCompanies,
        isLoading: false,
    }),
}));

jest.mock('../hooks/useEstates', () => ({
    useEstates: () => ({
        estates: mockEstates,
        isLoading: false,
    }),
}));

describe('DivisionForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all form fields', () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        expect(screen.getByLabelText(/Company/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Estate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Kode Divisi/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nama Divisi/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Luas \(Hektar\)/i)).toBeInTheDocument();
    });

    it('disables estate until company is selected', () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const estateSelect = screen.getByLabelText(/Estate/i);
        expect(estateSelect).toBeDisabled();
    });

    it('enables estate after company selection', async () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const companySelect = screen.getByLabelText(/Company/i);
        fireEvent.change(companySelect, { target: { value: '1' } });

        await waitFor(() => {
            const estateSelect = screen.getByLabelText(/Estate/i);
            expect(estateSelect).not.toBeDisabled();
        });
    });

    it('validates required fields', async () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const submitButton = screen.getByRole('button', { name: /Simpan/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Company wajib dipilih/i)).toBeInTheDocument();
            expect(screen.getByText(/Kode divisi minimal 2 karakter/i)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('submits form with valid data', async () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        // Fill in form
        fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Estate/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Kode Divisi/i), { target: { value: 'DIV001' } });
        fireEvent.change(screen.getByLabelText(/Nama Divisi/i), { target: { value: 'Test Division' } });
        fireEvent.change(screen.getByLabelText(/Luas \(Hektar\)/i), { target: { value: '100.5' } });

        const submitButton = screen.getByRole('button', { name: /Simpan/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    code: 'DIV001',
                    name: 'Test Division',
                    companyId: '1',
                    estateId: '1',
                    luasHa: 100.5,
                })
            );
        });
    });

    it('calls onCancel when cancel button is clicked', () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const cancelButton = screen.getByRole('button', { name: /Batal/i });
        fireEvent.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('pre-fills form when editing existing division', () => {
        const existingDivision = {
            id: '1',
            code: 'DIV001',
            name: 'Existing Division',
            companyId: '1',
            estateId: '1',
            managerId: 'mgr-1',
            luasHa: 150.0,
            deskripsi: 'Test description',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        render(
            <MockedProvider>
                <DivisionForm division={existingDivision} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        expect(screen.getByDisplayValue('DIV001')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing Division')).toBeInTheDocument();
        expect(screen.getByDisplayValue('150')).toBeInTheDocument();
    });

    it('shows loading state during submission', () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />
            </MockedProvider>
        );

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Simpan/i })).toBeDisabled();
    });

    it('allows optional manager ID input', () => {
        render(
            <MockedProvider>
                <DivisionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const managerInput = screen.getByLabelText(/Manager ID/i);
        expect(managerInput).toBeInTheDocument();

        fireEvent.change(managerInput, { target: { value: 'mgr-123' } });
        expect(managerInput).toHaveValue('mgr-123');
    });
});
