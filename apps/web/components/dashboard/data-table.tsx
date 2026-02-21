'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface DataTableProps<TData, TValue> {
  title: string;
  description?: string;
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  showExport?: boolean;
  onExport?: () => void;
  loading?: boolean;
  className?: string;
  emptyMessage?: string;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ label: string; value: string }>;
  }>;
}

export function DataTable<TData, TValue>({
  title,
  description,
  columns,
  data,
  searchKey,
  searchPlaceholder = "Cari...",
  pageSize = 10,
  showPagination = true,
  showSearch = true,
  showExport = false,
  onExport,
  loading = false,
  className,
  emptyMessage = "Tidak ada data tersedia",
  filters = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: showPagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {showExport && onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        {(showSearch || filters.length > 0) && (
          <div className="flex items-center space-x-4">
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            
            {filters.map((filter) => (
              <Select
                key={filter.key}
                onValueChange={(value) =>
                  table.getColumn(filter.key)?.setFilterValue(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua {filter.label}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center space-x-2">
                        <span>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            <ChevronUp 
                              className={cn(
                                "h-3 w-3",
                                header.column.getIsSorted() === "asc" 
                                  ? "text-gray-900" 
                                  : "text-gray-400"
                              )} 
                            />
                            <ChevronDown 
                              className={cn(
                                "h-3 w-3 -mt-1",
                                header.column.getIsSorted() === "desc" 
                                  ? "text-gray-900" 
                                  : "text-gray-400"
                              )} 
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={columns.length} 
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Eye className="h-8 w-8 text-gray-400" />
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {showPagination && table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-700">
              <span>
                Menampilkan {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} hingga{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{' '}
                dari {table.getFilteredRowModel().rows.length} data
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: table.getPageCount() }, (_, i) => i)
                  .filter((page) => {
                    const current = table.getState().pagination.pageIndex;
                    return page === current || 
                           page === current - 1 || 
                           page === current + 1 || 
                           page === 0 || 
                           page === table.getPageCount() - 1;
                  })
                  .map((page, index, filtered) => {
                    const isEllipsis = index > 0 && filtered[index - 1] !== page - 1;
                    return (
                      <React.Fragment key={page}>
                        {isEllipsis && <span className="px-2 py-1 text-sm">...</span>}
                        <Button
                          variant={table.getState().pagination.pageIndex === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => table.setPageIndex(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page + 1}
                        </Button>
                      </React.Fragment>
                    );
                  })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DataTable;