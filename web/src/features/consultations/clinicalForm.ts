// Structured Vital Signs + Physical Examination, mirroring DEAMHI's paper Out-Patient form.
// Shared between the consultation form (ConsultationsPage) and the record view (PatientProfilePage).

export const VITALS: [string, string][] = [
  ['bp', 'BP'], ['cr', 'CR'], ['rr', 'RR'], ['temp', 'Temp'], ['o2_sat', 'O₂ Sat'], ['weight', 'Weight'],
]

export const PE_SYSTEMS: [string, string][] = [
  ['skin', 'Skin'], ['head', 'Head'], ['lymph_nodes', 'Lymph Nodes'], ['chest_lungs', 'Chest / Lungs'],
  ['cardiovascular', 'Cardiovascular'], ['breast', 'Breast'], ['abdomen', 'Abdomen'],
  ['rectum_genitalia', 'Rectum & Genitalia'], ['musculoskeletal', 'Musculoskeletal'], ['neurological', 'Neurological'],
]

export type PEEntry = { status: string; notes: string }

export const emptyVitals = (): Record<string, string> =>
  Object.fromEntries(VITALS.map(([k]) => [k, '']))

export const emptyExam = (): Record<string, PEEntry> =>
  Object.fromEntries(PE_SYSTEMS.map(([k]) => [k, { status: 'Normal', notes: '' }]))
