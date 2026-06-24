# AGENTS.md — entry point for AI coding agents (Codex, etc.)

> This repo is worked on by more than one AI assistant (Claude Code and OpenAI Codex) across two
> developers' machines. **Chat history does NOT sync between tools or machines — the committed docs
> are the only shared brain.** Read them first, every session.

## ▶️ Read these before doing anything (in order)

1. **`CLAUDE.md`** — *how to work here*: engineering standards (senior PHP/Laravel + React/TS),
   project context, tech stack, key constraints, and the multi-developer relay workflow.
   **These standards apply to you too** — follow them as written.
2. **`HANDOFF.md`** — *where the project is and what's next*. The living state doc. This is the
   single source of truth for current status. **Update it before you finish a session.**
3. **`HYPERLEDGER_DOCUMENTATION.md`** — the complete Fabric/blockchain reference (only for
   blockchain work). Do not repurpose this file; it's the defense reference.
4. **`eReseta_Development_Plan.md`** — the plan of record (phases/scope).

> Then run `git log --oneline -30` to see recent history. The codebase + git history are how you
> understand what was **done**; `HANDOFF.md` is what's **being done** and **what's next**.

## Project at a glance

- **eReseta+** — DEAMHI hospital system (capstone). Three modules: Appointments, Patient Records,
  Digital E-Prescription with Hyperledger Fabric traceability.
- **Monorepo:** `web/` (React + Vite + TS SPA), `api/` (Laravel 13 / PHP 8.4 REST API, MariaDB/MySQL),
  `blockchain/` (Go chaincode + Node gateway).
- **Auth:** Laravel Sanctum + Spatie roles (patient / doctor / staff / pharmacist / admin).

## Non-negotiable verification gates (run before claiming done / committing)

- **Backend tests:** `php artisan test` (uses in-memory SQLite — no DB server needed). Must stay green.
  - On Windows the default `php` may be 8.2 and will fail; use the PHP **8.4** binary (see the
    "How to run" section in `HANDOFF.md` for the exact path on this machine).
- **Frontend types:** `cd web && npx tsc -b --noEmit` — must be clean (strict mode; unused imports
  are build errors).
- **Frontend build:** `cd web && npm run build` — must succeed.
- After pulling, run `php artisan migrate` (schema travels via committed migrations; DB *data* does not).

## Working agreement (so two AIs don't collide)

- **One agent per working tree at a time.** Don't run Claude and Codex simultaneously editing the same
  files — branch instead.
- Commit/push only when the human asks. If on the default branch, branch first.
- Keep durable facts in `CLAUDE.md` / `HANDOFF.md` (shared via git) — never rely on per-tool memory.
- **Before finishing:** update `HANDOFF.md` (current state + decisions + what's next), then remind the
  user to `git add/commit/push` so the next developer *or the other AI* can continue.

## Current branch note (read `HANDOFF.md` for the live version)

Active branch is `merge/marks-work`. As of this writing the local branch and the remote have
**diverged** (local public-landing-site work vs. the other developer's UI/UX round) and a merge
reconciliation is pending. Check `git status` and `HANDOFF.md` before starting — do not assume `main`
or the remote is the current line.
