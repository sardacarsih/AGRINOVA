'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HarvestEntry, PanenStatus } from '@/types/dashboard'
import { formatDate, formatWeight, formatNumber, getStatusColor } from '@/lib/utils'
import { 
  Eye, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Filter,
  MoreVertical
} from 'lucide-react'

interface HarvestTableProps {
  entries: HarvestEntry[]
  isLoading?: boolean
}

export function HarvestTable({ entries, isLoading = false }: HarvestTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<PanenStatus | 'ALL'>('ALL')
  const itemsPerPage = 10

  // Filter entries based on search and status
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.panenNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.mandor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.block?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.block?.estate?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || entry.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: PanenStatus) => {
    switch (status) {
      case PanenStatus.PENDING:
        return <Badge variant="pending">Menunggu Approval</Badge>
      case PanenStatus.APPROVED:
        return <Badge variant="success">Disetujui</Badge>
      case PanenStatus.REJECTED:
        return <Badge variant="rejected">Ditolak</Badge>
      case PanenStatus.PKS_RECEIVED:
        return <Badge variant="secondary">Diterima PKS</Badge>
      case PanenStatus.PKS_WEIGHED:
        return <Badge variant="outline">Ditimbang PKS</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleApprove = (entryId: string) => {
    // TODO: Implement approval logic
    console.log('Approve entry:', entryId)
  }

  const handleReject = (entryId: string) => {
    // TODO: Implement rejection logic
    console.log('Reject entry:', entryId)
  }

  const handleView = (entryId: string) => {
    // TODO: Implement view logic
    console.log('View entry:', entryId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Panen Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <CardTitle>Data Panen Terbaru</CardTitle>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari nomor panen, mandor, blok..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PanenStatus | 'ALL')}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="ALL">Semua Status</option>
                <option value={PanenStatus.PENDING}>Menunggu Approval</option>
                <option value={PanenStatus.APPROVED}>Disetujui</option>
                <option value={PanenStatus.REJECTED}>Ditolak</option>
                <option value={PanenStatus.PKS_RECEIVED}>Diterima PKS</option>
              </select>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Mobile-friendly table */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Panen</TableHead>
                <TableHead>Estate / Blok</TableHead>
                <TableHead>Mandor</TableHead>
                <TableHead>Tanggal Panen</TableHead>
                <TableHead className="text-right">TBS</TableHead>
                <TableHead className="text-right">Berat (kg)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEntries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {entry.panenNumber}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {entry.block?.estate?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Blok {entry.block?.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {entry.mandor?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.mandor?.employeeNumber}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(entry.harvestDate, { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatNumber(entry.totalTBS)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.totalEmployees} karyawan
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatWeight(entry.totalWeight)}
                    </div>
                    {entry.pksWeight && (
                      <div className="text-xs text-gray-500">
                        PKS: {formatWeight(entry.pksWeight)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(entry.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleView(entry.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {entry.status === PanenStatus.PENDING && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(entry.id)}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(entry.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-4">
          {paginatedEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-sm font-medium">
                    {entry.panenNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    {entry.block?.estate?.name} - Blok {entry.block?.name}
                  </div>
                </div>
                {getStatusBadge(entry.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Mandor</div>
                  <div className="font-medium">{entry.mandor?.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Tanggal</div>
                  <div className="font-medium">
                    {formatDate(entry.harvestDate, { dateStyle: 'short' })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">TBS</div>
                  <div className="font-medium">{formatNumber(entry.totalTBS)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Berat</div>
                  <div className="font-medium">{formatWeight(entry.totalWeight)}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleView(entry.id)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Lihat
                </Button>
                
                {entry.status === PanenStatus.PENDING && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleApprove(entry.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(entry.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Tolak
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEntries.length)} dari {filteredEntries.length} entri
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="text-sm">
                Halaman {currentPage} dari {totalPages}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}