#!/usr/bin/env python3
"""
Extract the PNF EML PDF -> medicines.csv (generic_name, dosage_form, strength, route).

This is the provenance tool for `medicines.csv`, which `MedicineSeeder` reads. Re-run it if the
PNF PDF is updated:  pip install pdfplumber  &&  python extract_medicines.py

Layout handled: the PDF is a two-column table — left column (x0<150, bold font) = the generic
"Active Ingredient"; right column (x0>=150) = "Route of Administration / Pharmaceutical Forms and
Strengths". Rows are clustered by y with a small tolerance (a name and its first form line can be
offset ~2px). A new entry starts on a bold-name row whose right column begins with a "Label:"
(route OR dosage form, e.g. Oral:, Inj.:, Cream or Ointment:, Eye Drops Suspension:) or is a
"(see X)" cross-reference; other rows continue the current entry's wrapped name and/or forms.
A few PDF merge artifacts (where an entry's form sits >1 line below its wrapped name) are corrected
explicitly at the end.
"""
import pdfplumber, csv, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HERE, "PNF-EML-8th-2022.pdf")
OUT = os.path.join(HERE, "medicines.csv")
X_SPLIT, FIRST_PAGE, Y_TOL = 150, 15, 7

LABEL_RE = re.compile(r"^[A-Za-z][A-Za-z .,/&'\-]{0,28}:")
ROUTE_WORDS = {
    "oral", "inj", "injection", "inhalation", "topical", "rectal", "ophthalmic", "otic", "nasal",
    "sublingual", "vaginal", "parenteral", "transdermal", "buccal", "subcutaneous", "intramuscular",
    "intravenous", "intrathecal", "intratracheal", "resp", "dental", "irrigation", "local",
    "implant", "epidural",
}
FORM_WORDS = [
    "effervescent tablet", "chewable tablet", "orally disintegrating tablet", "mr tablet",
    "film coated tablet", "tablet", "capsule", "caplet", "syrup", "suspension", "solution",
    "injection", "eye drops", "ear drops", "drops", "cream", "ointment", "gel", "lotion",
    "suppository", "pessary", "powder", "granules", "sachet", "ampul", "ampoule", "vial",
    "inhaler", "nebule", "spray", "patch", "lozenge", "emulsion", "paste", "metered dose inhaler",
]
STRENGTH_RE = re.compile(
    r"\d+(?:\.\d+)?\s?(?:mg|mcg|microgram(?:/?s)?|g|mL|L|%|IU|units?|mmol|MU)\b"
    r"(?:\s?/\s?\d*\.?\d*\s?(?:mg|mL|L)?)?",
    re.I,
)

def rows_of(page):
    words = sorted(page.extract_words(), key=lambda w: (w["top"], w["x0"]))
    clusters, cur, anchor = [], [], None
    for w in words:
        if anchor is None or w["top"] - anchor <= Y_TOL:
            cur.append(w); anchor = w["top"] if anchor is None else anchor
        else:
            clusters.append(cur); cur = [w]; anchor = w["top"]
    if cur:
        clusters.append(cur)
    out = []
    for cl in clusters:
        cl.sort(key=lambda w: w["x0"])
        left = " ".join(w["text"] for w in cl if w["x0"] < X_SPLIT).strip()
        right = " ".join(w["text"] for w in cl if w["x0"] >= X_SPLIT).strip()
        out.append((left, right))
    return out

def first_token(s):
    return s.split()[0].rstrip(":.").lower() if s.split() else ""

def is_skip(left, right):
    if not left and re.fullmatch(r"\d+", right):
        return True
    if not left and re.fullmatch(r"[A-Z]", right):
        return True
    if left.startswith("Active Ingredient"):
        return True
    if right.startswith("Route of Administration") or right.startswith("Pharmaceutical Forms"):
        return True
    return False

def clean_name(name):
    name = name.replace("⊗", "").replace("⊛", "").replace("●", "")
    name = re.sub(r"\*\s*Reserve\b.*$", "", name, flags=re.I)
    name = re.sub(r"\s*\((?:A1|A2|B|C)\)", "", name)
    name = re.sub(r"\s*\((?:\d+(?:\s*,\s*\d+)*(?:,\s*[A-C]\d?)?)\)", "", name)
    name = re.sub(r"\s*\(see[^)]*\)", "", name, flags=re.I)
    return re.sub(r"\s+", " ", name).strip(" ,(*")

def main():
    pdf = pdfplumber.open(PDF)
    entries, cur, done = [], None, False
    for pi in range(FIRST_PAGE - 1, len(pdf.pages)):
        if done:
            break
        for left, right in rows_of(pdf.pages[pi]):
            if "FREQUENTLY" in left or "FREQUENTLY" in right:
                done = True
                break
            if (not left and not right) or is_skip(left, right):
                continue
            if left and (LABEL_RE.match(right) is not None or "(see" in left.lower()):
                cur = {"name": left, "forms": ([right] if right else [])}
                entries.append(cur)
            elif cur is not None:
                if left:
                    cur["name"] += " " + left
                if right:
                    cur["forms"].append(right)

    rows, seen = [], set()
    for e in entries:
        name = clean_name(e["name"])
        if len(name) < 2:
            continue
        forms_text = " ".join(e["forms"])
        low = forms_text.lower()
        routes = []
        for ln in e["forms"]:
            if first_token(ln) in ROUTE_WORDS:
                lab = ln.split()[0].rstrip(":")
                if lab not in routes:
                    routes.append(lab)
        forms_found = []
        for f in FORM_WORDS:
            if f in low and not any(f in g for g in forms_found):
                forms_found.append(f)
        strengths = []
        for m in STRENGTH_RE.finditer(forms_text):
            s = re.sub(r"\s+", " ", m.group()).strip()
            if s not in strengths:
                strengths.append(s)
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        rows.append({
            "generic_name": name,
            "dosage_form": ", ".join(forms_found)[:255],
            "strength": ", ".join(strengths[:8])[:255],
            "route": ", ".join(routes)[:120],
        })

    # Corrections for the few PDF merge artifacts (Co-Amoxiclav & Cotrimoxazole already exist).
    DROP = {"clavulanate", "trimethoprim"}
    fixed = []
    for r in rows:
        n = r["generic_name"]
        if n.lower() in DROP:
            continue
        if n.startswith("Amoxicillin (as trihydrate) Amoxicillin"):
            r["generic_name"] = "Amoxicillin (as trihydrate)"
        elif n.startswith("Sulfacetamide + Prednisolone Sulfamethoxazole"):
            r["generic_name"] = "Sulfacetamide + Prednisolone"
        elif n.startswith("Pneumococcal Conjugate Vaccine (PCV)"):
            r["generic_name"] = "Pneumococcal Conjugate Vaccine (PCV)"
        elif n.startswith("Isosorbide-5-Mononitrate Isotonic"):
            r["generic_name"] = "Isosorbide-5-Mononitrate"
            fixed.append({"generic_name": "Isotonic Electrolyte Solution for IV Infusion", "dosage_form": "solution", "strength": "", "route": "Inj."})
        elif n.startswith("Hypertonic lactate 3% Hypertonic Saline"):
            r["generic_name"] = "Hypertonic Lactate 3%"
            fixed.append({"generic_name": "Hypertonic Saline Solution", "dosage_form": "solution", "strength": "", "route": "Inj."})
        elif n.startswith("Vitamin Intravenous, Fat-Soluble Vitamin Intravenous"):
            r["generic_name"] = "Vitamin Intravenous, Fat-Soluble"
            fixed.append({"generic_name": "Vitamin Intravenous, Water-Soluble", "dosage_form": "", "strength": "", "route": "Inj."})
        fixed.append(r)

    seen2, rows = set(), []
    for r in fixed:
        k = r["generic_name"].lower()
        if k not in seen2:
            seen2.add(k)
            rows.append(r)

    rows.sort(key=lambda r: r["generic_name"].lower())
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["generic_name", "dosage_form", "strength", "route"])
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} medicines to {OUT}")

if __name__ == "__main__":
    main()
