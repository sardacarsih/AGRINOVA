"use client";

import React, { useEffect, useMemo, useState } from "react";
import { gql } from "graphql-tag";
import { useMutation, useQuery } from "@apollo/client/react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Pencil, Plus, ReceiptText, Trash2, Upload } from "lucide-react";

interface VehicleTaxSectionProps {
  vehicles: Array<{
    id: string;
    registrationPlate: string;
    brand: string;
    model: string;
    assignedDriverName?: string | null;
    companyId: string;
  }>;
  companyMap: Map<string, string>;
}

type VehicleTaxStatus = "OPEN" | "PAID" | "OVERDUE" | "VOID";
type VehicleTaxDocumentType = "BUKTI_BAYAR" | "STNK" | "NOTICE" | "OTHER";

interface VehicleTaxRecord {
  id: string;
  vehicleId: string;
  taxYear: number;
  dueDate: string;
  pkbAmount: number;
  swdklljAmount: number;
  adminAmount: number;
  penaltyAmount: number;
  totalAmount: number;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  taxStatus: VehicleTaxStatus | string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VehicleTaxesQuery {
  vehicleTaxes: VehicleTaxRecord[];
}

interface VehicleTaxDocumentRecord {
  id: string;
  vehicleTaxId: string;
  documentType: VehicleTaxDocumentType | string;
  filePath: string;
  uploadedBy?: number | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface VehicleTaxDocumentsQuery {
  vehicleTaxDocuments: VehicleTaxDocumentRecord[];
}

interface CreateVehicleTaxMutation {
  createVehicleTax: VehicleTaxRecord;
}

interface UpdateVehicleTaxMutation {
  updateVehicleTax: VehicleTaxRecord;
}

interface DeleteVehicleTaxMutation {
  deleteVehicleTax: boolean;
}

interface CreateVehicleTaxDocumentMutation {
  createVehicleTaxDocument: VehicleTaxDocumentRecord;
}

interface DeleteVehicleTaxDocumentMutation {
  deleteVehicleTaxDocument: boolean;
}

interface VehicleTaxFormState {
  taxYear: string;
  dueDate: string;
  pkbAmount: string;
  swdklljAmount: string;
  adminAmount: string;
  penaltyAmount: string;
  paymentDate: string;
  paymentMethod: string;
  paymentReference: string;
  taxStatus: VehicleTaxStatus;
  notes: string;
}

const VEHICLE_TAX_FIELDS = gql`
  fragment VehicleTaxFields on VehicleTax {
    id
    vehicleId
    taxYear
    dueDate
    pkbAmount
    swdklljAmount
    adminAmount
    penaltyAmount
    totalAmount
    paymentDate
    paymentMethod
    paymentReference
    taxStatus
    notes
    createdAt
    updatedAt
  }
`;

const GET_VEHICLE_TAXES = gql`
  ${VEHICLE_TAX_FIELDS}
  query GetVehicleTaxes($vehicleId: ID!, $taxStatus: String) {
    vehicleTaxes(vehicleId: $vehicleId, taxStatus: $taxStatus) {
      ...VehicleTaxFields
    }
  }
`;

const CREATE_VEHICLE_TAX = gql`
  ${VEHICLE_TAX_FIELDS}
  mutation CreateVehicleTax($input: CreateVehicleTaxInput!) {
    createVehicleTax(input: $input) {
      ...VehicleTaxFields
    }
  }
`;

const UPDATE_VEHICLE_TAX = gql`
  ${VEHICLE_TAX_FIELDS}
  mutation UpdateVehicleTax($input: UpdateVehicleTaxInput!) {
    updateVehicleTax(input: $input) {
      ...VehicleTaxFields
    }
  }
`;

const DELETE_VEHICLE_TAX = gql`
  mutation DeleteVehicleTax($id: ID!) {
    deleteVehicleTax(id: $id)
  }
`;

const VEHICLE_TAX_DOCUMENT_FIELDS = gql`
  fragment VehicleTaxDocumentFields on VehicleTaxDocument {
    id
    vehicleTaxId
    documentType
    filePath
    uploadedBy
    uploadedAt
    createdAt
    updatedAt
  }
`;

const GET_VEHICLE_TAX_DOCUMENTS = gql`
  ${VEHICLE_TAX_DOCUMENT_FIELDS}
  query GetVehicleTaxDocuments($vehicleTaxId: ID!) {
    vehicleTaxDocuments(vehicleTaxId: $vehicleTaxId) {
      ...VehicleTaxDocumentFields
    }
  }
`;

const CREATE_VEHICLE_TAX_DOCUMENT = gql`
  ${VEHICLE_TAX_DOCUMENT_FIELDS}
  mutation CreateVehicleTaxDocument($input: CreateVehicleTaxDocumentInput!) {
    createVehicleTaxDocument(input: $input) {
      ...VehicleTaxDocumentFields
    }
  }
`;

const DELETE_VEHICLE_TAX_DOCUMENT = gql`
  mutation DeleteVehicleTaxDocument($id: ID!) {
    deleteVehicleTaxDocument(id: $id)
  }
`;

const EMPTY_FORM: VehicleTaxFormState = {
  taxYear: "",
  dueDate: "",
  pkbAmount: "0",
  swdklljAmount: "0",
  adminAmount: "0",
  penaltyAmount: "0",
  paymentDate: "",
  paymentMethod: "",
  paymentReference: "",
  taxStatus: "OPEN",
  notes: "",
};

const VEHICLE_TAX_DOCUMENT_TYPE_OPTIONS: Array<{ value: VehicleTaxDocumentType; label: string }> = [
  { value: "BUKTI_BAYAR", label: "Bukti Bayar" },
  { value: "STNK", label: "STNK" },
  { value: "NOTICE", label: "Notice" },
  { value: "OTHER", label: "Other" },
];

interface UploadVehicleTaxDocumentResponse {
  success?: boolean;
  message?: string;
  filePath?: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString("id-ID") : "-";

const toDateInput = (value?: string | null): string => (value ? value.slice(0, 10) : "");

const toFloat = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const toOptionalDateTime = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return `${trimmed}T00:00:00.000Z`;
};

export function VehicleTaxSection({ vehicles, companyMap }: VehicleTaxSectionProps) {
  const { toast } = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [taxStatusFilter, setTaxStatusFilter] = useState<string>("ALL");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<VehicleTaxRecord | null>(null);
  const [deletingTax, setDeletingTax] = useState<VehicleTaxRecord | null>(null);
  const [form, setForm] = useState<VehicleTaxFormState>(EMPTY_FORM);
  const [documentTax, setDocumentTax] = useState<VehicleTaxRecord | null>(null);
  const [documentType, setDocumentType] = useState<VehicleTaxDocumentType>("BUKTI_BAYAR");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  useEffect(() => {
    if (vehicles.length === 0) {
      setSelectedVehicleId("");
      return;
    }
    setSelectedVehicleId((previous) => {
      if (previous && vehicles.some((vehicle) => vehicle.id === previous)) return previous;
      return vehicles[0].id;
    });
  }, [vehicles]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  const { data, loading, refetch: refetchTaxes } = useQuery<VehicleTaxesQuery>(GET_VEHICLE_TAXES, {
    variables: {
      vehicleId: selectedVehicleId,
      taxStatus: taxStatusFilter === "ALL" ? undefined : taxStatusFilter,
    },
    skip: !selectedVehicleId,
    fetchPolicy: "cache-and-network",
  });

  const [createVehicleTax, { loading: creating }] = useMutation<CreateVehicleTaxMutation>(CREATE_VEHICLE_TAX, {
    onCompleted: (result) => {
      toast({ title: "Transaksi pajak dibuat", description: `Tahun ${result.createVehicleTax.taxYear} berhasil ditambahkan.` });
      setIsFormOpen(false);
      setEditingTax(null);
      setForm(EMPTY_FORM);
      void refetchTaxes();
    },
    onError: (error) => toast({ title: "Gagal menambah pajak", description: error.message, variant: "destructive" }),
  });

  const [updateVehicleTax, { loading: updating }] = useMutation<UpdateVehicleTaxMutation>(UPDATE_VEHICLE_TAX, {
    onCompleted: () => {
      toast({ title: "Transaksi pajak diperbarui" });
      setIsFormOpen(false);
      setEditingTax(null);
      setForm(EMPTY_FORM);
      void refetchTaxes();
    },
    onError: (error) => toast({ title: "Gagal memperbarui pajak", description: error.message, variant: "destructive" }),
  });

  const [deleteVehicleTax, { loading: deleting }] = useMutation<DeleteVehicleTaxMutation>(DELETE_VEHICLE_TAX, {
    onCompleted: () => {
      toast({ title: "Transaksi pajak dihapus" });
      setDeletingTax(null);
      void refetchTaxes();
    },
    onError: (error) => toast({ title: "Gagal menghapus pajak", description: error.message, variant: "destructive" }),
  });

  const { data: vehicleTaxDocumentsData, loading: loadingDocuments, refetch: refetchDocuments } =
    useQuery<VehicleTaxDocumentsQuery>(GET_VEHICLE_TAX_DOCUMENTS, {
      variables: { vehicleTaxId: documentTax?.id || "" },
      skip: !documentTax?.id,
      fetchPolicy: "cache-and-network",
    });

  const [createVehicleTaxDocument] =
    useMutation<CreateVehicleTaxDocumentMutation>(CREATE_VEHICLE_TAX_DOCUMENT, {
      onError: (error) =>
        toast({ title: "Gagal menyimpan dokumen pajak", description: error.message, variant: "destructive" }),
    });

  const [deleteVehicleTaxDocument, { loading: deletingDocument }] =
    useMutation<DeleteVehicleTaxDocumentMutation>(DELETE_VEHICLE_TAX_DOCUMENT, {
      onCompleted: () => {
        toast({ title: "Dokumen pajak dihapus" });
        void refetchDocuments();
      },
      onError: (error) =>
        toast({ title: "Gagal menghapus dokumen pajak", description: error.message, variant: "destructive" }),
    });

  const taxes = useMemo(() => data?.vehicleTaxes || [], [data?.vehicleTaxes]);
  const documents = useMemo(
    () => vehicleTaxDocumentsData?.vehicleTaxDocuments || [],
    [vehicleTaxDocumentsData?.vehicleTaxDocuments],
  );
  const totalDue = useMemo(() => taxes.reduce((sum, item) => sum + (item.totalAmount || 0), 0), [taxes]);
  const formTotal = useMemo(
    () => toFloat(form.pkbAmount) + toFloat(form.swdklljAmount) + toFloat(form.adminAmount) + toFloat(form.penaltyAmount),
    [form.pkbAmount, form.swdklljAmount, form.adminAmount, form.penaltyAmount],
  );

  const openCreateDialog = () => {
    setEditingTax(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditDialog = (tax: VehicleTaxRecord) => {
    setEditingTax(tax);
    setForm({
      taxYear: String(tax.taxYear),
      dueDate: toDateInput(tax.dueDate),
      pkbAmount: String(tax.pkbAmount || 0),
      swdklljAmount: String(tax.swdklljAmount || 0),
      adminAmount: String(tax.adminAmount || 0),
      penaltyAmount: String(tax.penaltyAmount || 0),
      paymentDate: toDateInput(tax.paymentDate),
      paymentMethod: tax.paymentMethod || "",
      paymentReference: tax.paymentReference || "",
      taxStatus: (tax.taxStatus as VehicleTaxStatus) || "OPEN",
      notes: tax.notes || "",
    });
    setIsFormOpen(true);
  };

  const openDocumentDialog = (tax: VehicleTaxRecord) => {
    setDocumentTax(tax);
    setDocumentType("BUKTI_BAYAR");
    setDocumentFile(null);
  };

  const handleUploadDocument = async () => {
    if (!documentTax) return;
    if (!documentFile) {
      toast({ title: "Validasi gagal", description: "Pilih file dokumen terlebih dahulu.", variant: "destructive" });
      return;
    }

    try {
      setIsUploadingDocument(true);
      const formData = new FormData();
      formData.append("vehicleTaxId", documentTax.id);
      formData.append("documentType", documentType);
      formData.append("file", documentFile);

      const response = await fetch("/api/vehicle-tax-documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const uploadResult = (await response.json().catch(() => null)) as UploadVehicleTaxDocumentResponse | null;
      if (!response.ok || !uploadResult?.success || !uploadResult.filePath) {
        throw new Error(uploadResult?.message || "Upload dokumen gagal.");
      }

      await createVehicleTaxDocument({
        variables: {
          input: {
            vehicleTaxId: documentTax.id,
            documentType,
            filePath: uploadResult.filePath,
          },
        },
      });

      toast({ title: "Dokumen pajak berhasil diunggah" });
      setDocumentFile(null);
      void refetchDocuments();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Upload dokumen gagal.";
      toast({ title: "Gagal upload dokumen", description: message, variant: "destructive" });
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVehicleId) return;
    const taxYear = Number.parseInt(form.taxYear.trim(), 10);
    if (Number.isNaN(taxYear) || taxYear < 1900 || taxYear > 2100) {
      toast({ title: "Validasi gagal", description: "Tax year harus di antara 1900 - 2100.", variant: "destructive" });
      return;
    }
    if (!form.dueDate.trim()) {
      toast({ title: "Validasi gagal", description: "Tanggal jatuh tempo wajib diisi.", variant: "destructive" });
      return;
    }

    const payload = {
      taxYear,
      dueDate: `${form.dueDate}T00:00:00.000Z`,
      pkbAmount: toFloat(form.pkbAmount),
      swdklljAmount: toFloat(form.swdklljAmount),
      adminAmount: toFloat(form.adminAmount),
      penaltyAmount: toFloat(form.penaltyAmount),
      totalAmount: formTotal,
      paymentDate: toOptionalDateTime(form.paymentDate),
      paymentMethod: toOptionalString(form.paymentMethod),
      paymentReference: toOptionalString(form.paymentReference),
      taxStatus: form.taxStatus,
      notes: toOptionalString(form.notes),
    };

    if (editingTax) {
      await updateVehicleTax({ variables: { input: { id: editingTax.id, ...payload } } });
      return;
    }

    await createVehicleTax({ variables: { input: { vehicleId: selectedVehicleId, ...payload } } });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" />Transaksi Vehicle Tax</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Sub Unit Kendaraan untuk monitoring PKB/SWDKLLJ per tahun.</p>
          </div>
          <Button onClick={openCreateDialog} disabled={!selectedVehicleId || creating || updating}><Plus className="mr-2 h-4 w-4" />Tambah Transaksi</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} disabled={vehicles.length === 0}>
            <SelectTrigger><SelectValue placeholder="Pilih kendaraan" /></SelectTrigger>
            <SelectContent>{vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.registrationPlate} - {vehicle.brand} {vehicle.model}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={taxStatusFilter} onValueChange={setTaxStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Filter status pajak" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="PAID">PAID</SelectItem>
              <SelectItem value="OVERDUE">OVERDUE</SelectItem>
              <SelectItem value="VOID">VOID</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-md border px-3 py-2 text-sm"><span className="text-muted-foreground">Total Nilai Pajak: </span><span className="font-semibold">{formatCurrency(totalDue)}</span></div>
        </div>

        {selectedVehicle ? (
          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="font-semibold">{selectedVehicle.registrationPlate}</div>
            <p className="text-muted-foreground">Unit: {selectedVehicle.brand} {selectedVehicle.model} | Driver: {selectedVehicle.assignedDriverName || "-"} | Company: {companyMap.get(selectedVehicle.companyId) || selectedVehicle.companyId}</p>
          </div>
        ) : null}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Tahun</TableHead><TableHead>Due Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Pembayaran</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Memuat transaksi pajak...</TableCell></TableRow>
              ) : taxes.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Belum ada transaksi pajak.</TableCell></TableRow>
              ) : (
                taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell>{tax.taxYear}</TableCell>
                    <TableCell>{formatDate(tax.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(tax.totalAmount)}</TableCell>
                    <TableCell><Badge variant={tax.taxStatus === "PAID" ? "default" : "outline"}>{tax.taxStatus}</Badge></TableCell>
                    <TableCell>{tax.paymentDate ? `${formatDate(tax.paymentDate)} (${tax.paymentMethod || "-"})` : "-"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDocumentDialog(tax)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(tax)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeletingTax(tax)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setEditingTax(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingTax ? "Edit Transaksi Pajak" : "Tambah Transaksi Pajak"}</DialogTitle><DialogDescription>Isi nominal pajak dan status pembayaran per tahun.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="taxYear">Tax Year *</Label><Input id="taxYear" type="number" min={1900} max={2100} value={form.taxYear} onChange={(event) => setForm((prev) => ({ ...prev, taxYear: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="dueDate">Due Date *</Label><Input id="dueDate" type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="pkbAmount">PKB</Label><Input id="pkbAmount" type="number" min={0} step="0.01" value={form.pkbAmount} onChange={(event) => setForm((prev) => ({ ...prev, pkbAmount: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="swdklljAmount">SWDKLLJ</Label><Input id="swdklljAmount" type="number" min={0} step="0.01" value={form.swdklljAmount} onChange={(event) => setForm((prev) => ({ ...prev, swdklljAmount: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="adminAmount">Admin</Label><Input id="adminAmount" type="number" min={0} step="0.01" value={form.adminAmount} onChange={(event) => setForm((prev) => ({ ...prev, adminAmount: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="penaltyAmount">Denda</Label><Input id="penaltyAmount" type="number" min={0} step="0.01" value={form.penaltyAmount} onChange={(event) => setForm((prev) => ({ ...prev, penaltyAmount: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="taxStatus">Tax Status</Label><Select value={form.taxStatus} onValueChange={(value) => setForm((prev) => ({ ...prev, taxStatus: value as VehicleTaxStatus }))}><SelectTrigger id="taxStatus"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPEN">OPEN</SelectItem><SelectItem value="PAID">PAID</SelectItem><SelectItem value="OVERDUE">OVERDUE</SelectItem><SelectItem value="VOID">VOID</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="paymentDate">Payment Date</Label><Input id="paymentDate" type="date" value={form.paymentDate} onChange={(event) => setForm((prev) => ({ ...prev, paymentDate: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="paymentMethod">Payment Method</Label><Input id="paymentMethod" value={form.paymentMethod} onChange={(event) => setForm((prev) => ({ ...prev, paymentMethod: event.target.value }))} placeholder="Transfer / Cash / Virtual Account" /></div>
            <div className="space-y-2"><Label htmlFor="paymentReference">Payment Reference</Label><Input id="paymentReference" value={form.paymentReference} onChange={(event) => setForm((prev) => ({ ...prev, paymentReference: event.target.value }))} placeholder="No. transaksi / bukti bayar" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Total (otomatis)</Label><Input value={formatCurrency(formTotal)} disabled={true} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="taxNotes">Catatan</Label><Textarea id="taxNotes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} rows={3} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button><Button onClick={() => void handleSave()} disabled={creating || updating}>{creating || updating ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(documentTax)}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentTax(null);
            setDocumentFile(null);
            setDocumentType("BUKTI_BAYAR");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dokumen Pajak Kendaraan</DialogTitle>
            <DialogDescription>
              {documentTax ? `Upload dokumen untuk pajak tahun ${documentTax.taxYear}.` : "Upload dokumen pajak kendaraan."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="vehicleTaxDocumentType">Tipe Dokumen</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value as VehicleTaxDocumentType)}
                >
                  <SelectTrigger id="vehicleTaxDocumentType">
                    <SelectValue placeholder="Pilih tipe dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TAX_DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="vehicleTaxDocumentFile">File Dokumen</Label>
                <Input
                  id="vehicleTaxDocumentFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span className="text-muted-foreground">
                {documentFile ? `File dipilih: ${documentFile.name}` : "Belum ada file dipilih."}
              </span>
              <Button onClick={() => void handleUploadDocument()} disabled={!documentFile || isUploadingDocument}>
                <Upload className="mr-2 h-4 w-4" />
                {isUploadingDocument ? "Mengunggah..." : "Upload Dokumen"}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipe</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDocuments ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Memuat dokumen pajak...
                      </TableCell>
                    </TableRow>
                  ) : documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        Belum ada dokumen pajak.
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>{document.documentType}</TableCell>
                        <TableCell>
                          <a
                            href={document.filePath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-primary underline"
                          >
                            Lihat Dokumen
                          </a>
                        </TableCell>
                        <TableCell>{formatDate(document.uploadedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              void deleteVehicleTaxDocument({ variables: { id: document.id } })
                            }
                            disabled={deletingDocument}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentTax(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingTax)} onOpenChange={(open) => !open && setDeletingTax(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi pajak?</AlertDialogTitle>
            <AlertDialogDescription>Data pajak tahun <span className="font-semibold">{deletingTax?.taxYear}</span> akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingTax && void deleteVehicleTax({ variables: { id: deletingTax.id } })} disabled={deleting}>{deleting ? "Menghapus..." : "Hapus"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
