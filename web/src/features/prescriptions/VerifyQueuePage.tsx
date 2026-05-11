import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, CheckCircle2, Clock } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { mockPrescriptions } from '@/mocks/data'
import type { Prescription } from '@/mocks/types'

export default function VerifyQueuePage() {
  const navigate = useNavigate()
  const [verifyTarget, setVerifyTarget] = useState<Prescription | null>(null)
  const [verifying, setVerifying] = useState(false)

  const queue = mockPrescriptions.filter((rx) => rx.status === 'issued' || rx.status === 'verified')

  const handleVerify = async () => {
    setVerifying(true)
    await new Promise((r) => setTimeout(r, 900))
    setVerifying(false)
    setVerifyTarget(null)
  }

  return (
    <>
      <PageHeader
        title="Verification Queue"
        description="Prescriptions awaiting pharmacist review and dispensing"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Awaiting Verification', value: mockPrescriptions.filter((rx) => rx.status === 'issued').length, color: 'bg-amber-50 text-amber-600' },
          { label: 'Ready to Dispense', value: mockPrescriptions.filter((rx) => rx.status === 'verified').length, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'In Queue Total', value: queue.length, color: 'bg-slate-50 text-slate-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {queue.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <p className="font-bold text-slate-700">Queue is empty</p>
          <p className="text-sm text-slate-400 mt-1">All prescriptions have been processed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((rx) => {
            const isPending = rx.status === 'issued'
            return (
              <div
                key={rx.id}
                className="bg-white rounded-xl shadow-sm p-5"
                style={{ border: `1px solid ${isPending ? 'hsl(45 90% 85%)' : 'hsl(240 68% 87%)'}` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Reference + badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-slate-800">{rx.reference_no}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {isPending ? (
                          <span className="flex items-center gap-1"><Clock size={10} /> Awaiting Verification</span>
                        ) : (
                          <span className="flex items-center gap-1"><ShieldCheck size={10} /> Ready to Dispense</span>
                        )}
                      </span>
                    </div>

                    {/* Patient + diagnosis */}
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">{rx.patient_record?.patient?.user?.name}</span>
                      <span className="text-slate-400"> · {rx.doctor?.user?.name} · </span>
                      <span className="text-slate-500">{rx.patient_record?.diagnosis}</span>
                    </p>

                    {/* Medications */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {rx.items.map((item) => (
                        <span
                          key={item.id}
                          className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                        >
                          {item.drug_name} {item.dosage} × {item.quantity}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-400 mt-2">
                      Issued {new Date(rx.issued_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/prescriptions/${rx.id}`)}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      style={{ border: '1px solid hsl(214 20% 90%)' }}
                    >
                      <Eye size={12} /> View Rx
                    </button>
                    <button
                      onClick={() => setVerifyTarget(rx)}
                      className="flex items-center gap-1.5 text-xs text-white font-semibold px-3 py-1.5 rounded-lg transition-colors bg-blue-600 hover:bg-blue-700"
                    >
                      <ShieldCheck size={12} />
                      {isPending ? 'Verify' : 'Dispense'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!verifyTarget}
        onOpenChange={(o) => !o && setVerifyTarget(null)}
        title={verifyTarget?.status === 'issued' ? 'Verify Prescription' : 'Dispense Prescription'}
        description={
          verifyTarget?.status === 'issued'
            ? `Verify ${verifyTarget?.reference_no}? This action will be recorded immutably on the Hyperledger Fabric blockchain.`
            : `Mark ${verifyTarget?.reference_no} as dispensed? The patient will receive their medications.`
        }
        confirmLabel={verifyTarget?.status === 'issued' ? 'Verify & Record' : 'Mark as Dispensed'}
        loading={verifying}
        onConfirm={handleVerify}
      />
    </>
  )
}
