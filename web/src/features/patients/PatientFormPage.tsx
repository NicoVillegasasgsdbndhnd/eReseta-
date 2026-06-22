import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, User, Mail, Phone, MapPin, CreditCard, Calendar, Save, Loader2, Lock, KeyRound, Copy, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePatient, useCreatePatient, useUpdatePatient } from './queries'
import { useAppointment } from '@/features/appointments/queries'
import { useAuthStore } from '@/features/auth/authStore'

const schema = z.object({
  name:          z.string().min(2, 'Full name is required'),
  email:         z.string().email('Enter a valid email'),
  phone:         z.string().min(10, 'Enter a valid phone number'),
  password:      z.string().optional(),
  dob:           z.string().min(1, 'Date of birth is required'),
  sex:           z.enum(['male', 'female']),
  address:       z.string().min(5, 'Address is required'),
  philhealth_no: z.string().optional(),
  contact:       z.string().min(10, 'Contact number is required'),
  // Expanded intake profile — all optional (leave blank if not provided).
  preferred_language:         z.string().optional(),
  known_allergies:            z.string().optional(),
  gov_id_type:                z.string().optional(),
  gov_id_no:                  z.string().optional(),
  hmo_provider:               z.string().optional(),
  hmo_policy_no:              z.string().optional(),
  hmo_group_no:               z.string().optional(),
  copay:                      z.string().optional(),
  emergency_contact_name:     z.string().optional(),
  emergency_contact_phone:    z.string().optional(),
  emergency_contact_relation: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function Field({ label, icon, error, children }: { label: string; icon: React.ReactNode; error?: string; children: React.ReactNode }) {
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

export default function PatientFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuthStore()
  const isEdit = !!id
  // When registering a guest at the visit, link the new account to their appointment.
  const appointmentId = params.get('appointment_id')
  // Staff manage patients from the Records area (they have no access to the admin patient list).
  const listPath = user?.role === 'staff' ? '/records' : '/patients'

  // After creating an account without a password, show staff the generated credentials once.
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: existing, isLoading } = usePatient(isEdit ? id : undefined)
  const { data: linkedAppt } = useAppointment(appointmentId ?? undefined)
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient(id)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sex: 'male' },
  })

  // Prefill the guest's snapshot (name + contact) when registering them at the visit.
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
        name:          existing.user?.name ?? '',
        email:         existing.user?.email ?? '',
        phone:         existing.user?.phone ?? '',
        dob:           existing.dob,
        sex:           existing.sex,
        address:       existing.address,
        philhealth_no: existing.philhealth_no ?? '',
        contact:       existing.contact,
        preferred_language:         existing.preferred_language ?? '',
        known_allergies:            existing.known_allergies ?? '',
        gov_id_type:                existing.gov_id_type ?? '',
        gov_id_no:                  existing.gov_id_no ?? '',
        hmo_provider:               existing.hmo_provider ?? '',
        hmo_policy_no:              existing.hmo_policy_no ?? '',
        hmo_group_no:               existing.hmo_group_no ?? '',
        copay:                      existing.copay ?? '',
        emergency_contact_name:     existing.emergency_contact_name ?? '',
        emergency_contact_phone:    existing.emergency_contact_phone ?? '',
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

    // Omitting the password makes the API generate (and email) a temporary one.
    const result = await createPatient.mutateAsync({
      ...data,
      password: data.password || undefined,
      appointment_id: appointmentId ? Number(appointmentId) : undefined,
    })

    if (result.temp_password) {
      // Show staff the one-time credentials before leaving the page.
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

  // ── Temp-credential modal (account-at-visit) ──────────────────────────────
  if (credentials) {
    const copy = () => {
      navigator.clipboard?.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center" style={{ border: '1px solid var(--color-border)' }}>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Account created</h3>
          <p className="text-sm text-slate-500 mt-1 mb-5">
            Share these temporary credentials with the patient. They'll be asked to change the password on first login. (Also emailed.)
          </p>
          <div className="rounded-xl p-4 text-left space-y-2" style={{ backgroundColor: 'hsl(201 60% 96%)' }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-800 break-all">{credentials.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><KeyRound size={11} /> Temporary password</p>
              <p className="text-lg font-bold font-mono" style={{ color: 'hsl(201 100% 30%)' }}>{credentials.password}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={copy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 transition-colors"
              style={{ border: '1px solid var(--color-border)', color: 'hsl(215 16% 40%)' }}
            >
              {copied ? <><CheckCircle2 size={15} className="text-emerald-500" /> Copied</> : <><Copy size={15} /> Copy</>}
            </button>
            <button
              onClick={() => navigate(appointmentId ? `/appointments/${appointmentId}` : listPath)}
              className="flex-1 h-10 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
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
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(listPath)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-base font-bold text-slate-800">
          {isEdit ? `Edit Patient — ${existing?.user?.name ?? `#${id}`}` : 'Add New Patient'}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <User size={14} />
            </div>
            <p className="font-semibold text-slate-700">Account Information</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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
              <div className="col-span-2">
                <Field label="Temporary Password" icon={<Lock size={11} />} error={errors.password?.message}>
                  <Input {...register('password')} type="text" placeholder="Leave blank to use default: Welcome1!" className="h-10 text-sm border-slate-200" />
                </Field>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Calendar size={14} />
            </div>
            <p className="font-semibold text-slate-700">Patient Demographics</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth" icon={<Calendar size={11} />} error={errors.dob?.message}>
              <Input {...register('dob')} type="date" className="h-10 text-sm border-slate-200" />
            </Field>

            <Field label="Sex" icon={<User size={11} />} error={errors.sex?.message}>
              <select
                {...register('sex')}
                className="w-full h-10 text-sm border border-slate-200 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-700"
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

            <div className="col-span-2">
              <Field label="Home Address" icon={<MapPin size={11} />} error={errors.address?.message}>
                <Textarea
                  {...register('address')}
                  placeholder="Barangay, City/Municipality, Province"
                  rows={2}
                  className="text-sm border-slate-200 resize-none"
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Known Allergies" icon={<User size={11} />}>
                <Input {...register('known_allergies')} placeholder="e.g. Penicillin, Peanuts — leave blank if none" className="h-10 text-sm border-slate-200" />
              </Field>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CreditCard size={14} />
            </div>
            <p className="font-semibold text-slate-700">Government &amp; Insurance Verification</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="col-span-2">
              <Field label="Copay / Coverage Notes" icon={<CreditCard size={11} />}>
                <Input {...register('copay')} placeholder="e.g. 20% copay on procedures" className="h-10 text-sm border-slate-200" />
              </Field>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Phone size={14} />
            </div>
            <p className="font-semibold text-slate-700">Emergency Contact</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Person" icon={<User size={11} />}>
              <Input {...register('emergency_contact_name')} placeholder="e.g. Maria Santos" className="h-10 text-sm border-slate-200" />
            </Field>
            <Field label="Relationship" icon={<User size={11} />}>
              <Input {...register('emergency_contact_relation')} placeholder="e.g. Mother, Spouse, Guarantor" className="h-10 text-sm border-slate-200" />
            </Field>
            <div className="col-span-2">
              <Field label="Contact Number" icon={<Phone size={11} />}>
                <Input {...register('emergency_contact_phone')} placeholder="09XXXXXXXXX" className="h-10 text-sm border-slate-200" />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
            style={{ border: '1px solid var(--color-border)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
