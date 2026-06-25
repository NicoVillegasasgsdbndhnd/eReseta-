import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Stethoscope, ArrowRight, Search } from 'lucide-react'
import { usePublicDoctors } from './queries'
import { avatarColor, initial } from '@/lib/avatar'

const BLUE = 'hsl(201 100% 36%)'

export default function DoctorsPage() {
  const { data: doctors, isLoading, isError } = usePublicDoctors()
  const [specialty, setSpecialty] = useState('all')
  const list = doctors ?? []

  const specialties = useMemo(() => {
    const set = new Set(list.map((d) => d.specialization).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [list])

  const visible = specialty === 'all' ? list : list.filter((d) => d.specialization === specialty)

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'hsl(215 30% 14%)' }}>Our Doctors</h1>
        <p className="text-slate-500 mt-2">Choose a specialist and request an appointment.</p>
      </div>

      {specialties.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {specialties.map((s) => {
            const active = specialty === s
            return (
              <button
                key={s}
                onClick={() => setSpecialty(s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={active
                  ? { backgroundColor: BLUE, color: 'white' }
                  : { border: '1px solid hsl(210 18% 88%)', color: 'hsl(215 16% 45%)', backgroundColor: 'white' }}
              >
                {s !== 'all' && <Stethoscope size={11} />}
                {s === 'all' ? 'All specializations' : s}
              </button>
            )
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : isError ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center" style={{ border: '1px solid hsl(0 72% 90%)' }}>
          <Search size={26} className="mx-auto text-red-300" />
          <p className="text-sm font-semibold text-red-600 mt-3">Unable to load doctors</p>
          <p className="text-xs leading-5 text-slate-500 mt-2">
            Make sure the API is reachable from this device, then refresh the page.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(210 18% 88%)' }}>
          <Search size={26} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-500 mt-3">No doctors found</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d, i) => {
            const c = avatarColor(i)
            return (
              <div key={d.id} className="bg-white rounded-xl shadow-sm p-6 flex flex-col" style={{ border: '1px solid hsl(210 18% 88%)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{ backgroundColor: c.bg, color: c.fg }}>
                    {initial(d.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: 'hsl(215 30% 14%)' }}>{d.name}</p>
                    <p className="text-xs font-medium" style={{ color: BLUE }}>{d.specialization}</p>
                  </div>
                </div>
                {d.bio && <p className="text-sm text-slate-500 mt-4 leading-relaxed flex-1">{d.bio}</p>}
                <Link
                  to={`/book?doctor=${d.id}`}
                  className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: BLUE }}
                >
                  Book with Dr. {(d.name ?? '').split(' ').slice(-1)[0] || 'this doctor'} <ArrowRight size={15} />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
