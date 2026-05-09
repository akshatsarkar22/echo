# Resona MVP

Voice-first **Solana rehearsal desk**: connect Phantom, speak or type natural commands, review parsed intent, pass safety checks, confirm explicitly, and record **simulated** trades plus recurring “DCA” rules in SQLite.

## Architecture

- `frontend/` — React 19 + Vite 8 + TypeScript, Tailwind v4, shadcn/ui, lucide-react, Solana wallet adapter (Phantom + devnet RPC), Web Speech API.
- `backend/` — Express + TypeScript, Prisma + SQLite, Zod validation, REST under `/api`.
- Trades are **always simulated** in this MVP (no Jupiter / mainnet sends).

## Prerequisites

- Node.js 20+ recommended
- npm 10+

## Backend (port 4000)

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

Environment: `backend/.env` sets `DATABASE_URL="file:./dev.db"` (relative to `backend/prisma/`).

## Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

`.env.development` points `VITE_API_URL` at `http://localhost:4000`.

## Typical flow

1. Connect Phantom (devnet endpoint in app).
2. Type or speak e.g. “Buy $5 of SOL”.
3. **Analyze command** → `POST /api/parse-command` then `POST /api/safety-check`.
4. **Review & confirm** → `POST /api/simulate-trade` (buy/swap) with `confirmedByUser: true`, or create DCA / update settings / log portfolio views.
5. Activity, DCA rules, and settings persist in SQLite per wallet address.

## Core API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/parse-command` | Deterministic intent parsing |
| POST | `/api/safety-check` | Token / limit / policy gates |
| GET | `/api/portfolio/:walletAddress` | Demo portfolio snapshot |
| POST | `/api/simulate-trade` | Simulated execution metadata |
| GET/POST/PATCH/DELETE | `/api/dca...` | Recurring rules |
| GET/PATCH | `/api/settings/:wallet` | Policy document |
| GET/POST | `/api/activity...` | Command history |

## Production build check

```bash
cd backend && npm run typecheck && npm run build
cd ../frontend && npm run build
```

## Notes

- Portfolio balances are **mock data**; the API flags `isDemoData`.
- Speech recognition depends on browser support (Chrome works well; Firefox may be limited).
- Keep `simulationMode` on in Settings for the intended beginner-friendly experience.
