import { BarChart2, Calendar, Pill, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { mockAppointments, mockPrescriptions, mockPatients } from '@/mocks/data'
import PageHeader from '@/components/common/PageHeader'
import StatusBadge from '@/components/common/StatusBadge'

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-blue-600">{icon}</div>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </Card>
  )
}

export default function ReportsPage() {
  // Appointment summary by status
  const statusCounts = mockAppointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const apptStatusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  // Appointment by type
  const typeCounts = mockAppointments.reduce<Record<string, number>>((acc, a) => {
    const label = a.type === 'consultation' ? 'Consultation' : a.type === 'follow_up' ? 'Follow-up' : 'Emergency'
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})
  const apptTypeData = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))

  // Prescription activity by status
  const rxStatusCounts = mockPrescriptions.reduce<Record<string, number>>((acc, rx) => {
    acc[rx.status] = (acc[rx.status] ?? 0) + 1
    return acc
  }, {})
  const rxStatusData = Object.entries(rxStatusCounts).map(([status, count]) => ({ status, count }))

  // Weekly patient visits (simulated from patient records dates)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    const dateStr = d.toISOString().split('T')[0]
    const appts = mockAppointments.filter((a) => a.scheduled_at.startsWith(dateStr)).length
    return { date: label, appointments: appts }
  })

  return (
    <>
      <PageHeader title="Reports" description="Analytics and activity summaries for DEAMHI" />

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Appointments', value: mockAppointments.length, icon: <Calendar size={18} />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Prescriptions', value: mockPrescriptions.length, icon: <Pill size={18} />, color: 'bg-green-50 text-green-600' },
          { label: 'Registered Patients', value: mockPatients.length, icon: <Users size={18} />, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Blockchain Records', value: mockPrescriptions.filter((rx) => rx.blockchain_tx_id).length, icon: <BarChart2 size={18} />, color: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="appointments">
        <TabsList className="mb-4">
          <TabsTrigger value="appointments">
            <Calendar size={13} className="mr-1.5" /> Appointments
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <Pill size={13} className="mr-1.5" /> Prescriptions
          </TabsTrigger>
          <TabsTrigger value="patients">
            <Users size={13} className="mr-1.5" /> Patients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Appointments by Status" icon={<Calendar size={15} />}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={apptStatusData}>
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Appointments by Type" icon={<BarChart2 size={15} />}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={apptTypeData}>
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <SectionCard title="Weekly Appointment Volume" icon={<Calendar size={15} />}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          <Card className="p-5">
            <p className="text-sm font-semibold mb-3">Appointment Status Breakdown</p>
            <div className="space-y-2">
              {mockAppointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{a.patient?.user?.name} → {a.doctor?.user?.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          <SectionCard title="Prescriptions by Status" icon={<Pill size={15} />}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rxStatusData}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <Card className="p-5">
            <p className="text-sm font-semibold mb-3">Prescription Activity Log</p>
            <div className="space-y-2">
              {mockPrescriptions.flatMap((rx) => rx.events ?? []).sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()).map((event) => (
                <div key={event.id} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${event.event_type === 'ISSUED' ? 'bg-blue-500' : event.event_type === 'VERIFIED' ? 'bg-indigo-500' : 'bg-green-500'}`} />
                    <div>
                      <p className="text-sm">{event.event_type} by <span className="font-medium">{event.actor?.name}</span></p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {new Date(event.occurred_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  {event.blockchain_tx_id && (
                    <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
                      {event.blockchain_tx_id.slice(0, 10)}…
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title="Patient Demographics" icon={<Users size={15} />}>
              <div className="space-y-2 mt-2">
                {[
                  { label: 'Male', count: mockPatients.filter((p) => p.sex === 'male').length },
                  { label: 'Female', count: mockPatients.filter((p) => p.sex === 'female').length },
                  { label: 'With PhilHealth', count: mockPatients.filter((p) => p.philhealth_no).length },
                  { label: 'Without PhilHealth', count: mockPatients.filter((p) => !p.philhealth_no).length },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-[var(--color-muted-foreground)]">{item.label}</span>
                    <span className="font-semibold text-sm">{item.count}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Visit Frequency" icon={<Calendar size={15} />}>
              <div className="space-y-2 mt-2">
                {mockPatients.map((p) => {
                  const visits = mockAppointments.filter((a) => a.patient_id === p.id && a.status === 'served').length
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm">{p.user?.name}</span>
                      <span className="text-sm font-semibold text-blue-600">{visits} visits</span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
