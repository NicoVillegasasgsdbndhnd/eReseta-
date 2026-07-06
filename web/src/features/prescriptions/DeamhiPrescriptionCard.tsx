import type { Prescription } from '@/mocks/types'

function calcAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}


export default function DeamhiPrescriptionCard({ rx }: { rx: Prescription }) {
  const patient  = rx.patient_record?.patient
  const doctor   = rx.doctor
  const issuedAt = new Date(rx.issued_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })
  const age      = patient?.dob ? calcAge(patient.dob) : '—'
  const sex      = patient?.sex ? (patient.sex === 'male' ? 'M' : 'F') : '—'
  const address  = patient?.address ?? '—'
  const name     = patient?.user?.name ?? '—'

  return (
    <div
      className="bg-white rounded-xl overflow-hidden mx-auto"
      style={{
        border:    '1px solid hsl(210 18% 85%)',
        maxWidth:  '480px',
        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.07)',
      }}
    >
      {/* ── Hospital header ── */}
      <div className="text-center px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-center gap-3 mb-1.5">
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <circle cx="23" cy="23" r="21" fill="white" stroke="#15803d" strokeWidth="2"/>
            <rect x="20" y="9"  width="6" height="28" rx="1" fill="#15803d"/>
            <rect x="9"  y="20" width="28" height="6" rx="1" fill="#15803d"/>
            <circle cx="23" cy="23" r="5" fill="white"/>
            <line x1="23" y1="16" x2="23" y2="30" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M20 19 C20 17 26 17 26 20.5 C26 24 20 24 20 27.5 C20 31 26 31 26 28.5"
                  stroke="#dc2626" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
            <circle cx="26" cy="28.5" r="1.2" fill="#dc2626"/>
            <path d="M21 18 C19 15.5 16.5 15.5 16.5 17.5" stroke="#dc2626" strokeWidth="1" fill="none" strokeLinecap="round"/>
            <path d="M25 18 C27 15.5 29.5 15.5 29.5 17.5" stroke="#dc2626" strokeWidth="1" fill="none" strokeLinecap="round"/>
          </svg>

          <div className="text-left">
            <p className="font-black text-xl leading-none" style={{ color: '#15803d', letterSpacing: '0.04em' }}>
              DEAMHI
            </p>
            <p className="text-[9px] font-semibold leading-tight mt-0.5" style={{ color: '#374151' }}>
              DR. EUTIQUIO LL. ATANACIO, JR.
            </p>
            <p className="text-[9px] font-semibold leading-tight" style={{ color: '#374151' }}>
              MEMORIAL HOSPITAL, INC.
            </p>
          </div>
        </div>
        <p className="text-[10px] font-medium" style={{ color: '#4b5563' }}>
          F. TIMBOL ST. SAN JOSE CONCEPCION TARLAC
        </p>
        <p className="text-[10px]" style={{ color: '#4b5563' }}>
          TEL. NO. : (045) 6090 368
        </p>
      </div>

      {/* ── Patient info fields ── */}
      <div className="px-6 pt-3 pb-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div className="flex items-end gap-3 mb-2">
          <div className="flex items-end gap-1 flex-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>NAME:</span>
            <span className="flex-1 text-sm font-medium pb-0.5" style={{ borderBottom: '1px solid #374151', color: '#111827', minWidth: '120px' }}>
              {name}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>DATE:</span>
            <span className="text-[11px] pb-0.5" style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '80px' }}>
              {issuedAt}
            </span>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex items-end gap-1 flex-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>ADDRESS:</span>
            <span className="flex-1 text-[11px] pb-0.5" style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '90px' }}>
              {address}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>AGE:</span>
            <span className="text-[11px] pb-0.5 text-center" style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '24px' }}>
              {age}
            </span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-[11px] font-bold shrink-0" style={{ color: '#111827' }}>SEX:</span>
            <span className="text-[11px] pb-0.5 text-center" style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '20px' }}>
              {sex}
            </span>
          </div>
        </div>
      </div>

      {/* ── Rx + Medications ── */}
      <div className="flex gap-3 px-6 pt-4 pb-5" style={{ minHeight: '160px' }}>
        <div
          className="shrink-0 select-none"
          style={{ fontSize: '64px', lineHeight: 1, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, color: '#111827' }}
        >
          ℞
        </div>
        <div className="flex-1 pt-2 space-y-4">
          {rx.items.map((item, idx) => (
            <div key={item.id}>
              <p className="text-sm font-bold" style={{ color: '#111827' }}>
                {idx + 1}. {item.drug_name}{' '}
                <span className="font-normal text-xs" style={{ color: '#374151' }}>{item.dosage}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
                Disp. {item.quantity}{item.quantity_unit ? ` ${item.quantity_unit}` : ''} &nbsp;·&nbsp; {item.frequency} &nbsp;·&nbsp; {item.duration}
              </p>
              {item.instructions && (
                <p className="text-xs mt-0.5 italic" style={{ color: '#6b7280' }}>
                  Sig: {item.instructions}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Doctor signature block ── */}
      <div className="flex justify-end px-6 pb-5 pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
        <div>
          {/* Uploaded signature image takes precedence over the typed e-signature. */}
          {doctor?.signature_image ? (
            <img src={doctor.signature_image} alt="Signature" className="h-10 mx-auto object-contain pb-0.5" style={{ maxWidth: '176px' }} />
          ) : doctor?.signature ? (
            <p className="text-center text-base pb-0.5" style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive', color: '#111827' }}>
              {doctor.signature}
            </p>
          ) : null}
          <div className="mb-1" style={{ borderBottom: '1.5px solid #111827', width: '176px' }} />
          <p className="text-[10px] text-center font-semibold mb-2" style={{ color: '#111827' }}>
            {doctor?.user?.name ?? '—'}
          </p>
          <div className="space-y-0.5">
            <div className="flex items-end gap-1">
              <span className="text-[10px] font-bold shrink-0" style={{ color: '#111827' }}>LIC. NO.</span>
              <span className="text-[10px] pb-0.5 flex-1" style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '110px' }}>
                {doctor?.license_no ?? ''}
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-[10px] font-bold shrink-0" style={{ color: '#111827' }}>PTR NO.</span>
              <span className="text-[10px] pb-0.5 flex-1" style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '110px' }}>
                {doctor?.ptr_no || ' '}
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-[10px] font-bold shrink-0" style={{ color: '#111827' }}>S2</span>
              <span className="text-[10px] pb-0.5 flex-1" style={{ borderBottom: '1px solid #374151', color: '#374151', minWidth: '125px' }}>
                {doctor?.s2_license || ' '}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
