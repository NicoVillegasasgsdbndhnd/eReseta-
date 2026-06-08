# Medicine catalog seed data

**`PNF-EML-8th-2022.pdf`** — the official **Philippine National Formulary (PNF) 8th Edition,
Essential Medicines List** (as of November 2, 2022), published by the DOH and re-issued via
PhilHealth advisory `PA2024-0026`. Source:
`https://www.philhealth.gov.ph/partners/providers/pdf/PNF-EML_11022022.pdf`.

It contains ~650 **generic** medicines, A–Z, each with its **dosage form, strength, and route**
(tablet / syrup / injection / etc.). It lists **generic names only** — no brand names (e.g.
"Paracetamol", not "Biogesic"), which is the legally correct basis for prescribing in the
Philippines (Generics Act, RA 6675).

## What to do with it (medicine combobox feature)

1. Extract the PDF to a clean CSV named **`medicines.csv`** in this folder, with columns:
   `generic_name, dosage_form, strength, route`.
   - `pdftotext PNF-EML-8th-2022.pdf out.txt` parses it cleanly, but the two-column table layout
     interleaves "Active Ingredient" and "Forms/Strengths" — budget a little cleanup, or use a
     PDF-table extractor.
2. Point `database/seeders/MedicineSeeder.php` at `medicines.csv` and bulk-insert (chunked).

See the full development plan in `HANDOFF.md` → "Development plan — Medicine catalog + generic-name
combobox".
