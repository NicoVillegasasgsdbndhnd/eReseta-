// Lightweight prescribing-safety checks (allergy conflicts + duplicate/same-class therapy).
// This is a teaching-grade knowledge base — a real system would use a licensed drug database.

export interface RxWarning {
  level: 'allergy' | 'duplicate' | 'interaction'
  drug: string
  message: string
}

// Drug class → member keyword (lowercase substrings matched against the drug name).
const DRUG_CLASSES: Record<string, string[]> = {
  penicillin:     ['penicillin', 'amoxicillin', 'amoxil', 'ampicillin', 'cloxacillin', 'oxacillin', 'piperacillin', 'augmentin', 'co-amoxiclav'],
  cephalosporin:  ['cephalexin', 'cefalexin', 'cefuroxime', 'ceftriaxone', 'cefixime', 'cefaclor', 'cefadroxil'],
  sulfonamide:    ['sulfamethoxazole', 'cotrimoxazole', 'co-trimoxazole', 'bactrim', 'sulfa'],
  nsaid:          ['ibuprofen', 'naproxen', 'diclofenac', 'mefenamic', 'celecoxib', 'ketorolac', 'aspirin', 'indomethacin', 'etoricoxib'],
  macrolide:      ['azithromycin', 'erythromycin', 'clarithromycin'],
  quinolone:      ['ciprofloxacin', 'levofloxacin', 'ofloxacin', 'moxifloxacin'],
  statin:         ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
  ace_inhibitor:  ['lisinopril', 'enalapril', 'captopril', 'ramipril', 'perindopril'],
  opioid:         ['morphine', 'codeine', 'tramadol', 'fentanyl', 'oxycodone'],
  benzodiazepine: ['diazepam', 'lorazepam', 'alprazolam', 'clonazepam', 'midazolam'],
}

const CLASS_LABELS: Record<string, string> = {
  penicillin: 'penicillin', cephalosporin: 'cephalosporin', sulfonamide: 'sulfa',
  nsaid: 'NSAID', macrolide: 'macrolide', quinolone: 'fluoroquinolone', statin: 'statin',
  ace_inhibitor: 'ACE inhibitor', opioid: 'opioid', benzodiazepine: 'benzodiazepine',
}

// Allergy words that name a whole class (so "penicillin allergy" flags amoxicillin).
const CLASS_ALIASES: Record<string, string> = {
  penicillin: 'penicillin', penicillins: 'penicillin',
  cephalosporin: 'cephalosporin', cephalosporins: 'cephalosporin', cephalexin: 'cephalosporin',
  sulfa: 'sulfonamide', sulfonamide: 'sulfonamide', sulfonamides: 'sulfonamide',
  nsaid: 'nsaid', nsaids: 'nsaid', aspirin: 'nsaid',
  macrolide: 'macrolide', macrolides: 'macrolide',
}

const norm = (s: string) => s.toLowerCase().trim()

/** The drug class for a name, or null if unknown. */
export function drugClass(name: string): string | null {
  const n = norm(name)
  for (const [cls, kws] of Object.entries(DRUG_CLASSES)) {
    if (kws.some((k) => n.includes(k))) return cls
  }
  return null
}

const classLabel = (cls: string) => CLASS_LABELS[cls] ?? cls

/** Split a free-text allergy field into individual terms. */
function allergyTerms(text: string): string[] {
  return text.split(/[,;/]|\band\b|\+/i).map(norm).filter((t) => t.length > 2)
}

/**
 * Warnings for prescribing `drugName` to a patient with the given allergies + active meds.
 * Non-blocking — the doctor exercises clinical judgment, but the conflict is surfaced.
 */
export function checkDrug(drugName: string, allergiesText: string | null | undefined, activeMeds: string[]): RxWarning[] {
  const out: RxWarning[] = []
  const n = norm(drugName)
  if (!n) return out

  const cls = drugClass(n)

  // ── Allergy conflicts ──
  const terms = allergiesText ? allergyTerms(allergiesText) : []
  const allergicClasses = new Set<string>()
  for (const t of terms) {
    if (CLASS_ALIASES[t]) allergicClasses.add(CLASS_ALIASES[t])
    const tc = drugClass(t)
    if (tc) allergicClasses.add(tc)
  }
  let directAllergy = false
  for (const t of terms) {
    if (n.includes(t) || t.includes(n)) {
      out.push({ level: 'allergy', drug: drugName, message: `Patient is allergic to "${t}".` })
      directAllergy = true
    }
  }
  if (!directAllergy && cls && allergicClasses.has(cls)) {
    out.push({ level: 'allergy', drug: drugName, message: `Cross-reactivity — patient's allergy covers the ${classLabel(cls)} class.` })
  }

  // ── Duplicate / same-class therapy vs active meds ──
  for (const m of activeMeds) {
    const mn = norm(m)
    if (!mn) continue
    if (n.includes(mn) || mn.includes(n)) {
      out.push({ level: 'duplicate', drug: drugName, message: `Already taking "${m}" (active) — duplicate prescription.` })
      continue
    }
    const mc = drugClass(mn)
    if (cls && mc && cls === mc) {
      out.push({ level: 'interaction', drug: drugName, message: `Same class as active "${m}" (${classLabel(cls)}) — duplicate therapy.` })
    }
  }

  return out
}
