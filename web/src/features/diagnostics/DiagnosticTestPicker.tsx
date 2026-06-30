import { useMemo, useState } from 'react'
import { Microscope, ScanLine, X } from 'lucide-react'
import type { DiagnosticTest } from '@/mocks/types'
import DiagnosticTestCombobox from './DiagnosticTestCombobox'
import { useImagingCatalog } from './queries'

interface Props {
  value: string
  onValueChange: (value: string) => void   // lab free-type → sets name, clears id
  onSelect: (test: DiagnosticTest) => void  // pick → sets name + catalog id
}

type Mode = 'laboratory' | 'imaging'

const selectCls = 'h-9 rounded-lg border px-2 text-sm bg-white disabled:opacity-50'
const selectStyle = { borderColor: 'hsl(210 18% 88%)' }

/**
 * Diagnostic test picker. Laboratory keeps the plain search; Imaging cascades
 * Modality → Anatomical Area → filtered list, collapsing DEAMHI's 95-row radiology menu into a few
 * rows at a time (the doctor's requested flow).
 */
export default function DiagnosticTestPicker({ value, onValueChange, onSelect }: Props) {
  const [mode, setMode] = useState<Mode>('laboratory')
  const [modality, setModality] = useState('')
  const [region, setRegion] = useState('')

  const { data, isFetching } = useImagingCatalog(mode === 'imaging')
  const imaging = useMemo(() => data?.data ?? [], [data])

  const modalities = useMemo(
    () => Array.from(new Set(imaging.map((t) => t.modality).filter(Boolean))).sort() as string[],
    [imaging],
  )
  const regions = useMemo(
    () => Array.from(new Set(imaging.filter((t) => t.modality === modality).map((t) => t.body_region).filter(Boolean))).sort() as string[],
    [imaging, modality],
  )
  const filtered = useMemo(
    () => imaging.filter((t) => t.modality === modality && (!region || t.body_region === region)),
    [imaging, modality, region],
  )

  // A test is already chosen → compact chip with a clear button.
  if (value) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 rounded-lg bg-white px-3" style={{ border: '1px solid hsl(210 18% 88%)' }}>
        <span className="truncate text-sm font-medium text-slate-700">{value}</span>
        <button type="button" onClick={() => onValueChange('')} className="shrink-0 text-slate-400 hover:text-red-500" aria-label="Clear test">
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode('laboratory')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${mode === 'laboratory' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
        >
          <Microscope size={13} /> Laboratory
        </button>
        <button
          type="button"
          onClick={() => setMode('imaging')}
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors ${mode === 'imaging' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
        >
          <ScanLine size={13} /> Imaging
        </button>
      </div>

      {mode === 'laboratory' ? (
        <DiagnosticTestCombobox
          value={value}
          category="laboratory"
          onValueChange={onValueChange}
          onSelect={onSelect}
          placeholder="Search lab test (e.g. CBC, Urinalysis) or type a custom one"
        />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={modality} onChange={(e) => { setModality(e.target.value); setRegion('') }} className={selectCls} style={selectStyle}>
              <option value="">Modality…</option>
              {modalities.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={region} onChange={(e) => setRegion(e.target.value)} disabled={!modality} className={selectCls} style={selectStyle}>
              <option value="">{modality ? 'Anatomical area (all)' : 'Pick modality first'}</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {modality && (
            <div className="max-h-44 overflow-auto rounded-lg" style={{ border: '1px solid hsl(210 18% 90%)' }}>
              {isFetching && <p className="px-3 py-2 text-xs text-slate-400">Loading catalog…</p>}
              {!isFetching && filtered.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No tests for this selection.</p>}
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                >
                  <span className="truncate text-sm text-slate-700">{t.name}</span>
                  <span className="shrink-0 text-[10px] font-medium text-slate-400">{t.body_region}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
