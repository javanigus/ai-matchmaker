# AI Matchmaker — Product Documentation

This repository is the living product documentation for the AI-native dating platform. It's kept intentionally minimal for a solo founder: a small set of things to maintain, nothing more.

## Structure

| File | Purpose |
|---|---|
| [docs/vision.md](docs/vision.md) | Mission, philosophy, and guiding principles. Changes rarely. |
| [docs/prd.md](docs/prd.md) | The single living PRD — everything accepted (MVP, AI Interview, My Profile, AI Memory, AI Profile Coach, AI Matchmaker, Matching, Compatibility Reports, Trust & Safety, Monetization, Roadmap). |
| [docs/technical-plan.md](docs/technical-plan.md) | The accepted plan for moving from the `prototype/` click-through to the real product: architecture, stack, build sequencing, and go-to-market notes. |
| [docs/ideas.md](docs/ideas.md) | Brainstorming ideas not yet accepted, as a simple bulleted list. |
| [docs/changelog/](docs/changelog/) | One dated file per documentation update: what changed and why. |

## How this repo is maintained

- Documents are updated only when new decisions or brainstorming notes are provided — nothing is invented independently of that input.
- Unaccepted ideas live in `ideas.md`; once accepted, they move into `prd.md` (or `vision.md` if principle-level) and are removed from `ideas.md`.
- Previous information and rationale are preserved, not overwritten.
- Every update gets a dated file in `docs/changelog/` and a diff summary in chat.
- No new documentation files are created beyond this structure unless explicitly requested.

## Workflow

Brainstorming happens elsewhere (e.g. a ChatGPT conversation). At the end of a session, paste an "Update the docs" summary into Claude here, and it will update `vision.md`, `prd.md`, `ideas.md`, `technical-plan.md`, and add a changelog entry as needed.

## Running the app

The real (non-prototype) app is a Next.js project at the repo root, being built per [docs/PLAN.md](docs/PLAN.md) — see [PROGRESS.md](PROGRESS.md) for current status.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). The static click-through mockup that informed this build lives separately in [prototype/](prototype/) (open its `.html` files directly, no server needed) and is kept as a permanent UX reference, not replaced by the real app.
