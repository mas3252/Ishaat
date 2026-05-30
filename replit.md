# Athenaeum — Book Inventory Tracker

A library management system for tracking physical book collections, inventory levels, and member borrowing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/book-inventory run dev` — run the frontend (port 25933)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- ISBN lookup: Open Library API

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: `books.ts`, `members.ts`, `loans.ts`
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/book-inventory/src/pages/` — React pages

## Architecture decisions

- ISBN lookup uses the Open Library API (`openlibrary.org/api/books`) — no API key required
- Inventory adjustments (add/subtract) update both `totalCopies` and `availableCopies` atomically
- Loan creation decrements `availableCopies`; return increments it back
- `activeLoansCount` on Member is computed at query time (not stored)

## Product

- **Catalog**: Add books by ISBN barcode scan (auto-fills title, author, cover via Open Library), or manually. View as a grid with cover art.
- **Inventory**: Add or remove physical copies from any book's detail page.
- **Members**: Register members with a unique member code.
- **Loans**: Borrow a book (assigns to member, decrements availability) and return it.
- **Dashboard**: Live stats — titles, copies, availability, active loans, recent activity.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- ISBN lookup strips dashes before calling Open Library

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
