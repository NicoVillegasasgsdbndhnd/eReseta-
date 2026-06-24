import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Save,
  Loader2,
  Lock,
  KeyRound,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePatient, useCreatePatient, useUpdatePatient } from './queries'
import { useAppointment } from '@/features/appointments/queries'
import { useAuthStore } from '@/features/auth/authStore'

const schema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  password: z.string().optional(),
  dob: z.string().min(1, 'Date of birth is required'),
  sex: z.enum(['male', 'female']),
  address: z.string().min(5, 'Address is required'),
  philhealth_no: z.string().optional(),
  contact: z.string().min(10, 'Contact number is required'),
  preferred_language: z.string().optional(),
  known_allergies: z.string().optional(),
  gov_id_type: z.string().optional(),
  gov_id_no: z.string().optional(),
  hmo_provider: z.string().optional(),
  hmo_policy_no: z.string().optional(),
  hmo_group_no: z.string().optional(),
  copay: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function Field({
  label,
  icon,
  error,
  children,
}: {
  label: string
  icon: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon} {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700">{icon}</span>
        <div>
          <p className="font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function PatientFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuthStore()
  const isEdit = !!id
  const appointmentId = params.get('appointment_id')
  const listPath = user?.role === 'staff' ? '/records' : '/patients'

  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: existing, isLoading } = usePatient(isEdit ? id : undefined)
  const { data: linkedAppt } = useAppointment(appointmentId ?? undefined)
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient(id)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sex: 'male' },
  })

  useEffect(() => {
    if (linkedAppt && !isEdit && appointmentId) {
      if (linkedAppt.guest_name) setValue('name', linkedAppt.guest_name)
      if (linkedAppt.guest_contact) {
        setValue('phone', linkedAppt.guest_contact)
        setValue('contact', linkedAppt.guest_contact)
      }
    }
  }, [linkedAppt, isEdit, appointmentId, setValue])

  useEffect(() => {
    if (existing && isEdit) {
      reset({
        name: existing.user?.name ?? '',
        email: existing.user?.email ?? '',
        phone: existing.user?.phone ?? '',
        dob: existing.dob,
        sex: existing.sex,
        address: existing.address,
        philhealth_no: existing.philhealth_no ?? '',
        contact: existing.contact,
        preferred_language: existing.preferred_language ?? '',
        known_allergies: existing.known_allergies ?? '',
        gov_id_type: existing.gov_id_type ?? '',
        gov_id_no: existing.gov_id_no ?? '',
        hmo_provider: existing.hmo_provider ?? '',
        hmo_policy_no: existing.hmo_policy_no ?? '',
        hmo_group_no: existing.hmo_group_no ?? '',
        copay: existing.copay ?? '',
        emergency_contact_name: existing.emergency_contact_name ?? '',
        emergency_contact_phone: existing.emergency_contact_phone ?? '',
        emergency_contact_relation: existing.emergency_contact_relation ?? '',
      })
    }
  }, [existing, isEdit, reset])

  const onSubmit = async (data: FormValues) => {
    if (isEdit) {
      await updatePatient.mutateAsync(data)
      navigate(listPath)
      return
    }

    const result = await createPatient.mutateAsync({
      ...data,
      password: data.password || undefined,
      appointment_id: appointmentId ? Number(appointmentId) : undefined,
    })

    if (result.temp_password) {
      setCredentials({ email: data.email, password: result.temp_password })
      return
    }

    navigate(appointmentId ? `/appointments/${appointmentId}` : listPath)
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (credentials) {
    const copy = () => {
      navigator.clipboard?.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }

    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Account created</h3>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Share these temporary credentials with the patient. They will be asked to change the password on first login.
          </p>
          <div className="space-y-2 rounded-xl p-4 text-left" style={{ backgroundColor: 'hsl(201 60% 96%)' }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="break-all text-sm font-medium text-slate-800">{credentials.email}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <KeyRound size={11} /> Temporary password
              </p>
              <p className="font-mono text-lg font-bold" style={{ color: 'hsl(201 100% 30%)' }}>
                {credentials.password}
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={copy}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-semibold transition-colors hover:bg-slate-50"
              style={{ border: '1px solid var(--color-border)', color: 'hsl(215 16% 40%)' }}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={15} className="text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy size={15} /> Copy
                </>
              )}
            </button>
            <button
              onClick={() => navigate(appointmentId ? `/appointments/${appointmentId}` : listPath)}
              className="h-10 flex-1 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'hsl(201 100% 36%)' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
        <div
          className="flex flex-wrap items-start justify-between gap-4 p-5"
          style={{ background: 'linear-gradient(135deg, hsl(201 78% 96%) 0%, hsl(168 42% 96%) 100%)' }}
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(listPath)}
              className="mb-4 inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              style={{ border: '1px solid hsl(210 18% 86%)' }}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'hsl(201 100% 32%)' }}>
              Staff patient intake
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {isEdit ? `Edit ${existing?.user?.name ?? `Patient #${id}`}` : appointmentId ? 'Register guest as patient' : 'Add new patient record'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Capture account access, demographics, verification details, and emergency contact in one clean intake flow.
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(201 45% 84%)' }}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Intake status</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                Required demographics marked by validation
              </div>
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-sky-700" />
                Temporary password can be generated
              </div>
              {appointmentId && (
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-amber-600" />
                  Linked to appointment #{appointmentId}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Section icon={<User size={17} />} title="Account information" subtitle="Patient login and primary contact details">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Full Name" icon={<User size={11} />} error={errors.name?.message}>
                  <Input {...register('name')} placeholder="e.g. Juan dela Cruz" className="h-10 text-sm border-slate-200" />
                </Field>
              </div>
              <Field label="Email Address" icon={<Mail size={11} />} error={errors.email?.message}>
                <Input {...register('email')} type="email" placeholder="e.g. juan@email.com" className="h-10 text-sm border-slate-200" />
              </Field>
              <Field label="Phone Number" icon={<Phone size={11} />} error={errors.phone?.message}>
                <Input {...register('phone')} placeholder="09XXXXXXXXX" className="h-10 text-sm border-slate-200" />
              </Field>
              {!isEdit && (
                <div className="md:col-span-2">
                  <Field label="Temporary Password" icon={<Lock size={11} />} error={errors.password?.message}>
                    <Input {...register('password')} type="text" placeholder="Leave blank to generate a temporary password" className="h-10 text-sm border-slate-200" />
                  </Field>
                </div>
              )}
            </div>
          </Section>

          <Section icon={<Calendar size={17} />} title="Demographics" subtitle="Identity, language, address, and safety notes">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Date of Birth" icon={<Calendar size={11} />} error={errors.dob?.message}>
                <Input {...register('dob')} type="date" className="h-10 text-sm border-slate-200" />
              </Field>
              <Field label="Sex" icon={<User size={11} />} error={errors.sex?.message}>
                <select
                  {...register('sex')}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="Preferred Language" icon={<User size={11} />}>
                <Input {...register('preferred_language')} placeholder="e.g. Filipino, English" className="h-10 text-sm border-slate-200" />
              </Field>
              <Field label="Mobile Number" icon={<Phone size={11} />} error={errors.contact?.message}>
                <Input {...register('contact')} placeholder="09XXXXXXXXX" className="h-10 text-sm border-slate-200" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Home Address" icon={<MapPin size={11} />} error={errors.address?.message}>
                  <Textarea
                    {...register('address')}
                    placeholder="Barangay, City/Municipality, Province"
                    rows={2}
                    className="resize-none text-sm border-slate-200"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Known Allergies" icon={<User size={11} />}>
                  <Input {...register('known_allergies')} placeholder="e.g. Penicillin, Peanuts - leave blank if none" className="h-10 text-sm border-slate-200" />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={<CreditCard size={17} />} title="Government and insurance" subtitle="Optional identifiers and coverage notes">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="PhilHealth No." icon={<CreditCard size={11} />} error={errors.philhealth_no?.message}>
                <Input {...register('philhealth_no')} placeholder="XX-XXXXXXXXX-X (optional)" className="h-10 text-sm border-slate-200 font-mono" />
              </Field>
              <Field label="Government ID Type" icon={<CreditCard size={11} />}>
                <Input {...register('gov_id_type')} placeholder="e.g. UMID, Passport, Driver's License" className="h-10 text-sm border-slate-200" />
              </Field>
              <Field label="Government ID No." icon={<CreditCard size={11} />}>
                <Input {...register('gov_id_no')} placeholder="ID number" className="h-10 text-sm border-slate-200 font-mono" />
              </Field>
              <Field label="HMO Provider" icon={<CreditCard size={11} />}>
                <Input {...register('hmo_provider')} placeholder="e.g. Maxicare, Intellicare" className="h-10 text-sm border-slate-200" />
              </Field>
              <Field label="HMO Card / Policy No." icon={<CreditCard size={11} />}>
                <Input {...register('hmo_policy_no')} placeholder="Policy / card number" className="h-10 text-sm border-slate-200 font-mono" />
              </Field>
              <Field label="HMO Group No." icon={<CreditCard size={11} />}>
                <Input {...register('hmo_group_no')} placeholder="Group number" className="h-10 text-sm border-slate-200 font-mono" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Copay / Coverage Notes" icon={<CreditCard size={11} />}>
                  <Input {...register('copay')} placeholder="e.g. 20% copay on procedures" className="h-10 text-sm border-slate-200" />
                </Field>
              </div>
            </div>
          </Section>

          <Section icon={<Phone size={17} />} title="Emergency contact" subtitle="A reachable contact for urgent coordination">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Contact Person" icon={<User size={11} />}>
                <Input {...register('emergency_contact_name')} placeholder="e.g. Maria Santos" className="h-10 text-sm border-slate-200" />
              </Field>
              <Field label="Relationship" icon={<User size={11} />}>
                <Input {...register('emergency_contact_relation')} placeholder="e.g. Mother, Spouse, Guarantor" className="h-10 text-sm border-slate-200" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Contact Number" icon={<Phone size={11} />}>
                  <Input {...register('emergency_contact_phone')} placeholder="09XXXXXXXXX" className="h-10 text-sm border-slate-200" />
                </Field>
              </div>
            </div>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-bold text-slate-800">Save patient record</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Staff-created patient accounts are available immediately after saving. Temporary credentials are shown once when generated.
            </p>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Account access</span>
                <span className="font-bold text-slate-800">{isEdit ? 'Existing' : 'New'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Source</span>
                <span className="font-bold text-slate-800">{appointmentId ? 'Guest visit' : 'Manual intake'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Return to</span>
                <span className="font-bold text-slate-800">{user?.role === 'staff' ? 'Records' : 'Patients'}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800 disabled:opacity-60"
              >
                <Save size={15} />
                {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add patient'}
              </button>
              <button
                type="button"
                onClick={() => navigate(listPath)}
                className="h-10 rounded-lg bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                style={{ border: '1px solid var(--color-border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  )
}
