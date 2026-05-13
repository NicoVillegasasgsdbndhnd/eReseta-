import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, User, Mail, Phone, MapPin, CreditCard, Calendar, Save, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePatient, useCreatePatient, useUpdatePatient } from './queries'

const schema = z.object({
  name:          z.string().min(2, 'Full name is required'),
  email:         z.string().email('Enter a valid email'),
  phone:         z.string().min(10, 'Enter a valid phone number'),
  dob:           z.string().min(1, 'Date of birth is required'),
  sex:           z.enum(['male', 'female']),
  address:       z.string().min(5, 'Address is required'),
  philhealth_no: z.string().optional(),
  contact:       z.string().min(10, 'Contact number is required'),
})

type FormValues = z.infer<typeof schema>

function Field({ label, icon, error, children }: { label: string; icon: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
  const isEdit = !!id

  const { data: existing, isLoading } = usePatient(isEdit ? id : undefined)
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient(id)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sex: 'male' },
  })

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
      })
    }
  }, [existing, isEdit, reset])

  const onSubmit = async (data: FormValues) => {
    if (isEdit) {
      await updatePatient.mutateAsync(data)
    } else {
      await createPatient.mutateAsync({ ...data, password: 'Welcome1!' })
    }
    navigate('/patients')
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 bg-white rounded-lg px-3 py-1.5 shadow-sm transition-colors"
          style={{ border: '1px solid hsl(214 20% 90%)' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="text-base font-bold text-slate-800">
          {isEdit ? `Edit Patient — ${existing?.user?.name ?? `#${id}`}` : 'Add New Patient'}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
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
                className="w-full h-10 text-sm border border-slate-200 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4" style={{ border: '1px solid hsl(214 20% 90%)' }}>
          <div className="flex items-center gap-2 pb-4" style={{ borderBottom: '1px solid hsl(214 20% 93%)' }}>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CreditCard size={14} />
            </div>
            <p className="font-semibold text-slate-700">PhilHealth & Contact</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="PhilHealth No." icon={<CreditCard size={11} />} error={errors.philhealth_no?.message}>
              <Input
                {...register('philhealth_no')}
                placeholder="PH-XXX-XXX-XXX (optional)"
                className="h-10 text-sm border-slate-200 font-mono"
              />
            </Field>
            <Field label="Emergency Contact" icon={<Phone size={11} />} error={errors.contact?.message}>
              <Input {...register('contact')} placeholder="09XXXXXXXXX" className="h-10 text-sm border-slate-200" />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
            style={{ border: '1px solid hsl(214 20% 90%)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
