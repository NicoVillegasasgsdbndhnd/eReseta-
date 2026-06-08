import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchFn?: (row: T, query: string) => boolean
  pageSize?: number
  emptyMessage?: string
  onRowDoubleClick?: (row: T) => void
  compact?: boolean
}

export default function DataTable<T>({
  data, columns, searchPlaceholder = 'Search…',
  searchFn, pageSize = 8, emptyMessage = 'No records found.',
  onRowDoubleClick, compact = false,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = searchFn && query
    ? data.filter((row) => searchFn(row, query.toLowerCase()))
    : data

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-3">
      {searchFn && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            className="pl-9 bg-white text-slate-700 placeholder:text-slate-400 h-9 text-sm focus-visible:ring-[var(--color-primary)]"
            style={{ border: '1px solid var(--color-border)' }}
          />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'hsl(40 24% 96%)', borderBottom: '1px solid var(--color-border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 ${compact ? 'py-2' : 'py-3'} text-left text-xs font-semibold text-slate-500 uppercase tracking-wide ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  className={`hover:bg-slate-50 transition-colors ${onRowDoubleClick ? 'cursor-pointer' : ''}`}
                  title={onRowDoubleClick ? 'Double-click to open' : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 ${compact ? 'py-2' : 'py-3'} text-slate-700 ${col.className ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 px-1">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 border-slate-200 bg-white"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2 font-medium text-slate-700 text-xs">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 border-slate-200 bg-white"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
