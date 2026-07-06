


export interface RxWarning {
  level: 'allergy' | 'duplicate' | 'interaction'
  drug: string
  message: string
}


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


const CLASS_ALIASES: Record<string, string> = {
  penicillin: 'penicillin', penicillins: 'penicillin',
  cephalosporin: 'cephalosporin', cephalosporins: 'cephalosporin', cephalexin: 'cephalosporin',
  sulfa: 'sulfonamide', sulfonamide: 'sulfonamide', sulfonamides: 'sulfonamide',
  nsaid: 'nsaid', nsaids: 'nsaid', aspirin: 'nsaid',
  macrolide: 'macrolide', macrolides: 'macrolide',
}

const norm = (s: string) => s.toLowerCase().trim()


export function drugClass(name: string): string | null {
  const n = norm(name)
  for (const [cls, kws] of Object.entries(DRUG_CLASSES)) {
    if (kws.some((k) => n.includes(k))) return cls
  }
  return null
}

const classLabel = (cls: string) => CLASS_LABELS[cls] ?? cls


function allergyTerms(text: string): string[] {
  return text.split(/[,;/]|\band\b|\+/i).map(norm).filter((t) => t.length > 2)
}





export function checkDrug(drugName: string, allergiesText: string | null | undefined, activeMeds: string[]): RxWarning[] {
  const out: RxWarning[] = []
  const n = norm(drugName)
  if (!n) return out

  const cls = drugClass(n)


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
