"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface WeighingData {
  id: string
  tanggal: string
  kendaraan: string
  supir: string
  blok: string
  beratBruto: number
  beratTara: number
  beratNetto: number
  status: "PENDING" | "COMPLETED" | "CANCELLED"
  createdAt: string
}

interface WeighingTableProps {
  data: WeighingData[]
}

export function WeighingTable({ data }: WeighingTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "CANCELLED":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "PENDING":
        return "secondary"
      case "CANCELLED":
        return "destructive"
      default:
        return "secondary"
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Kendaraan</TableHead>
            <TableHead>Supir</TableHead>
            <TableHead>Blok</TableHead>
            <TableHead>Berat Bruto</TableHead>
            <TableHead>Berat Tara</TableHead>
            <TableHead>Berat Netto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                Tidak ada data timbangan
              </TableCell>
            </TableRow>
          ) : (
            data.map((weighing) => (
              <TableRow key={weighing.id}>
                <TableCell className="font-medium">{weighing.id}</TableCell>
                <TableCell>{weighing.tanggal}</TableCell>
                <TableCell>{weighing.kendaraan}</TableCell>
                <TableCell>{weighing.supir}</TableCell>
                <TableCell>
                  <Badge variant="outline">{weighing.blok}</Badge>
                </TableCell>
                <TableCell>{weighing.beratBruto.toLocaleString('id-ID')} kg</TableCell>
                <TableCell>{weighing.beratTara.toLocaleString('id-ID')} kg</TableCell>
                <TableCell className="font-medium">
                  {weighing.beratNetto.toLocaleString('id-ID')} kg
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(weighing.status)}
                    <Badge variant={getStatusVariant(weighing.status)}>
                      {weighing.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={weighing.status === "COMPLETED"}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={weighing.status === "COMPLETED"}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}