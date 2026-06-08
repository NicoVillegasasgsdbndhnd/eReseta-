# eReseta+ — Hyperledger Fabric: Complete Implementation Documentation

> **Audience:** the eReseta+ team + capstone panel. This documents the blockchain layer of
> eReseta+ exactly as it exists in this repository, not an idealized version. Where the actual
> implementation differs from the development plan, that is called out explicitly (see §17).
>
> **Companion docs:** `Retain_Memory.md` (whole-project knowledge), `HANDOFF.md` (current state),
> `eReseta_Development_Plan.md` (plan of record), `api/SECURITY.md` (security controls).
>
> **A note on honesty:** several things a generic Fabric tutorial assumes — a Certificate Authority
> container, a CouchDB container, multi-organization channels — **we deliberately do not run.** This
> doc explains what we *do* run and why, and is candid about the simplifications. That candor is an
> asset in a defense, not a weakness.

---

## Table of Contents

1. [What is Hyperledger](#1-what-is-hyperledger)
2. [Hyperledger Family — All Types](#2-hyperledger-family--all-types)
3. [Which Hyperledger We Used and Why](#3-which-hyperledger-we-used-and-why)
4. [Full Structural View of Hyperledger](#4-full-structural-view-of-hyperledger)
5. [Why We Use Docker for Hyperledger](#5-why-we-use-docker-for-hyperledger)
6. [How Hyperledger Works Inside Docker](#6-how-hyperledger-works-inside-docker)
7. [Complete System Architecture](#7-complete-system-architecture)
8. [Data Flow — Step by Step](#8-data-flow--step-by-step)
9. [Integration — How Hyperledger Connects to Laravel](#9-integration--how-hyperledger-connects-to-laravel)
10. [Chaincode — Smart Contracts](#10-chaincode--smart-contracts)
11. [Setup and Installation — Full Steps](#11-setup-and-installation--full-steps)
12. [Security and Privacy Implementation](#12-security-and-privacy-implementation)
13. [Current Implementation Status](#13-current-implementation-status)
14. [Troubleshooting Guide](#14-troubleshooting-guide)
15. [Complete Command Reference](#15-complete-command-reference)
16. [References & Versions](#16-references--versions)
17. [Plan vs. Actual — Inconsistencies](#17-plan-vs-actual--inconsistencies)
18. [Security Gaps & Vulnerabilities](#18-security-gaps--vulnerabilities)
19. [Non-Technical Explanation (for the panel)](#19-non-technical-explanation-for-the-panel)
20. [Capstone Panel Q&A](#20-capstone-panel-qa)
21. [Critical Takeaways & Recommendations](#21-critical-takeaways--recommendations)

---

## 1. WHAT IS HYPERLEDGER

**Hyperledger is not a single product — it is an umbrella project: a family of open-source
blockchain software hosted by the Linux Foundation.**

- **Who created it, when, why.** It was launched in **December 2015** by the **Linux Foundation**
  (the nonprofit that also stewards Linux, Kubernetes, etc.), with founding contributions from IBM,
  Intel, Digital Asset, and others. The motivation: businesses wanted blockchain's *tamper-evidence
  and shared-ledger* benefits **without** the things that make Bitcoin/Ethereum unsuitable for
  enterprise — public visibility, anonymous participants, cryptocurrency, and slow/expensive
  consensus. (In 2024 the umbrella was rebranded **LF Decentralized Trust**, but the projects are
  still universally called "Hyperledger X".)
- **The Linux Foundation's role.** It provides neutral governance, legal/IP framework, and
  open-source community process. No single company owns Hyperledger; it is vendor-neutral.

**Analogy:** Hyperledger is like the **"Linux Foundation's toolbox of blockchains."** Just as a
hardware store stocks many kinds of drills for different jobs, Hyperledger stocks several blockchain
frameworks, each tuned for a different need. "Hyperledger" is the store; "Fabric" is one specific
drill.

### How it differs from public blockchains (Bitcoin / Ethereum)

| Property | Bitcoin / Ethereum (public) | Hyperledger Fabric (permissioned) |
|----------|-----------------------------|-----------------------------------|
| **Who can join** | Anyone, anonymously | Only **invited, identified** members (certificates) |
| **Who can read data** | The whole world | Only authorized members of the channel |
| **Cryptocurrency / gas fees** | Required | **None** |
| **Consensus** | Proof-of-Work / Proof-of-Stake (slow, energy-heavy) | Pluggable ordering (we use **Raft**) — fast, no mining |
| **Identity** | Pseudonymous wallet addresses | Real X.509 certificates tied to an organization |
| **Smart contract language** | Solidity (Ethereum) | General-purpose: **Go**, Java, Node.js |
| **Throughput** | Low (≈7–30 tx/s) | High (thousands of tx/s) |

**Analogy:** A public blockchain is a **town square noticeboard** — anyone can walk up, post, and
read; nobody knows who anyone is. Hyperledger Fabric is a **members-only boardroom ledger** — only
people with a badge get in, everyone is known by name, and the minutes are tamper-proof.

### Why it is built for enterprises and healthcare

A hospital cannot put patient data on a public chain (privacy law forbids it), cannot pay "gas" per
prescription, and must know exactly *who* did *what*. Hyperledger Fabric gives:
- **Privacy** — data stays inside a private network of known members.
- **Identity & accountability** — every action is signed by a certificate.
- **No token economics** — no coins, no fees.
- **Tamper-evidence** — the audit trail cannot be silently rewritten.

That is precisely the profile of a healthcare records / e-prescription system.

### Key principles: permissioned, private, modular

- **Permissioned** — you need an issued identity to participate (vs. "permissionless" public chains).
- **Private** — data is shared only among channel members, not the public.
- **Modular** — components (consensus, identity, database, smart-contract language) are pluggable;
  you assemble the blockchain that fits your use case.

---

## 2. HYPERLEDGER FAMILY — ALL TYPES

The Hyperledger umbrella contains **frameworks** (actual blockchains) and **tools** (utilities that
support blockchains). eReseta+ uses exactly one framework — **Fabric** — and none of the tools.

> Status note: Hyperledger projects move through lifecycle stages; **Sawtooth, Iroha, and Burrow have
> been moved to "end-of-life / Labs"** as of recent years. They are listed here for completeness
> because the assignment asks for the full family.

### Frameworks (blockchains)

| Framework | What it is best for | Key strengths | Real-world use | Use in eReseta? |
|-----------|--------------------|---------------|----------------|------------------|
| **Hyperledger Fabric** | Permissioned enterprise blockchains with private data and pluggable consensus | Channels (data isolation), Go/Java/Node chaincode, no crypto-currency, modular, mature | Supply chain (IBM Food Trust), trade finance, healthcare records | ✅ **CHOSEN** — see §3 |
| **Hyperledger Besu** | An **Ethereum** client; can run on public Ethereum *or* private permissioned networks | Ethereum/EVM compatible, Solidity smart contracts, supports public & private | Enterprises wanting Ethereum tooling privately | ❌ EVM/Solidity + Ethereum semantics are overkill; we don't need public-chain compatibility |
| **Hyperledger Indy** | **Self-sovereign digital identity** (decentralized IDs, verifiable credentials) | Purpose-built for identity & credentials, privacy via zero-knowledge proofs | Digital ID wallets, verifiable diplomas/licenses | ❌ It's an identity system, not a general ledger for prescription events |
| **Hyperledger Iroha** | Simple, mobile-friendly permissioned ledger | Easy to use, built-in commands, C++/mobile SDKs | Asset management, identity in Asia (e.g. national projects) | ❌ Less feature-rich than Fabric (no flexible chaincode model we needed); now EOL |
| **Hyperledger Sawtooth** | Modular ledger with novel consensus (PoET) | Parallel transaction execution, pluggable consensus | Seafood traceability, supply chain | ❌ Now EOL; Fabric is the better-supported choice |
| **Hyperledger Burrow** | EVM smart-contract execution engine (permissioned) | Runs Ethereum contracts in a permissioned setting | Niche EVM-in-permissioned use | ❌ Now EOL; not needed |

### Tools (support utilities, not blockchains themselves)

| Tool | What it does | Use in eReseta? |
|------|--------------|------------------|
| **Hyperledger Caliper** | **Benchmarking** — measures blockchain performance (tx/s, latency) | ❌ Not used (could be used later to produce performance numbers for the thesis — see §21) |
| **Hyperledger Cello** | **Blockchain-as-a-Service** — provisions/manages networks on demand | ❌ Not used (we provision manually via our script) |
| **Hyperledger Aries** | Peer-to-peer interactions / credential exchange (works with Indy) | ❌ Identity-focused; not relevant |
| **Hyperledger Firefly** | Application/API layer "supernode" over blockchains | ❌ We wrote our own thin gateway instead |
| **Hyperledger AnonCreds / Ursa** | Cryptographic credential / crypto libraries | ❌ Not relevant |

**Analogy:** If the **frameworks** are different **car models** (Fabric = a fleet truck, Besu = an
Ethereum-engine car, Indy = an ID-card printer on wheels), the **tools** are the **garage equipment**
— Caliper is the dynamometer that measures horsepower, Cello is the valet that parks fleets. We
needed one truck (Fabric); we didn't use any garage equipment.

---

## 3. WHICH HYPERLEDGER WE USED AND WHY

**Framework chosen: Hyperledger Fabric, version 2.5.15.**

### Why Fabric over the other Hyperledger frameworks

1. **It is permissioned and private by design** — a hospital's prescription ledger must be closed to
   the public. Fabric's whole model is "known members only."
2. **Chaincode in a general language (Go)** — we model a `PrescriptionEvent` and lifecycle functions
   directly. Indy/Aries are identity-only; Besu/Burrow force the Ethereum/Solidity model we don't want.
3. **No cryptocurrency / gas** — every prescription write would cost money on Ethereum-style chains.
   Fabric has no token, so writes are free.
4. **Maturity & support** — Fabric is the most production-proven, best-documented Hyperledger
   framework. Sawtooth/Iroha/Burrow are now end-of-life; building on them would be a risk.
5. **Modular consensus** — we use a single-node **Raft** orderer, appropriate for a controlled
   single-institution network, with a clear path to multi-node later.

### Why it fits a Hospital Information System

- The clinical workflow (**issue → verify → dispense**) is a small set of **state transitions on one
  key** — a perfect fit for a chaincode keyed on the prescription reference number.
- The hospital is a **single trusted institution** → a single-organization permissioned network is
  the natural topology.
- The value we need is **traceability + tamper-evidence**, not decentralization among strangers.

### Why it fits the Philippine healthcare context & RA 10173 (Data Privacy Act)

- **Data minimization (RA 10173 principle).** We put **no patient PII on the ledger** — only internal
  numeric IDs (`patient_record_id`, `doctor_id`) and the drug list. A name or PhilHealth number never
  touches the chain. (Verifiable in `FabricGatewayService::issue()`.)
- **Private, not public.** Because Fabric is permissioned, prescription data never leaves the
  hospital's controlled network — consistent with the DPA's confidentiality obligations.
- **Auditability.** RA 10173 and ISO 27001 expect an audit trail of data handling; the immutable
  ledger is exactly that for the prescription lifecycle (complementing the MySQL `audit_logs`).
- **Generics-based prescribing context.** The clinical model aligns with the PH Generics Act
  (prescribe by generic name) — the chain records the drug list as issued.

**Analogy:** Choosing Fabric for a single hospital is like choosing a **private company intranet**
instead of the public internet to share confidential memos: everyone on it is a known employee, the
memos are signed and can't be secretly edited, and outsiders simply can't see in.

---

## 4. FULL STRUCTURAL VIEW OF HYPERLEDGER

### The components (and which ones we actually run)

| Component | What it is / does | In eReseta+ |
|-----------|-------------------|-------------|
| **Peer** | A node that **stores the ledger** and **runs chaincode**. Endorses (simulates+signs) and commits transactions. | **1 peer** — `peer0.deamhi.example.com` (container, port 7051) |
| **Orderer** | Orders transactions into **blocks** and distributes them to peers. The network's "sequencer/clock". | **1 orderer** — `orderer.example.com` (container, port 7050), consensus = **etcdraft (Raft)** |
| **Certificate Authority (CA)** | Issues identities/certificates dynamically | **NOT run as a service.** We use **`cryptogen`** to generate all certificates **once, statically**, up front. There is **no `fabric-ca` container.** (See note below.) |
| **Channel** | A private "sub-ledger" shared by a set of members; isolates data | **1 channel** — `ereseta-channel` |
| **Chaincode** | The **smart contract** — the only code allowed to read/write the ledger | Go contract `prescription` (v1.0), runs in its **own auto-built Docker container** |
| **Ledger** | Two parts: **world state** (current values, key→value DB) + **blockchain** (immutable block history) | World state = **LevelDB** (embedded in the peer — **no CouchDB container**); blockchain = block files on the peer's volume |
| **MSP (Membership Service Provider)** | The rules + certificates that decide "who is a valid member and what role they have" | **`DEAMHIMSP`** (the hospital org) + `OrdererMSP` |
| **Organization (Org)** | A group of members under one MSP | **One org: DEAMHI** (`deamhi.example.com`) + the orderer org |
| **Gateway / Client SDK** | The library/service an app uses to submit transactions | Node.js gateway using `@hyperledger/fabric-gateway` SDK (port 3001) |

> **Important honesty note on the CA.** Production Fabric typically runs a **Fabric CA server** that
> issues certificates on demand. We instead use **`cryptogen`**, a dev/test tool that pre-generates a
> fixed set of certificates. This is simpler and fine for a single-institution capstone network, but
> it means: identities are static, there is no on-the-fly enrollment/revocation, and the "CA" exists
> only as the **root certificates inside the MSP folders**, not as a running service. This is a
> deliberate scope simplification (see §17, §18).

### Membership & policies (from `configtx.yaml`)

- Org **DEAMHIMSP** has Readers/Writers/Admins policies and an **Endorsement** policy
  `OR('DEAMHIMSP.peer')` — i.e., the DEAMHI peer's endorsement is sufficient (natural for a 1-peer,
  1-org network).
- `EnableNodeOUs: true` — certificates carry organizational roles (admin/peer/client).

### How the components talk (and an ASCII diagram)

```
                         ┌─────────────────────────────────────────────┐
                         │            ereseta-channel (1 channel)        │
                         └─────────────────────────────────────────────┘
                                          ▲            ▲
            (1) submit signed proposal     │            │ (3) deliver ordered blocks
                                            │            │
   ┌───────────────┐   gRPC + TLS   ┌───────┴──────┐   ┌─┴───────────────┐
   │  Gateway      │───────────────▶│   PEER       │   │   ORDERER       │
   │ (Node SDK)    │◀───────────────│ peer0.deamhi │──▶│ orderer.example │
   │ identity =    │  (2) endorsed  │  :7051       │   │  :7050 (Raft)   │
   │ DEAMHIMSP     │     response    │              │   │                 │
   │ Admin cert    │                │  runs        │   │ batches txs     │
   └───────────────┘                │  chaincode ──┼─▶ │ into BLOCKS     │
            ▲                       │  (own Docker │   └─────────────────┘
            │ REST (HTTP :3001)     │   container) │
            │                       │              │
   ┌────────┴────────┐              │  LEDGER:     │
   │  Laravel API    │              │  • world state (LevelDB) ── current value per key
   │  (queued job)   │              │  • blockchain (blocks)  ── immutable history
   └─────────────────┘              └──────────────┘

   MSP / certificates (generated by cryptogen) sign & verify EVERY arrow above.
```

**Flow in words:** the Gateway sends a **signed proposal** to the Peer → the Peer **simulates** the
chaincode and returns an **endorsed** result → the Gateway **submits** it to the Orderer → the
Orderer packs it into a **block** and delivers it back to the Peer → the Peer **validates and
commits** it, updating both the **world state** and the **blockchain**.

**Analogy:** Think of a **notarized group decision**:
- **Peer** = the office that drafts the document and a notary who says "I checked this, it's valid"
  (endorsement).
- **Orderer** = the clerk who decides the official order of documents and binds them into a sealed
  logbook (blocks), page after page.
- **MSP/CA** = the ID office that issued everyone's signature stamps; without a valid stamp, nothing
  is accepted.
- **Channel** = the specific logbook this group writes in (others can't read it).
- **Ledger** = the logbook itself: the *last page* is the world state (current truth), the *whole
  bound book* is the blockchain (full history).

---

## 5. WHY WE USE DOCKER FOR HYPERLEDGER

### What Docker is, simply

**Docker packages a program together with everything it needs to run — into a sealed, portable box
called a container.** An **image** is the blueprint; a **container** is a running instance of that
blueprint. Containers are lightweight (they share the host OS kernel) so several run side-by-side
fast.

**Analogy:** a **shipping container** — a standard steel box that holds cargo plus its packing, and
runs identically on any ship, crane, or truck. Docker is that, for software.

### Why Hyperledger specifically requires Docker

Two reasons — the second is the decisive one:

1. **Fabric is a cluster of separate programs.** Orderer and peer are distributed by Hyperledger
   **as Docker images** (`hyperledger/fabric-orderer`, `hyperledger/fabric-peer`). Docker is the
   standard way to run and wire them.
2. **Fabric runs your chaincode *inside* Docker, automatically.** When chaincode is deployed, the
   peer **builds your Go contract into its own container and launches it**. This is configured in our
   peer via `CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock` — the peer is given access to the
   host's Docker engine so it can spawn that chaincode container. **Without Docker, the peer
   literally cannot run chaincode.**

### Which container runs what in our system

> Our **actual Fabric network** is defined in `blockchain/network/compose-deamhi.yaml`.

| Container | Image | Purpose |
|-----------|-------|---------|
| `orderer.example.com` | `hyperledger/fabric-orderer:2.5.15` | The Raft orderer — sequences transactions into blocks |
| `peer0.deamhi.example.com` | `hyperledger/fabric-peer:2.5.15` | The DEAMHI peer — holds the ledger, runs/commits chaincode |
| `dev-peer0.deamhi.example.com-prescription_1.0-…` | auto-built by the peer (from `fabric-ccenv`/`fabric-baseos`) | The **chaincode container** — runs our `prescription` Go contract. Created automatically on deploy; you don't define it. |

**What we do NOT run (be clear with the panel):**
- **No CA container** — identities come from `cryptogen` (static), not a running `fabric-ca`.
- **No CouchDB container** — the world state uses **LevelDB embedded in the peer**. (CouchDB would
  only be needed for rich JSON queries, which we don't use.)

### Why running Hyperledger without Docker would be impractical

You would have to manually install and configure the orderer and peer binaries, hand-wire their TLS
and networking, and — critically — **reimplement how the peer builds and isolates chaincode**, which
is fundamentally Docker-based. It would be fragile, machine-specific, and would differ between Nico's
and Mark's laptops. Docker makes the network reproducible.

### Benefits Docker gives our setup

- **Isolation** — orderer, peer, and each chaincode run in separate sandboxes; a crash in one doesn't
  take down the others.
- **Portability** — the same images run identically on any machine with Docker (Nico ≈ Mark ≈ a server).
- **Easy network management** — `docker compose up/down` starts/stops the whole network at once.
- **Consistent environment** — pinned image versions (`2.5.15`) mean no "works on my machine".

---

## 6. HOW HYPERLEDGER WORKS INSIDE DOCKER

### Step-by-step: what happens when we start the network

Driven by `blockchain/network/deamhi.sh` (run inside WSL2):

1. **`cryptogen`** reads `crypto-config.yaml` and generates all certificates/keys (the MSP material)
   into `~/ereseta-fabric/organizations`.
2. **`configtxgen`** reads `configtx.yaml` and produces the **channel genesis block** (block 0) for
   `ereseta-channel`.
3. **`docker compose -f compose-deamhi.yaml up -d`** starts the **orderer** and **peer** containers,
   attached to a Docker network named `fabric_deamhi`.
4. **`osnadmin channel join`** — the orderer joins `ereseta-channel` using the genesis block.
5. **`peer channel join`** — the peer joins the channel.
6. **`deployCC`** vendors the Go chaincode, then runs the Fabric **lifecycle**
   (`package → install → approveformyorg → commit`). On commit, **the peer builds the chaincode into
   its own Docker container** and starts it.

### How containers communicate

- All containers sit on a **user-defined Docker bridge network** named **`fabric_deamhi`** (defined
  in `compose-deamhi.yaml` under `networks:`). On that network, containers reach each other by
  **container name as hostname** (e.g. the peer dials `orderer.example.com:7050`).
- The chaincode container is launched onto the **same network**
  (`CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_deamhi`) so the peer can talk to it.
- The host (your WSL/Windows side: the gateway and `peer` CLI) reaches the nodes via **published
  ports on `localhost`** (the certificates include `localhost` as a SAN so TLS works — see
  `crypto-config.yaml`).
- All node-to-node and client-to-node traffic is **gRPC over TLS**.

### Docker volumes — why they matter for ledger data

Containers are ephemeral: delete one and its internal files vanish. The **ledger must survive
restarts**, so the compose file defines **named volumes**:

- `orderer.example.com:` → mounted at `/var/hyperledger/production/orderer` (the orderer's blocks)
- `peer0.deamhi.example.com:` → mounted at `/var/hyperledger/production` (the peer's ledger + state)

These volumes are why `./deamhi.sh stop` then `start` **preserves the ledger**, whereas `down -v`
(or re-running `up`, which regenerates crypto) **wipes it**. There are also **bind mounts** for the
MSP/TLS folders and the Docker socket.

**Analogy:** a container is a **whiteboard** — wiped when you erase the room. A volume is a **filing
cabinet** bolted to the wall — its contents stay even after the whiteboard is wiped. The ledger lives
in the filing cabinet.

### Our two compose files (read this carefully — they are different)

eReseta+ has **two** Docker Compose files with **different purposes**, and they do not fully agree.
This matters for understanding "how we actually run":

#### (A) `blockchain/network/compose-deamhi.yaml` — the REAL Fabric network (what we use)

Defines only the blockchain nodes. Full breakdown:

| Service | Image | Ports (host:container) | Why |
|---------|-------|------------------------|-----|
| `orderer.example.com` | `hyperledger/fabric-orderer:2.5.15` | `7050:7050` (client), `7053:7053` (admin/channel-participation), `9443:9443` (operations/metrics) | Ordering service |
| `peer0.deamhi.example.com` | `hyperledger/fabric-peer:2.5.15` | `7051:7051` (peer gRPC), `9444:9444` (operations/metrics) | Ledger + chaincode host |

Key **environment variables** (orderer): `ORDERER_GENERAL_LISTENPORT=7050`,
`ORDERER_GENERAL_TLS_ENABLED=true` (+ TLS cert/key paths), `ORDERER_GENERAL_BOOTSTRAPMETHOD=none` &
`ORDERER_CHANNELPARTICIPATION_ENABLED=true` (modern channel-join via `osnadmin`, no system channel),
`ORDERER_GENERAL_KEEPALIVE_SERVERMININTERVAL=1s` (avoid gRPC keepalive errors on slow WSL2).

Key **environment variables** (peer): `CORE_PEER_ID`/`ADDRESS=peer0.deamhi.example.com:7051`,
`CORE_PEER_LOCALMSPID=DEAMHIMSP`, `CORE_PEER_TLS_ENABLED=true`, `CORE_PEER_CHAINCODEADDRESS=…:7052`,
`CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock` (lets the peer build chaincode containers),
`CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_deamhi` (put chaincode on our network),
`CORE_CHAINCODE_EXECUTETIMEOUT=300s` (slow first build), `CORE_PEER_KEEPALIVE_MININTERVAL=1s`.

**Volumes:** the named ledger volumes above + bind mounts of the MSP/TLS dirs into the containers +
**`/var/run/docker.sock:/host/var/run/docker.sock`** (the socket that lets the peer drive Docker).
**Network:** one bridge, `fabric_deamhi`.

#### (B) root `docker-compose.yml` — a "whole app in containers" convenience file (NOT how we run today)

Defines **MariaDB + Laravel API + React web + the gateway** — but **not** the orderer/peer. It is an
aspirational "one command to run the app stack" file. **Caveats / inconsistencies (see §17):**
- It references `peer0.deamhi.example.com:7051` for the gateway but **does not start a peer** here, so
  on its own the gateway can't reach a working network.
- It uses **MariaDB 11** and `DB_CONNECTION: mariadb`, whereas we actually develop on **Laragon
  MySQL 8.4**.
- It sets `QUEUE_CONNECTION: sync` (blocking) whereas live blockchain runs need `database` + a worker.
- It uses `node:22-alpine`, whereas the WSL gateway/build actually runs on **Node 18**.

**How we actually run** is the hybrid in §11/§7: Laravel + React **natively on Windows**, the Fabric
network via **compose-deamhi.yaml in WSL**, the gateway via `npm run dev` in WSL.

### Commands to start / stop / restart (Fabric network)

```bash
# inside WSL: cd <repo>/blockchain/network
./deamhi.sh up         # FIRST TIME ONLY: crypto + network + channel (regenerates crypto → wipes ledger)
./deamhi.sh deployCC   # package/install/approve/commit the chaincode
./deamhi.sh start      # AFTER A REBOOT: resume existing network, PRESERVES the ledger
./deamhi.sh stop       # stop containers, keep volumes
./deamhi.sh down       # tear down + delete volumes (wipes ledger)
./deamhi.sh smoke      # quick invoke+query sanity test
```

---

## 7. COMPLETE SYSTEM ARCHITECTURE

### Responsibilities per layer

| Layer | Tech | Responsibility |
|-------|------|----------------|
| **Frontend** | React + Vite + TS (`web/`) | UI; calls the API; renders the blockchain audit-trail panel when a tx id exists |
| **API** | Laravel 13 / PHP 8.4 (`api/`) | Auth, RBAC, validation, business logic; **source of truth** in MySQL; dispatches ledger jobs |
| **Database** | MySQL 8.4 (Laragon) | Authoritative store for ALL data (users, patients, prescriptions, billing, audit logs) |
| **Queue worker** | `php artisan queue:work` | Runs the async ledger job so clinical actions never block on the chain |
| **Gateway** | Node.js + `@hyperledger/fabric-gateway` (`blockchain/gateway/`) | Translates REST → Fabric gRPC; signs with the DEAMHI identity; returns the real tx id |
| **Docker Engine** | Docker Desktop (WSL2 backend) | Hosts the Fabric containers |
| **Fabric network** | orderer + peer (+ chaincode container) | Records prescription lifecycle events immutably |
| **Ledger storage** | LevelDB (world state) + block files, on Docker volumes | Persistent immutable trail |

### Full ASCII architecture (every layer)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  USER (doctor / pharmacist / patient) — browser                                │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                 │  HTTPS-ish (dev: http) — Axios
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  REACT FRONTEND  (web/, Vite :5173)                                            │
│  TanStack Query · Zustand · PrescriptionDetailPage renders audit trail         │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                 │  REST  /api/*   (Bearer token, Sanctum)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  LARAVEL API  (api/, :8000)                                                    │
│  Controller → FormRequest → Service → Model    RBAC (Spatie) · AuditObserver   │
│                                                                                │
│   writes/reads          ┌──────────────────────────────┐                       │
│   (SOURCE OF TRUTH) ───▶ │  MySQL 8.4   users, patients, │                       │
│                         │  prescriptions(blockchain_tx_id), prescription_events │
│                         │  billing, audit_logs ...      │                       │
│                         └──────────────────────────────┘                       │
│                                                                                │
│   on issue/verify/dispense → dispatch RecordPrescriptionOnLedger (QUEUE)        │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                 │  (async) queue:work → FabricGatewayService (HTTP)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  FABRIC GATEWAY  (Node, :3001)   identity = DEAMHIMSP Admin cert                │
│  @hyperledger/fabric-gateway SDK  →  gRPC + TLS                                 │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                 │  gRPC/TLS  (localhost:7051 / :7050)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  DOCKER ENGINE  (Docker Desktop, WSL2 backend)                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  HYPERLEDGER FABRIC NETWORK  (docker network: fabric_deamhi)            │  │
│  │                                                                        │  │
│  │   [ PEER  peer0.deamhi :7051 ] ──runs──▶ [ CHAINCODE container         │  │
│  │        │   commits + endorses             dev-peer0…prescription_1.0 ] │  │
│  │        │                                                               │  │
│  │        └──▶ [ ORDERER orderer.example :7050  (Raft) ] orders blocks    │  │
│  │                                                                        │  │
│  │   LEDGER (on Docker volumes):                                          │  │
│  │      • world state  → LevelDB (current value per reference_no)         │  │
│  │      • blockchain   → block files (immutable history)                  │  │
│  │                                                                        │  │
│  │   (NO CA container — cryptogen static certs;  NO CouchDB — LevelDB)    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### How data flows between layers (summary)

- **All data** is written first to **MySQL** (the source of truth) by Laravel.
- **Only prescription lifecycle events** (issue/verify/dispense) are additionally **mirrored to the
  ledger**, asynchronously, and the returned **tx id is backfilled into MySQL**.
- The frontend reads everything from the **API/MySQL**; the "blockchain proof" it shows is the
  `blockchain_tx_id` stored alongside the prescription.

---

## 8. DATA FLOW — STEP BY STEP

> **Critical accuracy point:** In the current implementation, **only the prescription lifecycle
> touches Hyperledger.** Consultations/patient records, billing, audit logs, and login are
> **MySQL-only** — they do **not** create blockchain transactions. The scenarios below state this
> honestly for each.

### 8.1 Doctor issues a prescription ✅ (touches the blockchain)

```
1. React  : doctor submits New Prescription form
2. HTTP   : POST /api/prescriptions  (Bearer token)
3. Laravel: PrescriptionController@store → checks role (doctor/admin)
            → PrescriptionService::create()
            → DB::transaction { INSERT prescription(status=Issued) + items + event(ISSUED) }  ← MySQL truth
            → dispatch RecordPrescriptionOnLedger(rx, ISSUED, eventId)
4. Laravel returns 201 to the doctor IMMEDIATELY (does not wait for the chain)
5. queue:work picks up the job → FabricGatewayService::issue()
            → HTTP POST gateway:3001/prescription { prescriptionId=reference_no, patientId=record_id,
              doctorId, issuedAt, drugList }   ← NO PII
6. Gateway: submitTxn('CreatePrescription', [...])
            → propose → endorse (peer simulates) → submit → orderer batches a BLOCK
            → peer VALIDATES + COMMITS → world state["RX-2026-xxxx"] = {ISSUED,...}
            → returns real txId (e.g. 72c6ba94...)
7. Job    : UPDATE prescription_events.blockchain_tx_id = txId
            UPDATE prescriptions.blockchain_tx_id = txId   (anchor, on ISSUED)
8. React  : PrescriptionDetailPage now shows the tx id + audit trail
```
**Consensus step (6):** with one orderer (Raft) and one peer, "consensus" = the orderer cuts a block
(batch timeout 2s / 10 msgs) and the peer validates the endorsement policy `OR('DEAMHIMSP.peer')`,
then commits.

### 8.2 Pharmacist verifies a prescription ✅ (touches the blockchain)

Same shape as 8.1 but: `PUT /api/prescriptions/{id}/verify` → `PrescriptionService::verify()` (MySQL
status → Verified, new event) → job → gateway `PUT /prescription/{ref}/verify` →
`VerifyPrescription` chaincode **appends** a VERIFIED version on the same key → backfills
`prescription_events.blockchain_tx_id`.

### 8.3 Pharmacist dispenses a prescription ✅ (touches the blockchain)

Same as verify but `…/dispense` → `DispensePrescription` → appends DISPENSED. Business Rule #4
(no re-dispense) is enforced in Laravel (`status must be Verified`); the chain keeps the immutable
trail of all three states.

### 8.4 Doctor creates a consultation / patient record ❌ (MySQL only)

```
React → POST /api/patient-records → PatientRecordController@store → INSERT patient_records (MySQL)
→ AuditObserver logs to audit_logs (MySQL).   NO blockchain transaction.
```

### 8.5 Patient record accessed/modified ❌ (MySQL only)

Read/update of `patient_records` is RBAC-guarded and audited in MySQL. **No ledger involvement.**
(Patient PII is protected by **encryption-at-rest** in MySQL, not by the chain — see §12.)

### 8.6 Billing record created ❌ (MySQL only)

`POST /api/billing-records` → MySQL `billing_records`. PayMongo webhook updates status. **No ledger.**

### 8.7 An audit log entry is triggered ❌ (MySQL only)

`AuditObserver` writes CREATE/UPDATE/DELETE rows to MySQL `audit_logs` (actor, IP, timestamp) for
Appointment, Patient, PatientRecord, Prescription, User. This is the **application** audit trail —
separate from, and broader than, the blockchain (which only covers prescription events).

### 8.8 A user logs in ❌ (MySQL only — no Hyperledger CA involvement)

```
React → POST /api/auth/login → AuthController → AuthService (Hash::check)
→ Sanctum issues a Bearer token (24h).   Staff approval gate checked here.
```
**There is no link between app login and the Fabric CA/MSP.** The gateway uses a single static
**DEAMHIMSP Admin** identity for *all* ledger writes, regardless of which app user triggered them.
(The app user is recorded in the chaincode payload as `actorId`/`doctorId`, but that is *data*, not a
Fabric identity. See §18.)

---

## 9. INTEGRATION — HOW HYPERLEDGER CONNECTS TO LARAVEL

### Files in this repo that connect to Hyperledger

| File | Role |
|------|------|
| `api/app/Services/FabricGatewayService.php` | HTTP client to the Node gateway; builds payloads; `issue/verify/dispense`; returns `txId` |
| `api/app/Jobs/RecordPrescriptionOnLedger.php` | Queued, flag-gated, idempotent job; calls the service; backfills `blockchain_tx_id` |
| `api/app/Services/PrescriptionService.php` | Writes MySQL in a transaction, then **dispatches** the job after commit |
| `api/app/Http/Controllers/PrescriptionController.php` | The endpoints (`store`/`verify`/`dispense`) that begin each flow |
| `api/config/services.php` | `fabric` config block: `enabled`, `gateway_url`, `timeout` |
| `api/app/Models/Prescription.php`, `PrescriptionEvent.php` | Carry the `blockchain_tx_id` columns |
| `blockchain/gateway/src/index.ts` | The Node gateway (the actual Fabric client) |
| `blockchain/chaincode/prescription/*.go` | The smart contract |

### Controllers & endpoints that trigger blockchain transactions

| API endpoint | Controller method | Chaincode function (via gateway) |
|--------------|-------------------|----------------------------------|
| `POST /api/prescriptions` | `PrescriptionController@store` | `CreatePrescription` |
| `PUT /api/prescriptions/{id}/verify` | `PrescriptionController@verify` | `VerifyPrescription` |
| `PUT /api/prescriptions/{id}/dispense` | `PrescriptionController@dispense` | `DispensePrescription` |

(No other endpoint writes to the chain.)

### SDK / library used

- **Laravel → gateway:** plain HTTP (Laravel's `Http` client) — see `FabricGatewayService`.
- **Gateway → Fabric:** the official **`@hyperledger/fabric-gateway` (v1.7.x)** Node SDK + `@grpc/grpc-js`.
- **Chaincode:** Go with **`fabric-contract-api-go` (v1.2.2)**.

> Why a Node gateway instead of a PHP Fabric SDK? **There is no maintained PHP SDK for Fabric.** The
> Node `fabric-gateway` is the modern official client, so we put a thin Node service in front and let
> Laravel talk to it over HTTP. This is a common, accepted pattern.

### How authentication integrates with the Hyperledger CA

**It does not, by design.** App authentication (Sanctum Bearer tokens + Spatie RBAC) is entirely
separate from Fabric identity. The gateway holds **one** Fabric identity — the **DEAMHIMSP Admin**
cert/key generated by `cryptogen` — and signs every ledger transaction with it. The *application*
user who triggered the action is recorded as **data** in the chaincode payload (`actorId`,
`doctorId`), not as a distinct Fabric identity. (Trade-off discussed in §18.)

### MySQL vs the blockchain — what goes where

| Data | MySQL | Blockchain |
|------|-------|------------|
| Users, roles, auth | ✅ | ❌ |
| Patients + **encrypted PII** | ✅ | ❌ (never on-chain) |
| Patient records / consultations | ✅ | ❌ |
| Appointments | ✅ | ❌ |
| **Prescriptions** (full detail) | ✅ (source of truth) | ⏺ only the **reference_no + internal IDs + drug list + lifecycle events** |
| Prescription **lifecycle events** (issue/verify/dispense) | ✅ | ✅ (immutable trail) |
| Billing | ✅ | ❌ |
| Audit logs | ✅ | ❌ |
| `blockchain_tx_id` (proof link) | ✅ (backfilled) | — (the id originates on-chain) |

**Principle:** *MySQL is the source of truth; the ledger is a tamper-evident audit mirror of the
prescription lifecycle only.* The ledger write is **best-effort and asynchronous** — a Fabric outage
never blocks a clinical action.

### Middleware / service classes created specifically for Hyperledger

- `FabricGatewayService` (service), `RecordPrescriptionOnLedger` (job), the `fabric` config block,
  and the `blockchain_tx_id` columns. There is **no Laravel middleware** for Fabric — integration is
  via the service + queued job, not the HTTP middleware pipeline.

---

## 10. CHAINCODE — SMART CONTRACTS

**Chaincode = the smart contract: the only program allowed to read/write the blockchain ledger.** It
runs inside Fabric (in its own Docker container) and exposes functions the gateway can invoke.

**Analogy:** chaincode is the **bank teller**. You (the gateway) can't reach into the vault (ledger)
yourself; you ask the teller, who follows fixed rules about what's allowed, and only the teller
touches the money.

- **Language:** **Go** (`go 1.22`), using `fabric-contract-api-go v1.2.2`.
- **Files:** `blockchain/chaincode/prescription/prescription.go` (the contract),
  `main.go` (entry point that starts the contract), `go.mod`/`go.sum` (dependencies).
- **Contract name:** `PrescriptionContract`. **Chain key:** the prescription **`reference_no`**
  (e.g. `RX-2026-0006`). **On-chain record:** `PrescriptionEvent` (IDs + eventType + actor +
  timestamp + drugList) — **no PII**.

### Every chaincode function

| Function | Type | What it does |
|----------|------|--------------|
| `CreatePrescription(id, patientId, doctorId, issuedAt, drugList)` | **Create** | Rejects if the key already exists; writes the first version with `EventType="ISSUED"` via `PutState`. |
| `VerifyPrescription(id, pharmacistId, verifiedAt)` | **Update (append)** | Calls `appendEvent` → loads existing record, **preserves** patient/doctor/drugList, sets `EventType="VERIFIED"`, `PutState`. |
| `DispensePrescription(id, pharmacistId, dispensedAt)` | **Update (append)** | Same as verify but `EventType="DISPENSED"`. |
| `QueryPrescriptionById(id)` | **Read** | Returns the **current** world-state record via `GetState`. |
| `GetPrescriptionHistory(id)` | **Query** | Returns the **full immutable trail** of every version via `GetHistoryForKey`. |
| `appendEvent(...)` (private) | helper | Shared logic for verify/dispense; preserves prior fields so reads stay complete. |

> **There is no Delete/Void function — intentionally.** The ledger is append-only; a prescription is
> never erased. A "correction" would be a new event layered on top, with the original still visible
> via `GetPrescriptionHistory`. (Business Rules #3/#4: forward-only lifecycle, no re-dispense.)

### How chaincode was installed/deployed

Via the Fabric lifecycle in `deamhi.sh deployCC`:
`go mod vendor` → `peer lifecycle chaincode package` → `install` → `approveformyorg` → `commit`
(version 1.0, sequence 1). On commit, the peer **builds the Go contract into a Docker container** and
runs it.

### How chaincode gets invoked from Laravel

`PrescriptionController` → `PrescriptionService` → dispatch `RecordPrescriptionOnLedger` →
`FabricGatewayService` (HTTP) → Node gateway (`submitTxn`/`evaluateTransaction`) → chaincode function.

---

## 11. SETUP AND INSTALLATION — FULL STEPS

### Prerequisites

| Requirement | Version / note |
|-------------|----------------|
| OS | Windows 10/11 with **WSL2 + Ubuntu** (or native Linux) |
| **Docker Desktop** | Recent; **WSL integration enabled for Ubuntu**. Engine ≈ 24+/27+ |
| Docker Compose | v2 (the `docker compose` plugin) |
| **Hyperledger Fabric** | **2.5.x** binaries + Docker images (`fabric-orderer`, `fabric-peer`, `fabric-ccenv`, `fabric-baseos`) at **2.5.15** |
| Fabric binaries | `cryptogen`, `configtxgen`, `osnadmin`, `peer`, `orderer` (from `fabric-samples/bin`) |
| **Go** | **1.22** (in WSL — needed to vendor/build chaincode) |
| **Node.js** | **18** (in WSL, via nvm — runs the gateway) |
| MySQL/MariaDB | Local (Laragon MySQL 8.4 in practice) for the Laravel side |
| PHP | 8.4 (Laravel API) |

### Step-by-step (from scratch)

```bash
# STEP 1 — prerequisites
#   Install Docker Desktop; enable Settings → Resources → WSL Integration → Ubuntu.
#   In Ubuntu: install Go 1.22 and Node 18 (via nvm: `nvm install 18`).

# STEP 2 — Fabric binaries + images  (the standard bootstrap)
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.15 1.5.x   # installs fabric-samples/bin + pulls images
export PATH=$HOME/fabric-samples/bin:$PATH

# STEP 3 — configure the network
#   Already in repo: blockchain/network/{crypto-config.yaml, configtx.yaml, compose-deamhi.yaml}

# STEP 4–7 — crypto + network + channel + join  (all wrapped by one command)
cd <repo>/blockchain/network
./deamhi.sh up
#   → STEP 4: cryptogen generates certificates  (crypto materials)
#   → STEP 5: configtxgen builds the channel genesis block
#   → STEP 5: docker compose up -d  (starts orderer + peer)
#   → STEP 6: osnadmin channel join  (orderer joins ereseta-channel)
#   → STEP 7: peer channel join      (peer joins ereseta-channel)

# STEP 8–9 — install + instantiate chaincode
./deamhi.sh deployCC
#   → package → install → approveformyorg → commit  (chaincode 'prescription' v1.0)

# STEP 10 — test the network
./deamhi.sh smoke
#   → invoke CreatePrescription(RX-SMOKE-1) then query it back

# STEP 11 — connect to Laravel
#   Gateway (in WSL):
cp -r <repo>/blockchain/gateway ~/ereseta-gateway && cd ~/ereseta-gateway && npm install
CRYPTO_PATH=~/ereseta-fabric/organizations npm run dev    # listens on :3001
#   Laravel (Windows): in api/.env set
#     BLOCKCHAIN_ENABLED=true
#     FABRIC_GATEWAY_URL=http://localhost:3001
#     QUEUE_CONNECTION=database
#   then:
php artisan queue:work        # processes the ledger jobs
php artisan serve             # API
#   (web/) npm run dev         # frontend
```

### Configuration files (created in repo) and their gist

- `crypto-config.yaml` — 1 orderer org (`example.com`) + 1 peer org `DEAMHI` (`deamhi.example.com`),
  1 peer, 1 user, `localhost` SANs, NodeOUs on.
- `configtx.yaml` — channel profile `EResetaChannel`, org policies, etcdraft consenter, V2_5 caps.
- `compose-deamhi.yaml` — orderer + peer services (see §6).
- `deamhi.sh` — the automation script (up/deployCC/start/stop/down/smoke).

### Common setup errors & fixes (we actually hit these)

| Error | Cause | Fix |
|-------|-------|-----|
| `/usr/bin/env: 'bash\r'` or YAML parse errors | CRLF line endings on `*.sh`/`*.yaml` from Windows checkout | `.gitattributes` forces `eol=lf` (already in repo) |
| `exec format error` on image pull | WSL Docker credential helper set to `desktop.exe` | Set `~/.docker/config.json` to `{}` |
| Chaincode build fails: `fabric-ccenv:2.5` missing | Build image not pulled | `docker pull hyperledger/fabric-ccenv:2.5 && docker pull hyperledger/fabric-baseos:2.5` |
| `orderer.example.com` name conflict on `up` | Stale container/volume | `docker rm -f <name>` + `docker volume rm <vol>` (or `./deamhi.sh down`) |
| Ledger empty after reboot | Ran `up` (regenerates crypto) instead of `start` | After a reboot always use `./deamhi.sh start` |
| `npm`/`nvm` broken in WSL | Windows Node on the WSL PATH | Install Node via nvm in an interactive Ubuntu shell |
| Gateway: TLS/handshake error | Wrong `CRYPTO_PATH` or peer not up | Point `CRYPTO_PATH` at `~/ereseta-fabric/organizations`; confirm `docker ps` shows the peer |

---

## 12. SECURITY AND PRIVACY IMPLEMENTATION

### How Hyperledger secures prescription data

- **Certificate-based identity (MSP).** Every node and the gateway hold X.509 certificates. Fabric
  rejects any transaction not signed by a valid `DEAMHIMSP` identity. No anonymous writes.
- **TLS everywhere.** All gRPC traffic (gateway↔peer, peer↔orderer) is **TLS-encrypted in transit**.
- **Endorsement policy.** A transaction must be endorsed per `OR('DEAMHIMSP.peer')` before it can be
  committed — chaincode results are validated, not blindly trusted.
- **Immutable audit trail.** Each block embeds the **hash of the previous block**; altering any past
  block breaks the chain of hashes, which the peers reject. `GetPrescriptionHistory` returns the full
  unforgeable lifecycle.

### How channels provide privacy

A channel is a private ledger visible only to its members. We have one org and one channel
(`ereseta-channel`), so all (one) member sees all prescription data; outsiders cannot join or read.
(With multiple hospitals you would use multiple channels / private data collections to segregate —
out of scope here.)

### How this supports RA 10173 (Data Privacy Act)

- **No PII on-chain (data minimization).** Only internal numeric IDs + the drug list are recorded; a
  name, address, or PhilHealth number is **never** written to the ledger.
- **Confidentiality.** The chain is permissioned/private — prescription data stays within the
  hospital's controlled network.
- **Accountability & traceability.** The immutable lifecycle trail supports the DPA/ISO expectation of
  demonstrable, tamper-evident audit records.

### Encryption at rest and in transit

- **In transit:** Fabric gRPC over **TLS**; app traffic over HTTP(S).
- **At rest (the sensitive part):** patient **PII is encrypted in MySQL** (Laravel `encrypted` cast,
  AES-256-CBC; PhilHealth uniqueness via an HMAC-SHA256 blind index) — see `api/SECURITY.md`. **Note:
  the Fabric ledger itself is not separately encrypted at rest** — which is acceptable *because* no
  PII is stored on it.

### Who can see what

| Actor | Can see |
|-------|---------|
| App users (doctor/pharmacist/patient/staff/admin) | Only what RBAC + ownership allow, via the API (MySQL data) |
| The gateway (DEAMHIMSP Admin identity) | The whole channel ledger (it's the hospital's own node) |
| Outsiders / public | **Nothing** — permissioned network, no public access |

---

## 13. CURRENT IMPLEMENTATION STATUS

**Fully working**
- Fabric 2.5.15 network (1 orderer + 1 peer), channel `ereseta-channel`, chaincode `prescription` v1.0.
- Full lifecycle on-chain: issue → verify → dispense, with **real tx ids** committed and **backfilled**
  into `prescriptions.blockchain_tx_id` and `prescription_events.blockchain_tx_id`.
- Read paths: `QueryPrescriptionById`, `GetPrescriptionHistory` return complete records.
- Async, flag-gated, idempotent, retrying Laravel integration; app runs unchanged when the flag is off.
- Independent proof via peer CLI (`blockchain/_prove.sh`) + tamper-test demonstration.
- Frontend renders the blockchain audit-trail panel when `blockchain_tx_id` is present.
- Tests: `PrescriptionBlockchainTest` (flag-on persists tx ids via HTTP fake; flag-off makes 0 calls).

**Partial / by-design simplifications**
- **Single org, single peer, single orderer** — fine for a controlled demo; not high-availability.
- **`cryptogen` static certs, no Fabric CA** — no dynamic enrollment/revocation.
- **One shared Fabric identity** (DEAMHIMSP Admin) for all writes — app user is data, not a Fabric ID.
- **Only the prescription lifecycle** is on-chain; everything else is MySQL-only (intended scope).

**Pending / not done**
- No "Verify on Blockchain" UI button (live ledger compare + tamper warning) — proof is CLI-only today.
- No CouchDB (no rich queries), no performance benchmarking (Caliper), no multi-node HA.
- Running network is **per-machine** (not deployed); Phase 6 deployment not started.

**Known limitations / performance**
- First chaincode build is slow on WSL2 (hence the relaxed timeouts/keepalives).
- Raft with a single node provides ordering but **no fault tolerance** (a real Raft needs ≥3 nodes).
- The gateway opens/closes a connection per request — simple, slightly less efficient under load.

---

## 14. TROUBLESHOOTING GUIDE

```bash
# Are the containers running?
docker ps                      # expect orderer.example.com + peer0.deamhi.example.com (+ a dev-peer chaincode container)

# Network health / channel membership
cd <repo>/blockchain/network && ./deamhi.sh start   # resume (preserves ledger) then it runs `peer channel list`
# or manually after peerEnv:
peer channel list
peer channel getinfo -c ereseta-channel             # block height rises with every tx

# Inspect logs
docker logs orderer.example.com --tail 50
docker logs peer0.deamhi.example.com --tail 50
docker logs <dev-peer0…prescription…>  --tail 50    # chaincode container logs (tx commits show here)

# Independent ledger proof (no app, no MySQL)
bash blockchain/_prove.sh RX-2026-0006

# Gateway up?
curl localhost:3001/prescription/RX-SMOKE-1         # expect JSON

# Restart the whole network (preserve ledger)
./deamhi.sh stop && ./deamhi.sh start

# Reset and start completely fresh (WIPES the ledger)
./deamhi.sh down && ./deamhi.sh up && ./deamhi.sh deployCC
```

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `docker ps` shows nothing | Docker Desktop not running / WSL integration off | Start Docker Desktop; enable Ubuntu integration |
| Ledger empty after reboot | Used `up` not `start` | `./deamhi.sh start` resumes the existing ledger |
| Gateway 500 / TLS errors | Peer down or wrong `CRYPTO_PATH` | Check `docker ps`; set `CRYPTO_PATH=~/ereseta-fabric/organizations` |
| Laravel issues Rx but no tx id | `queue:work` not running, or flag off | Start `php artisan queue:work`; set `BLOCKCHAIN_ENABLED=true` |
| `bash\r` / YAML errors | CRLF endings | `.gitattributes` (already enforces LF); re-checkout |
| Chaincode won't build | missing `fabric-ccenv`/`baseos` | pull those 2.5 images |

**Log locations:** orderer/peer/chaincode logs via `docker logs <name>`; Laravel ledger-job failures
in `api/storage/logs/laravel.log` (the job's `failed()` logs there).

---

## 15. COMPLETE COMMAND REFERENCE

### Our project automation (the script — use these day to day)
```bash
./deamhi.sh up         # crypto + network + channel (first time; wipes ledger)
./deamhi.sh deployCC   # package/install/approve/commit chaincode
./deamhi.sh start      # resume existing network (after reboot; keeps ledger)
./deamhi.sh stop       # stop containers, keep volumes
./deamhi.sh down       # tear down + delete volumes (wipe)
./deamhi.sh smoke      # invoke + query sanity test
```

### Docker
```bash
docker ps                      # list running containers
docker ps -a                   # include stopped
docker logs <name> --tail 50   # container logs
docker compose -f compose-deamhi.yaml up -d     # start network
docker compose -f compose-deamhi.yaml stop      # stop (keep volumes)
docker compose -f compose-deamhi.yaml down -v   # stop + delete volumes
docker volume ls               # list volumes (ledger persistence)
docker network ls              # see the fabric_deamhi network
docker pull hyperledger/fabric-ccenv:2.5        # chaincode build image
```

### Fabric CLI (after `peerEnv` exports in the script)
```bash
peer channel list
peer channel getinfo -c ereseta-channel
peer lifecycle chaincode queryinstalled
peer lifecycle chaincode querycommitted --channelID ereseta-channel --name prescription --cafile <ORDERER_CA>
peer chaincode query  -C ereseta-channel -n prescription -c '{"function":"QueryPrescriptionById","Args":["RX-..."]}'
peer chaincode query  -C ereseta-channel -n prescription -c '{"function":"GetPrescriptionHistory","Args":["RX-..."]}'
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile <CA> \
  -C ereseta-channel -n prescription --peerAddresses localhost:7051 --tlsRootCertFiles <PEER_CA> --waitForEvent \
  -c '{"function":"CreatePrescription","Args":["RX-X","1","1","2026-..","[]"]}'
osnadmin channel join --channelID ereseta-channel --config-block <block> -o localhost:7053 --ca-file <CA> ...
```

### Laravel (blockchain-related)
```bash
php artisan queue:work         # process ledger jobs (required for live writes)
php artisan test --filter=PrescriptionBlockchainTest
php artisan tinker  # (note: tinker removed on this project — use a route/test instead)
```

---

## 16. REFERENCES & VERSIONS

| Component | Version |
|-----------|---------|
| Hyperledger Fabric (orderer/peer images) | **2.5.15** |
| Fabric chaincode build images (`fabric-ccenv`/`baseos`) | 2.5 |
| Chaincode SDK (`fabric-contract-api-go`) | **v1.2.2** |
| Go (chaincode) | **1.22** |
| Gateway SDK (`@hyperledger/fabric-gateway`) | **^1.7.0** |
| gRPC (`@grpc/grpc-js`) | ^1.12.0 |
| Node.js (gateway runtime) | **18** (WSL) — note: root compose pins `node:22-alpine` |
| Express (gateway HTTP) | ^4.21 |
| Consensus | etcdraft (**Raft**), single node |
| State database | **LevelDB** (embedded; no CouchDB) |
| Identity tooling | **cryptogen** (no Fabric CA service) |
| Channel | `ereseta-channel` · Org `DEAMHIMSP` · Chaincode `prescription` v1.0 seq 1 |

**Official docs:** Hyperledger Fabric — https://hyperledger-fabric.readthedocs.io ·
Fabric Gateway SDK — https://hyperledger.github.io/fabric-gateway ·
fabric-contract-api-go — https://github.com/hyperledger/fabric-contract-api-go ·
Docker — https://docs.docker.com · Hyperledger/LF Decentralized Trust — https://www.lfdecentralizedtrust.org

---

## 17. PLAN vs. ACTUAL — INCONSISTENCIES

> Differences between `eReseta_Development_Plan.md` and what is implemented. None are defects per se —
> they are scope/sequence decisions — but the panel may ask, so document them.

1. **Phase ordering reversed.** Plan numbers blockchain as Phase 3 and Security as Phase 5; we
   **executed Security (Phase 5) before the blockchain work**. Numbers unchanged; sequence changed.
2. **Peers: plan said 2, we run 1.** Plan §8.1 specifies "2 peers"; we run a single peer (sufficient
   for a single-org demo, simpler to operate).
3. **CA: plan implies Fabric CA, we use `cryptogen`.** Plan §8.1 lists "Certificate Authority: Fabric
   CA for identity management." We use static `cryptogen` certs and **no CA service**.
4. **"Write to ledger BEFORE the API response" (Business Rule #7) is intentionally NOT followed.** We
   write to MySQL first and record on the ledger **asynchronously, after** responding, so a chain
   outage never blocks a clinical action. This is a deliberate reliability choice that *technically
   diverges* from Rule #7's wording — be ready to defend it (it's the better engineering decision).
5. **Two compose files disagree.** The root `docker-compose.yml` (MariaDB + API + web + gateway, no
   peer, `mariadb`, `QUEUE=sync`, `node:22`) describes an all-in-Docker stack we **don't actually
   run**; reality is the hybrid (native Laravel/React on Windows + `compose-deamhi.yaml` in WSL +
   Node 18 gateway). The root file is partly aspirational/inconsistent.
6. **DB engine label drift.** Plan/older docs say **MariaDB**; we actually run **MySQL 8.4 (Laragon)**.
   Root compose says `mariadb:11`; `.env` historically said `mariadb`. (Driver-compatible, but the
   label is inconsistent.)
7. **Scope of on-chain data.** Plan language ("triggers Fabric write" on prescriptions) is honored;
   but note **only prescriptions** are on-chain — appointments/records/billing are MySQL-only, which
   matches intent but is worth stating plainly.
8. **QR codes (plan §10.1 "optional").** Signed prescription QR codes are **not** implemented.

---

## 18. SECURITY GAPS & VULNERABILITIES

> Honest assessment of the blockchain layer specifically. Most are acceptable for a capstone but
> should be acknowledged.

1. **Single shared Fabric identity (no per-user attribution on-chain).** All ledger writes use the
   one DEAMHIMSP Admin cert. The acting user is stored as *payload data* (`actorId`), which a
   compromised gateway could forge. *Stronger:* issue per-user Fabric identities via a real CA so the
   *signature* proves who acted. **Risk for capstone: low; note it.**
2. **No Fabric CA → no revocation.** With static `cryptogen` certs there is no way to revoke a
   leaked identity short of regenerating crypto. *Stronger:* run `fabric-ca`.
3. **Gateway is unauthenticated.** Anything that can reach `localhost:3001` can submit ledger
   transactions — there's no token/mTLS between Laravel and the gateway. On a single host this is
   contained, but it's an open door if the gateway is ever exposed. *Fix:* a shared secret/mTLS, bind
   to localhost only.
4. **Gateway holds the admin private key on disk** (`CRYPTO_PATH`). Key compromise = full ledger
   write access. *Mitigate:* file permissions, a secrets manager, or HSM in production.
5. **Single orderer = no fault tolerance / single point of failure.** Raft needs ≥3 nodes for real
   crash tolerance. Acceptable for demo; not for production.
6. **Ledger not encrypted at rest.** Mitigated because **no PII is on-chain**; still, drug lists +
   internal IDs sit in plaintext block files. *Fine given data minimization.*
7. **TLS host verification via `ssl_target_name_override`.** The gateway overrides the gRPC target
   name to match the peer cert (`localhost` SANs). Convenient for dev; ensure proper hostnames/certs
   in any real deployment.
8. **No endorsement diversity.** One peer endorses its own transactions — there's no independent
   second endorser to catch a malicious peer. Inherent to single-org; note it.

**None of these expose patient PII** (the key DPA concern) because PII never reaches the chain.

---

## 19. NON-TECHNICAL EXPLANATION (for the panel)

> Plain-language version a non-technical panelist can follow.

eReseta+ keeps all hospital data in a normal database (MySQL), like any system. The problem with a
normal database is that **someone with access could quietly change a record** — for example, alter
what medicine was prescribed — and there'd be no proof it was changed.

To prevent that for **prescriptions specifically**, we add a second, special kind of record-keeper: a
**private blockchain** called Hyperledger Fabric. Think of it as a **tamper-proof logbook** that the
hospital keeps alongside the database. Every time a prescription is **issued, verified, or
dispensed**, we also write that event into this logbook.

What makes the logbook special:
- **It's append-only** — you can add new pages, but you can't secretly erase or edit old ones. Each
  page is sealed with a fingerprint of the previous page, so tampering is immediately detectable.
- **It's private** — only the hospital's system can read or write it; it's not on the public internet.
- **It protects privacy** — we deliberately put **no patient names or personal details** in the
  logbook, only internal reference numbers and the medicine list. So even this extra record respects
  the Data Privacy Act.

**How we prove it works:** we can ask the blockchain directly — separately from the website and the
database — "what does the logbook say about prescription RX-2026-0006?" If someone edits the medicine
name in the database, the database and the blockchain logbook will **disagree**, and that mismatch is
the proof of tampering. The blockchain can't be quietly changed to match.

**One honest clarification:** the blockchain covers **prescriptions** (the part where tamper-proof
traceability matters most, and where regulations are strictest). Other records — appointments,
billing — live in the regular database, which is the right design.

**Analogy:** The database is a **pencil-written notebook** (easy to use, but erasable). The blockchain
is a **notarized, bound ledger** where every entry is stamped and pages are numbered so none can be
removed. We keep both: the notebook for daily work, the notarized ledger to *prove* the prescription
history was never altered.

---

## 20. CAPSTONE PANEL Q&A

**Q1. What is Hyperledger Fabric and why use it instead of Bitcoin/Ethereum?**
A. It's a *permissioned, private* blockchain from the Linux Foundation — known members only, no
cryptocurrency, fast. A hospital can't put patient data on a public chain or pay gas fees per
prescription. Fabric gives tamper-evidence and traceability without those drawbacks.

**Q2. What exactly is stored on the blockchain?**
A. Only prescription **lifecycle events** — the reference number, internal patient-record and doctor
IDs, the drug list, the event type (ISSUED/VERIFIED/DISPENSED), actor, and timestamp. **No names, no
addresses, no PhilHealth numbers.** Full prescription detail stays in MySQL.

**Q3. Where is the patient's personal data, then? Is it safe?**
A. In MySQL, **encrypted at rest** (AES-256). PII is never written to the chain — that's our
data-minimization measure for RA 10173. The blockchain only proves the *prescription history* wasn't
altered.

**Q4. How does the blockchain actually prevent tampering?**
A. Each block contains a cryptographic fingerprint (hash) of the previous block. Change any past
record and its hash changes, breaking the link to the next block — the peers reject it. It's
append-only: even corrections are new entries; the original stays visible in the history.

**Q5. Can you prove a record is on the blockchain and not faked by the app?**
A. Yes. We query the peer **directly** (not through the website or database) using `QueryPrescriptionById`
and `GetPrescriptionHistory`. We can also run a **tamper test**: edit the drug name in MySQL — the
database and the ledger then disagree, and we can't make the same edit on the ledger.

**Q6. What is chaincode and what language is it in?**
A. Chaincode is the smart contract — the only code allowed to write the ledger. Ours is written in
**Go**, with five functions (create/verify/dispense/query/history) keyed on the prescription
reference number.

**Q7. Why is there a Node.js "gateway"? Why not connect Laravel directly?**
A. There's no maintained PHP SDK for Fabric. The official client is the Node `fabric-gateway` SDK, so
we run a thin Node service that Laravel calls over HTTP. It's a standard adapter pattern.

**Q8. What happens if the blockchain is down when a doctor issues a prescription?**
A. Nothing bad for the doctor — the prescription still saves to MySQL and the doctor proceeds. The
ledger write is **asynchronous and retried**; the blockchain reference fills in automatically when
the network recovers. We deliberately never let the blockchain block a clinical action.

**Q9. Why Docker?**
A. Fabric ships as Docker images, and the peer even builds the chaincode into its own Docker
container — Fabric can't run chaincode without Docker. Docker also makes the network identical on
every machine.

**Q10. Is this decentralized? How many organizations/peers?**
A. It's a **single-organization** (the hospital) permissioned network — one peer, one Raft orderer.
The goal here is **tamper-evident traceability within one institution**, not decentralization among
strangers. It can extend to more peers/orgs later.

**Q11. How does this comply with the Data Privacy Act (RA 10173)?**
A. Three ways: (1) **data minimization** — no PII on-chain; (2) **confidentiality** — the chain is
private/permissioned; (3) **accountability** — an immutable, tamper-evident audit trail of the
prescription lifecycle.

**Q12. What are the limitations / what would you improve?**
A. Single peer/orderer (no fault tolerance), static `cryptogen` certs instead of a Fabric CA, one
shared Fabric identity, and the gateway isn't separately authenticated. All are reasonable
simplifications for a single-institution capstone; production would add a CA, per-user identities,
multiple orderer nodes, and gateway auth. (See §18.)

**Q13. Why is only the prescription module on the blockchain and not everything?**
A. Prescriptions are where tamper-proof traceability matters most (drug safety, regulation, the
"can't re-dispense" rule). Putting appointments or billing on-chain would add cost and complexity
without a comparable benefit. Scope discipline, by design.

**Q14. Does each doctor have their own blockchain identity?**
A. Not currently — all writes use one hospital identity, and the acting user is recorded as data.
Per-user Fabric identities (via a CA) would be the next step to make the *signature* itself prove who
acted. We're transparent about this trade-off.

---

## 21. CRITICAL TAKEAWAYS & RECOMMENDATIONS

### The 5 most critical things to understand

1. **MySQL is the source of truth; the blockchain is a tamper-evident mirror of the prescription
   lifecycle only.** Everything else is MySQL-only.
2. **No PII is ever on-chain** — only internal IDs + drug list. This is the core RA 10173 alignment.
3. **The ledger write is asynchronous, flag-gated, and retried** — a chain outage never blocks a
   clinical action (intentional divergence from Business Rule #7).
4. **Architecture = React → Laravel → (MySQL + queued job) → Node gateway → Fabric (Docker).** A thin
   Node gateway exists because there's no PHP Fabric SDK.
5. **It's a deliberately simplified single-org network** (1 peer, 1 Raft orderer, `cryptogen` not a
   CA, LevelDB not CouchDB) — correct for a capstone, with a clear path to harden.

### Recommendations to strengthen the implementation

- **Build the "Verify on Blockchain" UI button** (live ledger fetch + compare + ⚠️ on mismatch) — it
  turns the tamper-proof claim into something the panel can *see* live. Highest value-for-effort.
- **Authenticate the gateway** (shared secret or mTLS; bind to localhost) — closes the easiest gap.
- **(Optional, for a stronger thesis) run Hyperledger Caliper** to produce real performance numbers
  (tx/s, latency) for the FURPS "Performance" criterion.
- **(Future) Fabric CA + per-user identities** for true on-chain attribution and revocation.
- **Reconcile the docs** — align/retire the root `docker-compose.yml` or clearly mark it
  "experimental," and standardize the MySQL/MariaDB label.

### Security gaps found (summary)

Single shared Fabric identity; no CA/revocation; unauthenticated gateway; admin key on disk; single
orderer (no fault tolerance); TLS host-name override in dev. **None expose patient PII** (it's never
on-chain). Full detail in §18.

### Missing information that needs your input

- **Capstone defense date** (left as baseline in other docs) — add if you want a timeline.
- **Whether to keep or retire the root `docker-compose.yml`** — it's inconsistent with how you run.
- **Whether per-user Fabric identities are in scope** for your defense, or explicitly out of scope.
- **Exact Docker Desktop / Docker Engine versions** on Nico's and Mark's machines (run `docker version`).

---

*Generated for the eReseta+ capstone. Reflects the repository state on the `main` branch. Keep this
in sync with `blockchain/` if the chaincode, network, or gateway changes.*
