import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MapPin, ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'
import { useAuthStore } from '@/features/auth/authStore'
import type { User } from '@/mocks/types'

const schema = z.object({
  address: z.string().min(5, 'Please enter your home address'),
  emergency_contact_name: z.string().min(1, 'Emergency contact name is required'),
  emergency_contact_phone: z.string().regex(/^(09\d{9}|\+639\d{9})$/, 'Enter a valid PH mobile number'),
  emergency_contact_relation: z.string().optional(),
  known_allergies: z.string().min(1, 'Enter your known allergies, or type "None"'),
})
type FormValues = z.infer<typeof schema>

const BLUE = 'hsl(201 100% 36%)'

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormValues) => {
    setError(null)
    try {
      const res = await api.post<User>('/me/complete-profile', data)
      setUser(res.data)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Could not save your details. Please try again.')
    }
  }

  const border = { border: '1px solid hsl(214 20% 90%)' }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm" style={border}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50">
          <MapPin size={24} className="text-sky-600" />
        </div>
        <h1 className="text-center text-lg font-bold text-slate-800">Complete your profile</h1>
        <p className="mx-auto mt-1 mb-6 max-w-sm text-center text-sm text-slate-500">
          Welcome! Before you continue, please add your home address and an emergency contact.
          This is required for your patient record.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            <ShieldAlert size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Home address</label>
            <Textarea {...register('address')} rows={2} placeholder="House no., street, barangay, city" className="text-sm resize-none" />
            {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Emergency contact name</label>
              <Input {...register('emergency_contact_name')} placeholder="Full name" className="h-10 text-sm" />
              {errors.emergency_contact_name && <p className="mt-1 text-xs text-red-500">{errors.emergency_contact_name.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Emergency contact number</label>
              <Input {...register('emergency_contact_phone')} inputMode="tel" placeholder="09XXXXXXXXX" className="h-10 text-sm" />
              {errors.emergency_contact_phone && <p className="mt-1 text-xs text-red-500">{errors.emergency_contact_phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Relationship <span className="font-normal text-slate-400">(optional)</span></label>
            <Input {...register('emergency_contact_relation')} placeholder="e.g. Spouse, Parent" className="h-10 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Known allergies</label>
            <Input {...register('known_allergies')} placeholder='e.g. Penicillin — or type "None"' className="h-10 text-sm" />
            {errors.known_allergies && <p className="mt-1 text-xs text-red-500">{errors.known_allergies.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 h-11 w-full rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: BLUE }}
          >
            {isSubmitting ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Save & continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
