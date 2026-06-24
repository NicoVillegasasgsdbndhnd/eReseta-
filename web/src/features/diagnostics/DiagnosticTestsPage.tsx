import { useEffect, useState } from 'react'
import { FlaskConical, Loader2, Search, CheckCircle2, XCircle, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import {
  useDiagnosticTestSearch, useAddDiagnosticTest,
  useToggleDiagnosticTestAvailability, useDeleteDiagnosticTest,
} from './queries'

export default function DiagnosticTestsPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('laboratory')
  const [deleteTest, setDeleteTest] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1) }, 250)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useDiagnosticTestSearch(debounced, { page })
  const toggle = useToggleDiagnosticTestAvailability()
  const addTest = useAddDiagnosticTest()
  const removeTest = useDeleteDiagnosticTest()
  const tests = data?.data ?? []
  const meta = data?.meta

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addTest.mutateAsync({ name: newName.trim(), category: newCategory })
    setNewName('')
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <FlaskConical size={18} className="text-teal-600" />
        <h2 className="text-base font-bold text-slate-800">Diagnostic Test Catalog</h2>
      </div>

      {/* Add a test */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4" style={{ border: '1px solid var(--color-border)' }}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add a test</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. MRI — Lumbar Spine"
            className="h-9 text-sm border-slate-200 flex-1 min-w-48"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="h-9 rounded-lg border text-sm text-slate-700 bg-white px-2"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="laboratory">Laboratory</option>
            <option value="imaging">Imaging</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={addTest.isPending || !newName.trim()}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 h-9 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Toggle availability to control what doctors can order. Hidden tests won't appear in the order picker.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 mb-4" style={{ border: '1px solid var(--color-border)' }}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests…"
            className="h-10 pl-9 text-sm border-slate-200"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : tests.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-16">No tests found.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {tests.map((test) => (
              <li key={test.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{test.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{test.category ?? '—'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={toggle.isPending && pendingId === test.id}
                    onClick={() => { setPendingId(test.id); toggle.mutate({ id: test.id, is_available: !test.is_available }) }}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors',
                      test.is_available
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-500 hover:bg-red-100',
                    )}
                  >
                    {test.is_available ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {test.is_available ? 'Available' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTest({ id: test.id, name: test.name })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove from catalog"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="text-sm px-3 py-1.5 rounded-lg bg-white shadow-sm disabled:opacity-40" style={{ border: '1px solid var(--color-border)' }}>
            Previous
          </button>
          <span className="text-xs text-slate-500">Page {meta.current_page} of {meta.last_page}</span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
            className="text-sm px-3 py-1.5 rounded-lg bg-white shadow-sm disabled:opacity-40" style={{ border: '1px solid var(--color-border)' }}>
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteTest !== null}
        onOpenChange={(open) => { if (!open) setDeleteTest(null) }}
        variant="destructive"
        title="Remove test from catalog?"
        description={`"${deleteTest?.name ?? ''}" will be removed from the orderable test catalog.`}
        confirmLabel="Remove"
        loading={removeTest.isPending}
        onConfirm={() => {
          if (deleteTest) removeTest.mutate(deleteTest.id, { onSuccess: () => setDeleteTest(null) })
        }}
      />
    </div>
  )
}
