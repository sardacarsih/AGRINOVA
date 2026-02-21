"use client";

import React, { useEffect, useMemo, useState } from "react";
import { gql } from "graphql-tag";
import { useMutation, useQuery } from "@apollo/client/react";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import { type UserRole } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Car, Pencil, Plus, Printer, QrCode, RefreshCw, Search, Trash2, Truck } from "lucide-react";
import { CompanyAdminDashboardLayout } from "@/components/layouts/role-layouts/CompanyAdminDashboardLayout";
import { SuperAdminDashboardLayout } from "@/components/layouts/role-layouts/SuperAdminDashboardLayout";
import { AreaManagerDashboardLayout } from "@/components/layouts/role-layouts/AreaManagerDashboardLayout";
import { ManagerDashboardLayout } from "@/components/layouts/role-layouts/ManagerDashboardLayout";
import { SatpamDashboardLayout } from "@/components/layouts/role-layouts/SatpamDashboardLayout";
import { VehicleTaxSection } from "./VehicleTaxSection";

interface VehicleManagementPageProps {
  user?: {
    role?: string;
    companyId?: string | null;
    company?: string | { id?: string | null; name?: string | null } | null;
    companies?: Array<{ id?: string | null; name?: string | null } | null> | null;
    assignedCompanies?: Array<string | null> | null;
    assignedCompanyNames?: Array<string | null> | null;
    companyAdminFor?: Array<string | null> | null;
  };
  locale?: string;
}

type VehicleCategory = "CAR" | "MOTORCYCLE" | "TRUCK" | "HEAVY_EQUIPMENT";
type VehicleLifecycleStatus = "ACTIVE" | "INACTIVE" | "SOLD" | "SCRAPPED" | "TRANSFERRED";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

interface VehicleRecord {
  id: string;
  companyId: string;
  registrationPlate: string;
  chassisNumber: string;
  engineNumber: string;
  manufactureYear: number;
  vehicleCategory: VehicleCategory | string;
  brand: string;
  model: string;
  registrationRegion?: string | null;
  vehicleType: string;
  assignedDriverName?: string | null;
  notes?: string | null;
  isActive: boolean;
  status: VehicleLifecycleStatus | string;
  deactivatedAt?: string | null;
  stnkExpiryDate?: string | null;
  kirExpiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VehicleFormState {
  registrationPlate: string;
  chassisNumber: string;
  engineNumber: string;
  manufactureYear: string;
  vehicleCategory: VehicleCategory;
  brand: string;
  model: string;
  registrationRegion: string;
  vehicleType: string;
  assignedDriverName: string;
  notes: string;
  isActive: boolean;
  status: VehicleLifecycleStatus;
  stnkExpiryDate: string;
  kirExpiryDate: string;
}

interface CompanyOption { id: string; name: string; }
interface CompanyContextQuery { companies: { data: CompanyOption[] } }
interface VehiclesQuery { vehicles: VehicleRecord[] }
interface VehiclesPaginatedQuery {
  vehiclesPaginated: {
    data: VehicleRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}
interface CreateVehicleMutation { createVehicle: VehicleRecord }
interface UpdateVehicleMutation { updateVehicle: VehicleRecord }
interface DeleteVehicleMutation { deleteVehicle: boolean }

const GET_COMPANY_CONTEXT = gql`
  query GetVehicleCompanyContext {
    companies(page: 1, limit: 200) {
      data { id name }
    }
  }
`;

const VEHICLE_FIELDS = gql`
  fragment VehicleFields on Vehicle {
    id companyId registrationPlate chassisNumber engineNumber manufactureYear vehicleCategory
    brand model registrationRegion vehicleType assignedDriverName notes isActive status
    deactivatedAt stnkExpiryDate kirExpiryDate createdAt updatedAt
  }
`;

const GET_VEHICLES = gql`
  ${VEHICLE_FIELDS}
  query GetVehicles($companyId: ID, $search: String, $isActive: Boolean) {
    vehicles(companyId: $companyId, search: $search, isActive: $isActive) { ...VehicleFields }
  }
`;

const GET_VEHICLES_PAGINATED = gql`
  ${VEHICLE_FIELDS}
  query GetVehiclesPaginated($companyId: ID, $search: String, $isActive: Boolean, $page: Int, $limit: Int) {
    vehiclesPaginated(companyId: $companyId, search: $search, isActive: $isActive, page: $page, limit: $limit) {
      data { ...VehicleFields }
      pagination { page limit total pages }
    }
  }
`;

const CREATE_VEHICLE = gql`
  ${VEHICLE_FIELDS}
  mutation CreateVehicle($input: CreateVehicleInput!) {
    createVehicle(input: $input) { ...VehicleFields }
  }
`;

const UPDATE_VEHICLE = gql`
  ${VEHICLE_FIELDS}
  mutation UpdateVehicle($input: UpdateVehicleInput!) {
    updateVehicle(input: $input) { ...VehicleFields }
  }
`;

const DELETE_VEHICLE = gql`
  mutation DeleteVehicle($id: ID!) { deleteVehicle(id: $id) }
`;

const EMPTY_FORM: VehicleFormState = {
  registrationPlate: "", chassisNumber: "", engineNumber: "", manufactureYear: "",
  vehicleCategory: "TRUCK", brand: "", model: "", registrationRegion: "", vehicleType: "TRUCK",
  assignedDriverName: "", notes: "", isActive: true, status: "ACTIVE", stnkExpiryDate: "", kirExpiryDate: "",
};

const VEHICLE_CATEGORY_OPTIONS: Array<{ value: VehicleCategory; label: string }> = [
  { value: "CAR", label: "Car" },
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "TRUCK", label: "Truck" },
  { value: "HEAVY_EQUIPMENT", label: "Heavy Equipment" },
];

const VEHICLE_STATUS_OPTIONS: Array<{ value: VehicleLifecycleStatus; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SOLD", label: "Sold" },
  { value: "SCRAPPED", label: "Scrapped" },
  { value: "TRANSFERRED", label: "Transferred" },
];

const escapeHtml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const normalizeRegistrationPlate = (value: string): string => value.toUpperCase().replace(/\s+/g, " ").trim();
const normalizeRole = (role?: string): UserRole =>
  (role || "COMPANY_ADMIN").toString().trim().toUpperCase().replace(/[\s-]+/g, "_") as UserRole;

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const toDateInput = (value?: string | null): string => (value ? value.slice(0, 10) : "");
const toOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};
const toOptionalDateTime = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? `${trimmed}T00:00:00.000Z` : undefined;
};

const isVehicleCategory = (value: string): value is VehicleCategory => VEHICLE_CATEGORY_OPTIONS.some((it) => it.value === value);
const isVehicleStatus = (value: string): value is VehicleLifecycleStatus => VEHICLE_STATUS_OPTIONS.some((it) => it.value === value);

const buildVehicleQrPayload = (vehicle: VehicleRecord): string => JSON.stringify({
  type: "agrinova_vehicle", version: "3.0", vehicleId: vehicle.id, companyId: vehicle.companyId,
  registrationPlate: vehicle.registrationPlate, chassisNumber: vehicle.chassisNumber, engineNumber: vehicle.engineNumber,
  manufactureYear: vehicle.manufactureYear, vehicleCategory: vehicle.vehicleCategory, brand: vehicle.brand, model: vehicle.model,
  registrationRegion: vehicle.registrationRegion || null, vehicleType: vehicle.vehicleType,
  assignedDriverName: vehicle.assignedDriverName || null, status: vehicle.status, isActive: vehicle.isActive, updatedAt: vehicle.updatedAt,
});

const resolveUserCompanyOptions = (user: VehicleManagementPageProps["user"]): CompanyOption[] => {
  const companyMap = new Map<string, string>();
  const addCompany = (id?: string | null, name?: string | null) => {
    const normalizedId = (id || "").trim();
    if (!normalizedId) return;
    const normalizedName = (name || "").trim();
    if (!companyMap.has(normalizedId)) companyMap.set(normalizedId, normalizedName || normalizedId);
    else if (!companyMap.get(normalizedId) && normalizedName) companyMap.set(normalizedId, normalizedName);
  };
  if (!user) return [];
  if (typeof user.company === "object" && user.company) addCompany(user.company.id, user.company.name);
  if (typeof user.company === "string") addCompany(user.companyId, user.company);
  else addCompany(user.companyId, null);
  user.companies?.forEach((company) => addCompany(company?.id, company?.name));
  const assignedNames = user.assignedCompanyNames || [];
  user.assignedCompanies?.forEach((companyId, index) => addCompany(companyId, assignedNames[index] || null));
  user.companyAdminFor?.forEach((companyId, index) => addCompany(companyId, assignedNames[index] || null));
  return Array.from(companyMap.entries()).map(([id, name]) => ({ id, name }));
};

const getCompanyNameByID = (companies: CompanyOption[], companyID: string): string => companies.find((company) => company.id === companyID)?.name || companyID;

export default function VehicleManagementPage({ user }: VehicleManagementPageProps) {
  const { toast } = useToast();
  const normalizedRole = normalizeRole(user?.role);
  const isSuperAdmin = normalizedRole === "SUPER_ADMIN";
  const pageSize = 10;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedCompanyID, setSelectedCompanyID] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<VehicleRecord | null>(null);
  const [qrVehicle, setQrVehicle] = useState<VehicleRecord | null>(null);
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM);
  const [isPrinting, setIsPrinting] = useState(false);

  const userScopedCompanies = useMemo(() => resolveUserCompanyOptions(user), [user]);

  const { data: superAdminCompanyData, loading: loadingCompanies, error: companyError, refetch: refetchCompanies } =
    useQuery<CompanyContextQuery>(GET_COMPANY_CONTEXT, { skip: !isSuperAdmin });

  const availableCompanies = useMemo(() => {
    if (isSuperAdmin) return superAdminCompanyData?.companies?.data || [];
    return userScopedCompanies;
  }, [isSuperAdmin, superAdminCompanyData?.companies?.data, userScopedCompanies]);

  useEffect(() => {
    if (availableCompanies.length === 0) {
      setSelectedCompanyID("");
      return;
    }
    setSelectedCompanyID((previous) => {
      if (previous && availableCompanies.some((company) => company.id === previous)) return previous;
      return availableCompanies[0].id;
    });
  }, [availableCompanies]);

  useEffect(() => {
    if (companyError) {
      toast({ title: "Gagal memuat daftar company", description: companyError.message, variant: "destructive" });
    }
  }, [companyError, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyID, search, statusFilter]);

  const effectiveCompanyID = selectedCompanyID || undefined;
  const shouldSkipVehicleQuery = isSuperAdmin && !effectiveCompanyID;
  const baseVehicleFilters = {
    companyId: effectiveCompanyID,
    search: toOptionalString(search),
    isActive: statusFilter === "ALL" ? undefined : statusFilter === "ACTIVE",
  };

  const { data: vehiclePageData, loading: loadingVehicles, error: vehicleError, refetch: refetchVehicles } =
    useQuery<VehiclesPaginatedQuery>(GET_VEHICLES_PAGINATED, {
      variables: {
        ...baseVehicleFilters,
        page: currentPage,
        limit: pageSize,
      },
      skip: shouldSkipVehicleQuery,
      fetchPolicy: "cache-and-network",
    });

  const { data: vehicleOptionsData, refetch: refetchVehicleOptions } = useQuery<VehiclesQuery>(GET_VEHICLES, {
    variables: {
      companyId: effectiveCompanyID,
      search: undefined,
      isActive: undefined,
    },
    skip: shouldSkipVehicleQuery,
    fetchPolicy: "cache-and-network",
  });

  const [createVehicle, { loading: creatingVehicle }] = useMutation<CreateVehicleMutation>(CREATE_VEHICLE, {
    onCompleted: async (data) => {
      toast({ title: "Kendaraan ditambahkan", description: `${data.createVehicle.registrationPlate} berhasil dibuat.` });
      setIsFormOpen(false);
      setEditingVehicle(null);
      setForm(EMPTY_FORM);
      if (currentPage !== 1) setCurrentPage(1);
      await Promise.all([
        refetchVehicles({ ...baseVehicleFilters, page: 1, limit: pageSize }),
        refetchVehicleOptions({
          companyId: effectiveCompanyID,
          search: undefined,
          isActive: undefined,
        }),
      ]);
    },
    onError: (error) => {
      toast({ title: "Gagal menambah kendaraan", description: error.message, variant: "destructive" });
    },
  });

  const [updateVehicle, { loading: updatingVehicle }] = useMutation<UpdateVehicleMutation>(UPDATE_VEHICLE, {
    onCompleted: (data) => {
      toast({ title: "Kendaraan diperbarui", description: `${data.updateVehicle.registrationPlate} berhasil diupdate.` });
      setIsFormOpen(false);
      setEditingVehicle(null);
      setForm(EMPTY_FORM);
      void refetchVehicles();
      void refetchVehicleOptions();
    },
    onError: (error) => {
      toast({ title: "Gagal memperbarui kendaraan", description: error.message, variant: "destructive" });
    },
  });

  const [deleteVehicle, { loading: deletingVehicleMutation }] = useMutation<DeleteVehicleMutation>(DELETE_VEHICLE, {
    onCompleted: () => {
      toast({ title: "Kendaraan dihapus", description: "Data kendaraan berhasil dihapus." });
      setDeletingVehicle(null);
      void refetchVehicles();
      void refetchVehicleOptions();
    },
    onError: (error) => {
      toast({ title: "Gagal menghapus kendaraan", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (vehicleError) {
      toast({ title: "Gagal memuat kendaraan", description: vehicleError.message, variant: "destructive" });
    }
  }, [vehicleError, toast]);

  const vehicles = useMemo(
    () => vehiclePageData?.vehiclesPaginated?.data || [],
    [vehiclePageData?.vehiclesPaginated?.data],
  );
  const vehiclesForTax = useMemo(
    () => vehicleOptionsData?.vehicles || [],
    [vehicleOptionsData?.vehicles],
  );
  const vehiclePagination = vehiclePageData?.vehiclesPaginated?.pagination;

  useEffect(() => {
    if (!vehiclePagination) return;
    if (currentPage > vehiclePagination.pages) {
      setCurrentPage(Math.max(1, vehiclePagination.pages));
    }
  }, [currentPage, vehiclePagination]);

  const companyMap = useMemo(() => {
    const map = new Map<string, string>();
    availableCompanies.forEach((company) => map.set(company.id, company.name));
    return map;
  }, [availableCompanies]);

  const qrPayload = useMemo(() => (qrVehicle ? buildVehicleQrPayload(qrVehicle) : ""), [qrVehicle]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingVehicle(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditDialog = (vehicle: VehicleRecord) => {
    const resolvedCategory = isVehicleCategory(vehicle.vehicleCategory) ? vehicle.vehicleCategory : "TRUCK";
    const resolvedStatus = isVehicleStatus(vehicle.status) ? vehicle.status : vehicle.isActive ? "ACTIVE" : "INACTIVE";
    setEditingVehicle(vehicle);
    setForm({
      registrationPlate: vehicle.registrationPlate,
      chassisNumber: vehicle.chassisNumber,
      engineNumber: vehicle.engineNumber,
      manufactureYear: String(vehicle.manufactureYear),
      vehicleCategory: resolvedCategory,
      brand: vehicle.brand,
      model: vehicle.model,
      registrationRegion: vehicle.registrationRegion || "",
      vehicleType: vehicle.vehicleType || "TRUCK",
      assignedDriverName: vehicle.assignedDriverName || "",
      notes: vehicle.notes || "",
      isActive: vehicle.isActive,
      status: resolvedStatus,
      stnkExpiryDate: toDateInput(vehicle.stnkExpiryDate),
      kirExpiryDate: toDateInput(vehicle.kirExpiryDate),
    });
    setIsFormOpen(true);
  };

  const handleReload = async () => {
    if (isSuperAdmin) await refetchCompanies();
    if (shouldSkipVehicleQuery) {
      toast({ title: "Pilih company dulu", description: "Super admin harus memilih company untuk melihat data kendaraan." });
      return;
    }
    const refreshed = await refetchVehicles();
    void refetchVehicleOptions();
    toast({
      title: "Data dimuat ulang",
      description: `Total kendaraan: ${refreshed.data?.vehiclesPaginated?.pagination?.total || 0}`,
    });
  };

  const handleSaveVehicle = async () => {
    const registrationPlate = normalizeRegistrationPlate(form.registrationPlate);
    const chassisNumber = form.chassisNumber.trim();
    const engineNumber = form.engineNumber.trim();
    const manufactureYear = Number.parseInt(form.manufactureYear.trim(), 10);
    const brand = form.brand.trim();
    const model = form.model.trim();
    const vehicleType = form.vehicleType.trim().toUpperCase();

    if (!registrationPlate) return toast({ title: "Validasi gagal", description: "Nomor polisi wajib diisi.", variant: "destructive" });
    if (!chassisNumber) return toast({ title: "Validasi gagal", description: "Nomor rangka wajib diisi.", variant: "destructive" });
    if (!engineNumber) return toast({ title: "Validasi gagal", description: "Nomor mesin wajib diisi.", variant: "destructive" });
    if (Number.isNaN(manufactureYear) || manufactureYear < 1900 || manufactureYear > 2100) {
      return toast({ title: "Validasi gagal", description: "Tahun pembuatan harus di antara 1900 - 2100.", variant: "destructive" });
    }
    if (!brand) return toast({ title: "Validasi gagal", description: "Merek kendaraan wajib diisi.", variant: "destructive" });
    if (!model) return toast({ title: "Validasi gagal", description: "Model kendaraan wajib diisi.", variant: "destructive" });
    if (!vehicleType) return toast({ title: "Validasi gagal", description: "Tipe kendaraan wajib diisi.", variant: "destructive" });

    if (!editingVehicle && !effectiveCompanyID && availableCompanies.length > 1) {
      return toast({ title: "Pilih company", description: "Pilih company terlebih dahulu sebelum menambah kendaraan.", variant: "destructive" });
    }

    const inputBase = {
      registrationPlate,
      chassisNumber,
      engineNumber,
      manufactureYear,
      vehicleCategory: form.vehicleCategory,
      brand,
      model,
      registrationRegion: toOptionalString(form.registrationRegion),
      vehicleType,
      assignedDriverName: toOptionalString(form.assignedDriverName),
      notes: toOptionalString(form.notes),
      isActive: form.isActive,
      status: form.status,
      stnkExpiryDate: toOptionalDateTime(form.stnkExpiryDate),
      kirExpiryDate: toOptionalDateTime(form.kirExpiryDate),
    };

    if (editingVehicle) {
      await updateVehicle({ variables: { input: { id: editingVehicle.id, ...inputBase } } });
      return;
    }

    await createVehicle({ variables: { input: { companyId: effectiveCompanyID, ...inputBase } } });
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;
    await deleteVehicle({ variables: { id: deletingVehicle.id } });
  };

  const handlePrintQr = async (vehicle: VehicleRecord) => {
    setIsPrinting(true);
    try {
      const qrPngDataUrl = await QRCode.toDataURL(buildVehicleQrPayload(vehicle), { width: 360, margin: 1, errorCorrectionLevel: "M" });
      const safePlate = escapeHtml(vehicle.registrationPlate);
      const safeDriver = escapeHtml(vehicle.assignedDriverName || "-");
      const safeCategory = escapeHtml(vehicle.vehicleCategory);
      const safeType = escapeHtml(vehicle.vehicleType);
      const safeUnit = escapeHtml(`${vehicle.brand} ${vehicle.model}`);
      const safeCompany = escapeHtml(companyMap.get(vehicle.companyId) || vehicle.companyId);

      const printHtml = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>QR ${safePlate}</title><style>
@page{size:90mm 125mm;margin:4mm;}html,body{margin:0;padding:0;background:#fff;color:#0f172a;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:100%;min-height:100vh;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:4mm 0}.wrap{width:78mm;border:1px solid #cbd5e1;border-radius:12px;padding:10px;box-sizing:border-box}.title{font-size:15px;margin:0 0 4px;font-weight:700;text-align:center}.sub{font-size:10px;margin:0 0 10px;color:#475569;text-align:center}.qr{display:flex;justify-content:center;margin-bottom:10px}.qr img{width:54mm;height:54mm;display:block;border:1px solid #e2e8f0;padding:3mm;background:#fff;box-sizing:border-box;image-rendering:pixelated}.meta{font-size:10px;line-height:1.45}.meta .k{color:#475569;display:inline-block;width:58px}.plate{font-family:monospace;font-size:11px;font-weight:700}
</style></head><body><div class="page"><div class="wrap"><p class="title">QR Kendaraan</p><p class="sub">Agrinova Vehicle Registry</p><div class="qr"><img id="qr-image" src="${qrPngDataUrl}" alt="QR ${safePlate}"/></div><div class="meta"><div><span class="k">Company</span>: ${safeCompany}</div><div><span class="k">Plat</span>: <span class="plate">${safePlate}</span></div><div><span class="k">Driver</span>: ${safeDriver}</div><div><span class="k">Kategori</span>: ${safeCategory}</div><div><span class="k">Tipe</span>: ${safeType}</div><div><span class="k">Unit</span>: ${safeUnit}</div></div></div></div><script>(function(){var img=document.getElementById('qr-image');if(!img)return;var printed=false;function p(){if(printed)return;printed=true;setTimeout(function(){window.focus();window.print();},120);}if(img.complete)p();else{img.onload=p;img.onerror=p;}})();</script></body></html>`;

      const popup = window.open("", "_blank", "noopener,noreferrer,width=620,height=780");
      if (popup && popup.document) {
        popup.document.open();
        popup.document.write(printHtml);
        popup.document.close();
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
      const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDocument) throw new Error("Tidak dapat menyiapkan dokumen cetak.");
      iframe.onload = () => window.setTimeout(() => iframe.remove(), 1000);
      iframeDocument.open();
      iframeDocument.write(printHtml);
      iframeDocument.close();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan saat menyiapkan QR.";
      toast({ title: "Gagal mencetak QR", description: message, variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  const isSaving = creatingVehicle || updatingVehicle;
  const isBusy = loadingVehicles || isSaving || deletingVehicleMutation;
  const showCompanyColumn = isSuperAdmin || availableCompanies.length > 1;

  const content = (
    <div className="space-y-6">
      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 md:w-fit">
          <TabsTrigger value="vehicles">Data Kendaraan</TabsTrigger>
          <TabsTrigger value="taxes">Transaksi Pajak</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Vehicle Management</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">CRUD data kendaraan berbasis database dan cetak QR Code untuk identifikasi.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => void handleReload()} disabled={isBusy || loadingCompanies}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />Reload
                  </Button>
                  <Button onClick={openCreateDialog} disabled={isSaving}><Plus className="mr-2 h-4 w-4" />Tambah Kendaraan</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="lg:col-span-5"><div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nopol, driver, kategori, merek, no rangka..." /></div></div>
                <div className="lg:col-span-3">
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="ALL">Semua Status</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="lg:col-span-4">
                  <Select value={selectedCompanyID} onValueChange={setSelectedCompanyID} disabled={availableCompanies.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Pilih Company Scope" /></SelectTrigger>
                    <SelectContent>{availableCompanies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {isSuperAdmin && !selectedCompanyID ? <div className="mb-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">Pilih company terlebih dahulu untuk memuat kendaraan.</div> : null}

              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Nopol</TableHead>{showCompanyColumn ? <TableHead>Company</TableHead> : null}<TableHead>Driver</TableHead><TableHead>Kategori</TableHead><TableHead>Unit</TableHead><TableHead>Status</TableHead><TableHead>Update</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loadingVehicles ? (
                      <TableRow><TableCell colSpan={showCompanyColumn ? 8 : 7} className="py-10 text-center text-sm text-muted-foreground">Memuat data kendaraan...</TableCell></TableRow>
                    ) : vehicles.length === 0 ? (
                      <TableRow><TableCell colSpan={showCompanyColumn ? 8 : 7} className="py-10 text-center text-sm text-muted-foreground">Belum ada data kendaraan.</TableCell></TableRow>
                    ) : (
                      vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell><div className="font-mono font-semibold">{vehicle.registrationPlate}</div></TableCell>
                          {showCompanyColumn ? <TableCell>{companyMap.get(vehicle.companyId) || vehicle.companyId}</TableCell> : null}
                          <TableCell>{vehicle.assignedDriverName || "-"}</TableCell>
                          <TableCell><Badge variant="outline">{vehicle.vehicleCategory}</Badge></TableCell>
                          <TableCell>{`${vehicle.brand} ${vehicle.model}`}</TableCell>
                          <TableCell><Badge className={vehicle.status === "ACTIVE" ? "bg-green-100 text-green-700" : vehicle.status === "INACTIVE" ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}>{vehicle.status}</Badge></TableCell>
                          <TableCell>{formatDateTime(vehicle.updatedAt)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => setQrVehicle(vehicle)}><QrCode className="mr-1 h-4 w-4" />QR</Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(vehicle)}><Pencil className="h-4 w-4" /></Button>
                              <Button type="button" variant="destructive" size="sm" onClick={() => setDeletingVehicle(vehicle)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {vehicles.length} dari {vehiclePagination?.total || 0} kendaraan
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                    disabled={loadingVehicles || currentPage <= 1}
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Halaman {vehiclePagination?.page || currentPage} / {vehiclePagination?.pages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((previous) =>
                        Math.min(vehiclePagination?.pages || previous, previous + 1),
                      )
                    }
                    disabled={loadingVehicles || currentPage >= (vehiclePagination?.pages || 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxes" className="space-y-6">
          <VehicleTaxSection vehicles={vehiclesForTax} companyMap={companyMap} />
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Edit Kendaraan" : "Tambah Kendaraan"}</DialogTitle>
            <DialogDescription>Data kendaraan disimpan ke database dan otomatis terscope berdasarkan company.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2" htmlFor="vehicle-company"><Building2 className="h-4 w-4" />Company Scope</Label>
              <Input id="vehicle-company" value={editingVehicle ? getCompanyNameByID(availableCompanies, editingVehicle.companyId) : selectedCompanyID ? getCompanyNameByID(availableCompanies, selectedCompanyID) : "Automatic by assignment"} disabled={true} />
            </div>

            <div className="space-y-2"><Label htmlFor="registrationPlate">Nomor Polisi *</Label><Input id="registrationPlate" value={form.registrationPlate} onChange={(event) => setForm((previous) => ({ ...previous, registrationPlate: event.target.value }))} placeholder="BK 1234 AB" /></div>
            <div className="space-y-2">
              <Label htmlFor="vehicleCategory">Kategori Kendaraan *</Label>
              <Select value={form.vehicleCategory} onValueChange={(value) => setForm((previous) => ({ ...previous, vehicleCategory: value as VehicleCategory }))}>
                <SelectTrigger id="vehicleCategory"><SelectValue placeholder="Pilih kategori kendaraan" /></SelectTrigger>
                <SelectContent>{VEHICLE_CATEGORY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2"><Label htmlFor="brand">Merek *</Label><Input id="brand" value={form.brand} onChange={(event) => setForm((previous) => ({ ...previous, brand: event.target.value }))} placeholder="Toyota" /></div>
            <div className="space-y-2"><Label htmlFor="model">Model *</Label><Input id="model" value={form.model} onChange={(event) => setForm((previous) => ({ ...previous, model: event.target.value }))} placeholder="Hilux" /></div>
            <div className="space-y-2"><Label htmlFor="chassisNumber">Nomor Rangka (VIN) *</Label><Input id="chassisNumber" value={form.chassisNumber} onChange={(event) => setForm((previous) => ({ ...previous, chassisNumber: event.target.value }))} placeholder="MHFXXXXXXXXXXXXX" /></div>
            <div className="space-y-2"><Label htmlFor="engineNumber">Nomor Mesin *</Label><Input id="engineNumber" value={form.engineNumber} onChange={(event) => setForm((previous) => ({ ...previous, engineNumber: event.target.value }))} placeholder="1TRXXXXXXX" /></div>
            <div className="space-y-2"><Label htmlFor="manufactureYear">Tahun Pembuatan *</Label><Input id="manufactureYear" type="number" min={1900} max={2100} value={form.manufactureYear} onChange={(event) => setForm((previous) => ({ ...previous, manufactureYear: event.target.value }))} placeholder="2020" /></div>
            <div className="space-y-2"><Label htmlFor="vehicleType">Tipe Internal *</Label><Input id="vehicleType" value={form.vehicleType} onChange={(event) => setForm((previous) => ({ ...previous, vehicleType: event.target.value }))} placeholder="TRUCK / FFB_TRUCK" /></div>
            <div className="space-y-2"><Label htmlFor="assignedDriverName">Driver Default</Label><Input id="assignedDriverName" value={form.assignedDriverName} onChange={(event) => setForm((previous) => ({ ...previous, assignedDriverName: event.target.value }))} placeholder="Nama driver (opsional)" /></div>
            <div className="space-y-2"><Label htmlFor="registrationRegion">Region Registrasi</Label><Input id="registrationRegion" value={form.registrationRegion} onChange={(event) => setForm((previous) => ({ ...previous, registrationRegion: event.target.value }))} placeholder="Sumatera Utara" /></div>
            <div className="space-y-2"><Label htmlFor="stnkExpiryDate">Masa Berlaku STNK</Label><Input id="stnkExpiryDate" type="date" value={form.stnkExpiryDate} onChange={(event) => setForm((previous) => ({ ...previous, stnkExpiryDate: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="kirExpiryDate">Masa Berlaku KIR</Label><Input id="kirExpiryDate" type="date" value={form.kirExpiryDate} onChange={(event) => setForm((previous) => ({ ...previous, kirExpiryDate: event.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vehicleStatus">Status Lifecycle</Label>
              <Select value={form.status} onValueChange={(value) => setForm((previous) => ({ ...previous, status: value as VehicleLifecycleStatus, isActive: value === "ACTIVE" }))}>
                <SelectTrigger id="vehicleStatus"><SelectValue placeholder="Pilih status kendaraan" /></SelectTrigger>
                <SelectContent>{VEHICLE_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2"><Label htmlFor="notes">Catatan</Label><Textarea id="notes" value={form.notes} onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))} placeholder="Catatan tambahan" rows={3} /></div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="vehicle-active">Status aktif</Label>
              <p className="text-xs text-muted-foreground">Jika nonaktif, kendaraan tetap ada di database namun tidak dipakai operasional.</p>
            </div>
            <Switch id="vehicle-active" checked={form.isActive} onCheckedChange={(checked) => setForm((previous) => ({ ...previous, isActive: checked, status: checked ? "ACTIVE" : previous.status === "ACTIVE" ? "INACTIVE" : previous.status }))} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
            <Button onClick={() => void handleSaveVehicle()} disabled={isSaving}>{isSaving ? "Menyimpan..." : editingVehicle ? "Simpan Perubahan" : "Simpan Kendaraan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(qrVehicle)} onOpenChange={(open) => !open && setQrVehicle(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>QR Kendaraan</DialogTitle><DialogDescription>Gunakan QR ini untuk identifikasi cepat kendaraan di pos.</DialogDescription></DialogHeader>
          {qrVehicle ? (
            <div className="space-y-3">
              <div className="flex justify-center"><div className="w-fit rounded-md border bg-white p-2 shadow-sm"><QRCodeSVG value={qrPayload} size={220} includeMargin={true} style={{ width: 220, height: 220, display: "block" }} /></div></div>
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 font-semibold"><Car className="h-4 w-4" />{qrVehicle.registrationPlate}</div>
                <p className="mt-1 text-muted-foreground">Driver: {qrVehicle.assignedDriverName || "-"}</p>
                <p className="text-muted-foreground">Kategori: {qrVehicle.vehicleCategory}</p>
                <p className="text-muted-foreground">Unit: {qrVehicle.brand} {qrVehicle.model}</p>
                <p className="text-muted-foreground">Company: {companyMap.get(qrVehicle.companyId) || qrVehicle.companyId}</p>
              </div>
              <div className="max-h-36 overflow-auto rounded-md border bg-slate-50 p-2">
                <p className="text-[10px] text-muted-foreground">Payload</p>
                <p className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] text-slate-700">{qrPayload}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrVehicle(null)}>Tutup</Button>
            {qrVehicle ? <Button onClick={() => void handlePrintQr(qrVehicle)} disabled={isPrinting}><Printer className="mr-2 h-4 w-4" />{isPrinting ? "Menyiapkan..." : "Cetak QR"}</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingVehicle)} onOpenChange={(open) => !open && setDeletingVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kendaraan?</AlertDialogTitle>
            <AlertDialogDescription>Data kendaraan <span className="font-mono font-semibold">{deletingVehicle?.registrationPlate}</span> akan dihapus permanen dari database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteVehicle()} disabled={deletingVehicleMutation}>{deletingVehicleMutation ? "Menghapus..." : "Hapus"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (normalizedRole === "SUPER_ADMIN") {
    return <SuperAdminDashboardLayout title="Vehicle Registry" description="CRUD kendaraan database + cetak QR code">{content}</SuperAdminDashboardLayout>;
  }
  if (normalizedRole === "AREA_MANAGER") {
    return <AreaManagerDashboardLayout title="Regional Vehicle Registry" description="Monitoring dan data kendaraan lintas area">{content}</AreaManagerDashboardLayout>;
  }
  if (normalizedRole === "MANAGER") {
    return <ManagerDashboardLayout title="Estate Vehicle Registry" description="Data kendaraan operasional estate">{content}</ManagerDashboardLayout>;
  }
  if (normalizedRole === "SATPAM") {
    return <SatpamDashboardLayout title="Vehicle Gate Registry" description="Data kendaraan untuk kebutuhan gate check">{content}</SatpamDashboardLayout>;
  }
  return <CompanyAdminDashboardLayout title="Vehicle Registry" description="Manajemen kendaraan perusahaan dan cetak QR">{content}</CompanyAdminDashboardLayout>;
}
