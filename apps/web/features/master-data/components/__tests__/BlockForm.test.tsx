import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { BlockForm } from '../BlockForm';
import type { CreateBlockInput } from '@/types/master-data';

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

const mockDivisions = [
    { id: '1', name: 'Afdeling A', code: 'AFA' },
    { id: '2', name: 'Afdeling B', code: 'AFB' },
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

jest.mock('../hooks/useDivisions', () => ({
    useDivisions: () => ({
        divisions: mockDivisions,
        isLoading: false,
    }),
}));

describe('BlockForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all form fields', () => {
        render(
            <MockedProvider>
                <BlockForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        expect(screen.getByLabelText(/Company/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Estate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Division/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Kode Blok/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nama Blok/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Luas \(Hektar\)/i)).toBeInTheDocument();
    });

    it('disables estate and division until company is selected', () => {
        render(
            <MockedProvider>
                <BlockForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const estateSelect = screen.getByLabelText(/Estate/i);
        const divisionSelect = screen.getByLabelText(/Division/i);

        expect(estateSelect).toBeDisabled();
        expect(divisionSelect).toBeDisabled();
    });

    it('enables estate after company selection', async () => {
        render(
            <MockedProvider>
                <BlockForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
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
                <BlockForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const submitButton = screen.getByRole('button', { name: /Simpan/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Company wajib dipilih/i)).toBeInTheDocument();
            expect(screen.getByText(/Kode blok minimal 2 karakter/i)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('submits form with valid data', async () => {
        render(
            <MockedProvider>
                <BlockForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        // Fill in form
        fireEvent.change(screen.getByLabelText(/Company/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Estate/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Division/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Kode Blok/i), { target: { value: 'BLK001' } });
        fireEvent.change(screen.getByLabelText(/Nama Blok/i), { target: { value: 'Test Block' } });
        fireEvent.change(screen.getByLabelText(/Luas \(Hektar\)/i), { target: { value: '10.5' } });

        const submitButton = screen.getByRole('button', { name: /Simpan/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    blockCode: 'BLK001',
                    name: 'Test Block',
                    companyId: '1',
                    estateId: '1',
                    divisionId: '1',
                    luasHa: 10.5,
                })
            );
        });
    });

    it('calls onCancel when cancel button is clicked', () => {
        render(
            <MockedProvider>
                <BlockForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        const cancelButton = screen.getByRole('button', { name: /Batal/i });
        fireEvent.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('pre-fills form when editing existing block', () => {
        const existingBlock = {
            id: '1',
            blockCode: 'BLK001',
            name: 'Existing Block',
            companyId: '1',
            estateId: '1',
            divisionId: '1',
            luasHa: 15.0,
            jumlahPohon: 2000,
            plantingYear: 2020,
            cropType: 'Kelapa Sawit',
            targetPanen: 600,
            deskripsi: 'Test description',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        render(
            <MockedProvider>
                <BlockForm block={existingBlock} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
            </MockedProvider>
        );

        expect(screen.getByDisplayValue('BLK001')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing Block')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    });

    it('shows loading state during submission', () => {
        render(
            <MockedProvider>
                <BlockForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />
            </MockedProvider>
        );

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Simpan/i })).toBeDisabled();
    });
});
