import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface BlockchainEvent {
  id: number
  prescription_id: number | null
  reference_no: string | null
  event_type: string // ISSUED | VERIFIED | DISPENSED
  actor: string | null
  occurred_at: string
  blockchain_tx_id: string | null
}

export interface BlockchainActivity {
  status: {
    enabled: boolean
    online: boolean
    gateway_url: string
    channel: string
    chaincode: string
  }
  stats: {
    anchored_prescriptions: number
    total_prescriptions: number
    anchored_events: number
    total_events: number
  }
  recent: BlockchainEvent[]
}


export function useBlockchainActivity() {
  return useQuery({
    queryKey: ['blockchain', 'activity'],
    queryFn: () => api.get<BlockchainActivity>('/blockchain/activity').then((r) => r.data),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  })
}
