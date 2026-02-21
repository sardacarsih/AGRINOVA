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
  AlertTriangle,
  Star
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface GradingData {
  id: string
  tanggal: string
  blok: string
  mandor: string
  totalTandan: number
  gradeA: number
  gradeB: number
  gradeC: number
  avgWeight: number
  quality: "BAIK" | "CUKUP" | "KURANG"
  status: "PENDING" | "COMPLETED" | "CANCELLED"
  createdAt: string
}

interface GradingTableProps {
  data: GradingData[]
}

export function GradingTable({ data }: GradingTableProps) {
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

  const getQualityVariant = (quality: string) => {
    switch (quality) {
      case "BAIK":
        return "default"
      case "CUKUP":
        return "secondary"
      case "KURANG":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getGradeAPercentage = (gradeA: number, total: number) => {
    if (total === 0) return 0
    return Math.round((gradeA / total) * 100)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Blok</TableHead>
            <TableHead>Mandor</TableHead>
            <TableHead>Total Tandan</TableHead>
            <TableHead>Grade A</TableHead>
            <TableHead>Grade B</TableHead>
            <TableHead>Grade C</TableHead>
            <TableHead>% Grade A</TableHead>
            <TableHead>Rata-rata Berat</TableHead>
            <TableHead>Kualitas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                Tidak ada data grading
              </TableCell>
            </TableRow>
          ) : (
            data.map((grading) => (
              <TableRow key={grading.id}>
                <TableCell className="font-medium">{grading.id}</TableCell>
                <TableCell>{grading.tanggal}</TableCell>
                <TableCell>
                  <Badge variant="outline">{grading.blok}</Badge>
                </TableCell>
                <TableCell>{grading.mandor}</TableCell>
                <TableCell>
                  <div className="text-center font-medium">{grading.totalTandan}</div>
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      {grading.gradeA}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      {grading.gradeB}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                      {grading.gradeC}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <div className="font-medium">
                      {getGradeAPercentage(grading.gradeA, grading.totalTandan)}%
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-center font-medium">
                    {grading.avgWeight.toFixed(1)} kg
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getQualityVariant(grading.quality)}>
                    {grading.quality}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(grading.status)}
                    <Badge variant={getStatusVariant(grading.status)}>
                      {grading.status}
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
                      <DropdownMenuItem disabled={grading.status === "COMPLETED"}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={grading.status === "COMPLETED"}>
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