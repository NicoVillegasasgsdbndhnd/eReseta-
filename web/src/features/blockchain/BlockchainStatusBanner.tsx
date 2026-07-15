import { AlertTriangle } from 'lucide-react'
import { useBlockchainStatus } from './queries'

// Non-blocking notice shown when the blockchain is enabled but temporarily unreachable.
// Prescriptions are still saved and auto-sync on recovery, so this is informational only.
export default function BlockchainStatusBanner() {
  const { data } = useBlockchainStatus()
  if (!data || !data.enabled || data.online) return null

  return (
    <div
      className="no-print mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3"
      style={{ backgroundColor: 'hsl(38 92% 95%)', border: '1px solid hsl(38 80% 80%)' }}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'hsl(30 90% 45%)' }} />
      <p className="text-sm" style={{ color: 'hsl(30 45% 28%)' }}>
        <span className="font-semibold">Blockchain temporarily offline.</span>{' '}
        Prescriptions are still saved and will sync to the blockchain automatically once it's back
        online — your work is not affected.
      </p>
    </div>
  )
}
