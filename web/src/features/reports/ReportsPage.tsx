import { BarChart2, Calendar, Pill, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import PageHeader from '@/components/common/PageHeader'
import StatusBadge from '@/components/common/StatusBadge'
import { useAppointments } from '@/features/appointments/queries'
import { usePrescriptions } from '@/features/prescriptions/queries'
import { usePatients } from '@/features/patients/queries'
import type { AppointmentStatus, PrescriptionStatus } from '@/mocks/types'

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="text-blue-600">{icon}</div>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </div>
  )
}

export default function ReportsPage() {
  const { data: apptData } = useAppointments()
  const { data: rxData } = usePrescriptions()
  const { data: patientsData } = usePatients()

  const appointments = apptData?.data ?? []
  const prescriptions = rxData?.data ?? []
  const patients = patientsData?.data ?? []

  const statusCounts = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {})
  const apptStatusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  const typeCounts = appointments.reduce<Record<string, number>>((acc, a) => {
    const label = a.type === 'consultation' ? 'Consultation' : a.type === 'follow_up' ? 'Follow-up' : 'Emergency'
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})
  const apptTypeData = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))

  const rxStatusCounts = prescriptions.reduce<Record<string, number>>((acc, rx) => {
    acc[rx.status] = (acc[rx.status] ?? 0) + 1
    return acc
  }, {})
  const rxStatusData = Object.entries(rxStatusCounts).map(([status, count]) => ({ status, count }))

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    const dateStr = d.toISOString().split('T')[0]
    const count = appointments.filter((a) => a.scheduled_at.startsWith(dateStr)).length
    return { date: label, appointments: count }
  })

  const blockchainCount = prescriptions.filter((rx) => rx.blockchain_tx_id).length

  return (
    <>
      <PageHeader title="Reports" description="Analytics and activity summaries for DEAMHI" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Appointments', value: apptData?.meta.total ?? appointments.length, icon: <Calendar size={18} />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Prescriptions', value: rxData?.meta.total ?? prescriptions.length, icon: <Pill size={18} />, color: 'bg-green-50 text-green-600' },
          { label: 'Registered Patients', value: patientsData?.meta.total ?? patients.length, icon: <Users size={18} />, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Blockchain Records', value: blockchainCount, icon: <BarChart2 size={18} />, color: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 93%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="appointments" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <p className="text-sm font-semibold mb-3">Appointment Status Breakdown</p>
            <div className="space-y-2">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid hsl(214 20% 95%)' }}>
                  <div>
                    <p className="text-sm font-medium">{a.patient?.user?.name} → {a.doctor?.user?.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(a.scheduled_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <StatusBadge status={a.status as AppointmentStatus} />
                </div>
              ))}
            </div>
          </div>
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

          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <p className="text-sm font-semibold mb-3">Prescription Activity Log</p>
            <div className="space-y-2">
              {prescriptions
                .flatMap((rx) => rx.events ?? [])
                .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
                .map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid hsl(214 20% 95%)' }}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${event.event_type === 'ISSUED' ? 'bg-blue-500' : event.event_type === 'VERIFIED' ? 'bg-indigo-500' : 'bg-green-500'}`} />
                      <div>
                        <p className="text-sm">{event.event_type} by <span className="font-medium">{event.actor?.name}</span></p>
                        <p className="text-xs text-slate-400">
                          {new Date(event.occurred_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title="Patient Demographics" icon={<Users size={15} />}>
              <div className="space-y-2 mt-2">
                {[
                  { label: 'Male', count: patients.filter((p) => p.sex === 'male').length },
                  { label: 'Female', count: patients.filter((p) => p.sex === 'female').length },
                  { label: 'With PhilHealth', count: patients.filter((p) => p.philhealth_no).length },
                  { label: 'Without PhilHealth', count: patients.filter((p) => !p.philhealth_no).length },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className="font-semibold text-sm">{item.count}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Visit Frequency" icon={<Calendar size={15} />}>
              <div className="space-y-2 mt-2">
                {patients.map((p) => {
                  const visits = appointments.filter((a) => a.patient_id === p.id && a.status === ('served' as AppointmentStatus)).length
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

          <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid hsl(214 20% 90%)' }}>
            <p className="text-sm font-semibold mb-3">Prescription Status per Patient</p>
            <div className="space-y-2">
              {patients.map((p) => {
                const rxList = prescriptions.filter((rx) => rx.patient_record?.patient_id === p.id)
                if (rxList.length === 0) return null
                return (
                  <div key={p.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid hsl(214 20% 95%)' }}>
                    <span className="text-sm font-medium">{p.user?.name}</span>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {rxList.map((rx) => (
                        <StatusBadge key={rx.id} status={rx.status as PrescriptionStatus} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
