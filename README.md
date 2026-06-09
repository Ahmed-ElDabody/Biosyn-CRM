# Biosyn CRM

> A Commitment Towards Better Health

Pharmaceutical field-force CRM for Biosyn Pharmaceuticals. See `BIOSYN_CRM_BUILD_SPEC.md` for the full specification.

## Monorepo layout

```
Biosyn-CRM/
├── backend/    NestJS + TypeScript + Prisma (PostgreSQL/PostGIS, Redis)
├── web/        Next.js + TypeScript + Tailwind (Manager + Admin)
├── mobile/     React Native + Expo + TypeScript (Rep app, offline-first)
├── docker-compose.yml   PostgreSQL 16 + PostGIS, Redis
└── data files  Excel inputs (bricks, employees, standard structure), logo, prototype
```

## Local infrastructure

```
docker compose up -d        # bring up Postgres (with PostGIS) + Redis
docker compose ps           # verify
docker compose down -v      # tear down and wipe volumes
```

Database is exposed on `localhost:5432` (db=`biosyn`, user=`biosyn`, password=`biosyn`).
Redis is exposed on `localhost:6379`.

## Backend (NestJS + Prisma)

```
cd backend
npm install
npx prisma generate         # generate Prisma client (does not touch the DB)
```

Import scripts (run after `docker compose up -d` and after applying the migration):

```
npm run import:bricks       # parses Updated_IMS_148_Bricks.xlsx -> bricks (expects 148)
npm run import:employees    # parses Employees.xlsx -> users (33 employees)
npm run import:territories  # parses "Standard Structure.xlsx" -> sub_bricks (expects 708)
npm run import:doctors      # parses Master_List_clean.xlsx -> doctors (master accounts, ~2217)
                            #   run AFTER import:bricks + import:territories (Division/Brick resolve by name)
npm run export:doctors      # dumps doctors -> Master_List_final_review.xlsx (review export, gitignored)
```

## Web (Next.js)

```
cd web
npm install
npm run dev                 # http://localhost:3000
```

## Mobile (Expo)

```
cd mobile
npm install
npx expo start              # scan QR with Expo Go, or press i/a for iOS/Android sim
```

## Status

**Milestone 1 — Foundations:** in progress. See Section 13 of the build spec.
