import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { usePrescriptions, useVerifyPrescription, useDispensePrescription } from './queries'
import type { Prescription } from '@/mocks/types'

export default function VerifyQueuePage() {
  const navigate = useNavigate()
  const [actionTarget, setActionTarget] = useState<Prescription | null>(null)

  const { data, isLoading } = usePrescriptions()
  const verifyMutation = useVerifyPrescription()
  const dispenseMutation = useDispensePrescription()

  const allPrescriptions = data?.data ?? []
  const queue = allPrescriptions.filter(
    (rx) => rx.status === 'issued' || rx.status === 'verified',
  )

  const handleAction = async () => {
    if (!actionTarget) return
    if (actionTarget.status === 'issued') {
      await verifyMutation.mutateAsync(actionTarget.id)
    } else {
      await dispenseMutation.mutateAsync(actionTarget.id)
    }
    setActionTarget(null)
  }

  const isActing = verifyMutation.isPending || dispenseMutation.isPending

  return (
    <>
      <PageHeader
        title="Verification Queue"
        description="Prescriptions awaiting pharmacist review and dispensing"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Awaiting Verification',
            value: allPrescriptions.filter((rx) => rx.status === 'issued').length,
            color: 'text-amber-600',
          },
          {
            label: 'Ready to Dispense',
            value: allPrescriptions.filter((rx) => rx.status === 'verified').length,
            color: 'text-indigo-600',
          },
          { label: 'In Queue Total', value: queue.length, color: 'text-slate-600' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl shadow-sm p-4"
            style={{ border: '1px solid hsl(214 20% 90%)' }}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : queue.length === 0 ? (
        <div
          className="bg-white rounded-xl shadow-sm p-12 text-center"
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
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
                style={{
                  border: `1px solid ${isPending ? 'hsl(45 90% 85%)' : 'hsl(240 68% 87%)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-slate-800">{rx.reference_no}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}
                      >
                        {isPending ? (
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> Awaiting Verification
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <ShieldCheck size={10} /> Ready to Dispense
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">
                        {rx.patient_record?.patient?.user?.name}
                      </span>
                      <span className="text-slate-400"> · {rx.doctor?.user?.name} · </span>
                      <span className="text-slate-500">{rx.patient_record?.diagnosis}</span>
                    </p>

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
                      Issued{' '}
                      {new Date(rx.issued_at).toLocaleString('en-PH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/prescriptions/${rx.id}`, { state: { from: '/verify-queue' } })}
                      className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      style={{ border: '1px solid hsl(214 20% 90%)' }}
                    >
                      <Eye size={12} /> View Rx
                    </button>
                    <button
                      onClick={() => setActionTarget(rx)}
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
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        title={
          actionTarget?.status === 'issued' ? 'Verify Prescription' : 'Dispense Prescription'
        }
        description={
          actionTarget?.status === 'issued'
            ? `Verify ${actionTarget?.reference_no}? This action will be recorded immutably on the Hyperledger Fabric blockchain.`
            : `Mark ${actionTarget?.reference_no} as dispensed? The patient will receive their medications.`
        }
        confirmLabel={
          actionTarget?.status === 'issued' ? 'Verify & Record' : 'Mark as Dispensed'
        }
        loading={isActing}
        onConfirm={handleAction}
      />
    </>
  )
}
