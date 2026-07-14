# eReseta+ — Blockchain Tamper-Evidence Test (step by step)

Answers the panel's **"can someone modify the data on the backend and get away with it?"**
Proof goal: **once anchored, a prescription cannot be changed in MySQL without the ledger exposing it.**

Runs on **your machine** (WSL2 + Docker); the network is per-machine, not on the prod server.

---

## The mental model (read once)

Three parts, and they matter for *why* the test proves anything:

| Part | Runs where | Role in this test |
|------|-----------|-------------------|
| **MySQL** (Laragon) | Windows | The "backend" the attacker edits. Source of truth for the app. |
| **Fabric ledger** (peer, in Docker) | WSL2 | The independent witness. `_prove.sh` reads it directly. |
| **`_prove.sh`** | WSL2 | Asks the **peer** for the ledger state — bypasses the app *and* MySQL. |

The whole argument: you edit MySQL, then ask the **ledger** (which never went through MySQL). They
disagree → the edit is provable. **Reading the ledger needs only the network** — not the gateway,
not Laravel, not the queue worker. Those are only needed to *write* a new prescription.

---

## Prerequisites (start these first)

1. **Docker Desktop** — launch it (Windows). Wait until it says *Engine running*.
2. **Laragon** — Start All (you need **MySQL** up for the tamper step).
3. That's it for the tamper demo. (Gateway + queue worker only if you must issue a fresh Rx — see §B.)

---

## Step 1 — Start the Fabric network

Open a WSL terminal (`wsl -d Ubuntu-24.04`), then:

```bash
cd /mnt/c/laragon/www/eReseta-/blockchain/network
bash deamhi.sh start          # 'start' REUSES the ledger. NEVER 'up' — up wipes it.
```

✅ Expect: `==> network started.` and a channel line (`ereseta-channel`).
❌ `FATAL: no existing network` → the network was never built here; do §C instead.
❌ `compose up failed` / docker errors → Docker Desktop isn't ready, or WSL integration is off
   (Docker Desktop → Settings → Resources → WSL Integration → enable Ubuntu-24.04).

Sanity check the peer is answering:

```bash
cd /mnt/c/laragon/www/eReseta-/blockchain
bash _prove.sh NONEXISTENT-REF     # should run and say the ref is "not found" — that's fine,
                                   # it proves the peer is reachable
```

---

## Step 2 — Find a prescription that is actually on the ledger

Only prescriptions with a `blockchain_tx_id` were anchored. In a Windows terminal (or HeidiSQL):

```sql
SELECT id, reference_no, blockchain_tx_id
FROM prescriptions
WHERE blockchain_tx_id IS NOT NULL
ORDER BY id DESC
LIMIT 5;
```

- **Got rows?** → pick one. Note its `reference_no` (e.g. `RX-2026-0004`) and `id`. Go to **Step 3**.
- **Empty?** → nothing is anchored yet; you must issue one live → **§B** (needs Nico's gateway),
  then come back to Step 3.

---

## Step 3 — PROOF, BEFORE the tamper

```bash
cd /mnt/c/laragon/www/eReseta-/blockchain
bash _prove.sh RX-2026-0004        # ← your real reference
```

Screenshot this. You get three proofs in one output:
- **Proof 1** — current ledger state (the drug list as issued).
- **Proof 2** — full immutable history (issue → verify → dispense, each with a tx id).
- **Proof 3** — block height.

Now show MySQL **agrees** right now:

```sql
SELECT pi.drug_name, pi.dosage, pi.quantity
FROM prescription_items pi
WHERE pi.prescription_id = <id>;
```

Ledger drug list == MySQL drug list. **This is the baseline: they match.**

---

## Step 4 — Simulate the backend attacker (edit MySQL directly)

This is the DBA/attacker with database access changing a drug behind the app's back:

```sql
UPDATE prescription_items SET drug_name = 'Fentanyl' WHERE prescription_id = <id>;

SELECT drug_name FROM prescription_items WHERE prescription_id = <id>;   -- now 'Fentanyl'
```

MySQL is now lying. The app would happily display "Fentanyl".

---

## Step 5 — PROOF, AFTER the tamper (the money shot)

Ask the **ledger** again — it never went through MySQL:

```bash
bash _prove.sh RX-2026-0004
```

Screenshot this too. **Proof 1 still shows the ORIGINAL drug.** The ledger did not change.

> **MySQL says Fentanyl. The ledger says the original. MySQL ≠ ledger → tampering detected.**

That discrepancy is the repercussion the panel asked for: a silent backend edit becomes provable.

---

## Step 6 — (optional) undo the tamper

```sql
UPDATE prescription_items SET drug_name = '<original drug>' WHERE prescription_id = <id>;
```

---

## What each proof argues (say this to the panel)

| Proof | Command | What it proves |
|-------|---------|----------------|
| **Detection** | `_prove.sh` before vs after the MySQL edit | A backend change produces a **provable MySQL↔ledger discrepancy**. |
| **Immutability** | Proof 2 (`GetPrescriptionHistory`) | Every state is **appended**; the chaincode has **no delete/overwrite** function. History is permanent. |
| **Hash chain** | Proof 3 (`peer channel getinfo`) | Each block embeds the previous block's hash; altering a block breaks the chain and the peer rejects it. |

## Be honest about the limitation (this earns credit)

> "Our network is **single-org** (one peer, one orderer) for academic scope, so it is
> tamper-**evident**, not tamper-**proof** — one administrator of that node could theoretically
> rebuild the ledger. The security value is real: it raises the bar from a silent one-line SQL
> `UPDATE` to forging an entire hash-chained, MSP-signed ledger, and the reconciliation in Step 5
> detects any backend edit. Multi-org with independent endorsers is documented future work."

Also honest: the reconciliation here is **manual** (you eyeball ledger vs MySQL). An automated
"verify-against-ledger" monitor that flags mismatches in the admin UI is future work.

## Tools (for your Table 8 write-up)

Fabric **peer CLI** / `_prove.sh` (independent ledger read) · **MySQL client** (simulates the backend
attacker) · **manual reconciliation**. This is a **custom integrity / tamper-evidence test**, not an
automated scanner — sqlmap/Burp target the web app, not the ledger.

---

## §B — Issue a fresh prescription (only if Step 2 was empty) — needs the gateway

The gateway needs env vars only Nico has configured, so **do this with Nico** or on his machine.

1. Network up (Step 1).
2. Start the gateway in WSL (Nico's env): `cd blockchain/gateway && npm start` (listens on :3001).
   Verify: `curl -s localhost:3001/health` (or the gateway's health route).
3. Start the queue worker (Windows, in `api/`): `php artisan queue:work database`
   — this is what runs the `RecordPrescriptionOnLedger` job that writes to the chain.
4. In the app: log in as a **doctor**, create + **issue** a prescription. Note its `reference_no`.
5. Wait a few seconds, then confirm it anchored:
   `SELECT reference_no, blockchain_tx_id FROM prescriptions WHERE reference_no = 'RX-…';`
   `blockchain_tx_id` should now be populated. Return to **Step 3**.

## §C — Network was never built here

`bash deamhi.sh up` **regenerates crypto and creates a fresh ledger** (empty). Only do this if you
have no existing network — it wipes any prior ledger. Then `deployCC`, then §B to add a prescription.

---

## When done

```bash
cd /mnt/c/laragon/www/eReseta-/blockchain/network
bash deamhi.sh stop           # stops containers, KEEPS the ledger (so 'start' works next time)
```
