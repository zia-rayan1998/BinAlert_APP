# BinAlert

**AI-powered waste sorting and municipal waste management platform.**

BinAlert connects residents, collection crews, municipal operators and platform
administrators in one system: citizens photograph waste and get an instant
sorting recommendation, report illegal dumping or overflowing bins, track the
response, and earn eco points; municipalities triage reports, monitor a bin
network, optimise collection routes and forecast waste volumes; administrators
manage tenants, roles, categories and an immutable audit trail.

This repository is a **monorepo** containing three independently runnable
services plus zero-dependency developer tooling.

```
.
├── binalert/       Frontend — Vite + React 18 + TypeScript + Tailwind CSS
├── server/         Application API — Node.js + Express + TypeScript + Prisma + PostgreSQL
├── ai-service/     Inference API — Python + FastAPI
└── scripts/        Cross-platform dev tooling (no dependencies of its own)
```

---

## Table of contents

1. [Required software](#1-required-software)
2. [Node.js version](#2-nodejs-version)
3. [Python version](#3-python-version)
4. [PostgreSQL setup](#4-postgresql-setup)
5. [Environment variables](#5-environment-variables)
6. [Database initialization](#6-database-initialization)
7. [Prisma migrations](#7-prisma-migrations)
8. [Frontend installation](#8-frontend-installation)
9. [Backend installation](#9-backend-installation)
10. [AI-service installation](#10-ai-service-installation)
11. [How to start each service](#11-how-to-start-each-service)
12. [Default localhost URLs](#12-default-localhost-urls)
13. [API documentation](#13-api-documentation)
14. [Troubleshooting](#14-troubleshooting)
15. [Known issues / what did not work](#15-known-issues--what-did-not-work)

---

## Quick start

Everything below is explained in detail in the numbered sections. If you already
have Node 20+, Python 3.11+ and a running PostgreSQL:

```powershell
# From the repository root
npm run setup        # installs frontend + API deps, creates .env files, creates the Python venv
npm run db:migrate   # creates the schema (needs PostgreSQL running)
npm run db:seed      # loads demo data
npm run dev:all      # starts frontend + API + AI service
```

Open **http://localhost:5173** and sign in with `citizen@binalert.io` /
`demo1234`.

> `npm run setup` works even though the root `package.json` has **no
> dependencies** — the tooling in `scripts/` is plain Node with no packages to
> install. You never need to run `npm install` at the repository root.

---

## 1. Required software

| Software | Minimum version | Verified with | Purpose |
| --- | --- | --- | --- |
| **Node.js** | 20.11.0 | 24.18.0 | Frontend build, API runtime, dev tooling |
| **npm** | 10.x | bundled with Node | Package manager (ships with Node.js) |
| **Python** | 3.11 | 3.13.7 | AI inference service |
| **PostgreSQL** | 14 | — | Primary database for the API |
| **Git** | 2.x | — | Version control (optional for running the app) |

Installers:

```powershell
# Check what you already have
node --version      # must be >= 20.11.0
npm --version
python --version    # must be >= 3.11
psql --version      # must be >= 14
```

- **Node.js** — https://nodejs.org (LTS installer, includes npm)
- **Python** — https://www.python.org/downloads/ — **tick "Add python.exe to PATH"** during install
- **PostgreSQL** — https://www.postgresql.org/download/windows/ (EDB installer) or `winget install PostgreSQL.PostgreSQL.16`

Only Windows PowerShell commands are used in this guide. Every script also has
a plain-`node` equivalent that works on macOS/Linux.

If PowerShell refuses to run the scripts:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

## 2. Node.js version

**Node.js 20.11.0 or newer is required.** `server/package.json` declares
`"engines": { "node": ">=20.11.0" }`.

The API is written as **ES modules** with explicit `.js` import extensions and
runs through `tsx` in development. Older Node versions fail on `import.meta.dirname`
(used by the dev tooling) and on the module resolution rules.

```powershell
node --version
# v20.11.0 or higher
```

If you need to juggle versions, use [nvm-windows](https://github.com/coreybutler/nvm-windows):

```powershell
nvm install 20.11.0
nvm use 20.11.0
```

---

## 3. Python version

**Python 3.11 or newer** (verified on 3.13.7). The AI service pins its
dependencies in `ai-service/requirements.txt`:

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
pydantic==2.10.4
pydantic-settings==2.7.0
pillow==11.0.0
numpy==2.2.1
```

All of these publish wheels for Python 3.11–3.13 on Windows x64, so no C
compiler is needed.

```powershell
python --version
# Python 3.13.7
```

> **The AI service is optional.** With no AI service running, the frontend falls
> back to a deterministic on-device heuristic that is clearly labelled
> **"Demo inference"** in the UI. See [§15](#15-known-issues--what-did-not-work).

---

## 4. PostgreSQL setup

The API stores everything in PostgreSQL via Prisma. Nothing else needs a database.

### 4.1 Install

```powershell
winget install PostgreSQL.PostgreSQL.16
```

Or download the EDB installer from https://www.postgresql.org/download/windows/.
During installation:

- **Port:** `5432` (the default — keep it)
- **Superuser:** `postgres`, and set a password you will remember
- **Locale:** default
- Leave **pgAdmin 4** and **Stack Builder** ticked if you want a GUI

After installing, open a **new** PowerShell window so `PATH` is refreshed:

```powershell
psql --version
# psql (PostgreSQL) 16.x
```

If `psql` is not recognised, add it to PATH for the session:

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
```

### 4.2 Make sure the service is running

```powershell
Get-Service -Name "postgresql*"
Start-Service -Name "postgresql-x64-16"     # name varies with the version
```

### 4.3 Create the application role and database

Run these once. You will be prompted for the `postgres` superuser password.

```powershell
psql -U postgres -c "CREATE ROLE binalert WITH LOGIN PASSWORD 'binalert_dev_password';"
psql -U postgres -c "CREATE DATABASE binalert OWNER binalert;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE binalert TO binalert;"
```

> **Choose your own password.** `binalert_dev_password` above is only a local
> development placeholder — it is not a secret used anywhere in production and
> must be replaced if this database is ever reachable from a network.

Verify you can connect as the new role:

```powershell
psql -U binalert -d binalert -h localhost -c "SELECT 1;"
```

### 4.4 Alternative: Docker

If you would rather not install PostgreSQL:

```powershell
docker run --name binalert-db -e POSTGRES_USER=binalert `
  -e POSTGRES_PASSWORD=binalert_dev_password -e POSTGRES_DB=binalert `
  -p 5432:5432 -d postgres:16
```

---

## 5. Environment variables

**No secret, password, key or production URL is hard-coded anywhere in this
repository.** Every service reads its configuration from a `.env` file that you
create locally from the committed `.env.example` template. `.env` files are
git-ignored (`.gitignore` at the repository root excludes `.env` while
explicitly keeping `!.env.example`).

There are three `.env` files, one per service:

| File | Read by |
| --- | --- |
| `binalert/.env` | Vite dev server + browser bundle |
| `server/.env` | Express API, Prisma, seed script |
| `ai-service/.env` | FastAPI inference service |

`npm run setup` (or `.\scripts\setup.ps1`) creates all three from their
templates automatically and **never overwrites an existing `.env`**.

To create them by hand:

```powershell
Copy-Item binalert\.env.example   binalert\.env
Copy-Item server\.env.example     server\.env
Copy-Item ai-service\.env.example ai-service\.env
```

### 5.1 `binalert/.env` (frontend)

Only `VITE_`-prefixed variables are exposed to the browser bundle.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_PORT` | `5173` | Vite dev server port |
| `VITE_API_URL` | `http://localhost:4000` | Base URL of the Express API. Vite proxies `/api` here, so the browser only ever talks to `localhost:5173`. |
| `VITE_AI_API_URL` | `http://localhost:8000` | Base URL of the FastAPI service. **Leave empty to run in labelled demo mode.** |
| `VITE_APP_NAME` | `BinAlert` | Name shown in the tab title and footer |
| `VITE_APP_VERSION` | `1.0.0` | Version surfaced on the admin AI Model page |

### 5.2 `server/.env` (API)

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `4000` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed browser origins |
| `DATABASE_URL` | `postgresql://binalert:…@localhost:5432/binalert?schema=public` | Prisma connection string — **must match §4.3** |
| `JWT_SECRET` | `change-me-to-a-long-random-string` | **Replace before first run.** Min. 16 characters. |
| `JWT_EXPIRES_IN` | `1d` | Session lifetime |
| `AUTH_COOKIE` | `true` | Deliver the JWT in an HTTP-only cookie. When `false`, the token is returned in the JSON body and sent as `Authorization: Bearer`. |
| `COOKIE_NAME` | `binalert_token` | Cookie name |
| `COOKIE_SECURE` | `false` | Set `true` only behind HTTPS |
| `COOKIE_SAME_SITE` | `lax` | `lax` \| `strict` \| `none` |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `PASSWORD_RESET_TTL_MINUTES` | `30` | Reset link lifetime |
| `FRONTEND_URL` | `http://localhost:5173` | Used to build password-reset links |
| `UPLOAD_DIR` | `./uploads` | Where classified images are written (git-ignored) |
| `MAX_UPLOAD_MB` | `10` | Upload size limit |
| `ALLOWED_MIME_TYPES` | `image/png,image/jpeg,image/webp` | Accepted image types |
| `AI_SERVICE_URL` | `http://localhost:8000` | Server-side AI proxy target. Empty ⇒ `/api/ai/*` returns `503` instead of inventing a prediction. |
| `AI_REQUEST_TIMEOUT_MS` | `20000` | AI proxy timeout |
| `RATE_LIMIT_WINDOW_MINUTES` | `15` | General rate-limit window |
| `RATE_LIMIT_MAX` | `300` | General requests per window |
| `AUTH_RATE_LIMIT_MAX` | `10` | Auth endpoints per window |
| `SEED_PASSWORD` | `demo1234` | Password for every account created by the seed |

Generate a real `JWT_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output into `server/.env`:

```
JWT_SECRET=<the 96-character hex string>
```

### 5.3 `ai-service/.env` (AI)

| Variable | Default | Description |
| --- | --- | --- |
| `AI_HOST` | `127.0.0.1` | Bind address |
| `AI_PORT` | `8000` | Bind port |
| `AI_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Browser origins allowed to call the service directly |
| `AI_LOG_LEVEL` | `info` | `debug` \| `info` \| `warning` \| `error` |
| `AI_MODEL_MODE` | `heuristic` | `heuristic` = deterministic image-feature rules. `model` = load real exported weights. |
| `AI_MODEL_PATH` | *(empty)* | Path to an ONNX file or TorchScript archive. Only used when `AI_MODEL_MODE=model`. |
| `AI_LABELS_PATH` | *(empty)* | Optional label file, one class name per line |
| `AI_MAX_UPLOAD_MB` | `10` | Upload size limit |

---

## 6. Database initialization

Prisma creates all tables from `server/prisma/schema.prisma`. You do not write
SQL by hand.

```powershell
# 1. Make sure PostgreSQL is running (§4.2)
Get-Service -Name "postgresql*"

# 2. Apply the schema and create the migration
npm run db:migrate

# 3. Load the demo dataset
npm run db:seed
```

One-shot equivalent:

```powershell
npm --prefix server run db:setup
```

### What the seed creates

`server/prisma/seed.ts` is idempotent — it wipes the tables in foreign-key-safe
order and reloads them. It creates:

| Entity | Count |
| --- | --- |
| Municipalities | 3 |
| Zones | 3 |
| Users (all four roles) | 9 |
| Waste category definitions | 8 |
| Badges | 5 |
| Recycling centres | 3 |
| Bins | 18 |
| Collection routes | 3 |
| Vehicles | 4 |
| Collection runs | 8 |
| Classifications (+ point ledger) | 6 |
| Waste reports (+ timelines) | 10 |
| Notifications | 6 |
| Audit log entries | 7 |

### Demo accounts

All seeded accounts use the password from `SEED_PASSWORD` (**`demo1234`** by default).

| Email | Role | Lands on |
| --- | --- | --- |
| `citizen@binalert.io` | Citizen | `/dashboard` |
| `worker@binalert.io` | Collection worker | `/dashboard` |
| `municipality@binalert.io` | Municipality admin | `/municipality` |
| `admin@binalert.io` | System administrator | `/admin` |

The frontend's own demo layer ships the same four accounts, so these credentials
work whether or not the API is running.

> Never reuse `demo1234` outside local development, and never commit a `.env`
> that contains a real password.

### Browse the data

```powershell
npm run db:studio     # Prisma Studio on http://localhost:5555
```

---

## 7. Prisma migrations

All Prisma commands run from `server/`. The root `package.json` forwards to them.

| Root command | Underlying command | Purpose |
| --- | --- | --- |
| `npm run db:generate` | `prisma generate` | Regenerate the Prisma client after a schema change |
| `npm run db:migrate` | `prisma migrate dev --name init` | Create + apply a migration in development |
| `npm run db:seed` | `tsx prisma/seed.ts` | Load the demo dataset |
| `npm run db:reset` | `prisma migrate reset --force` then seed | **Drop all data**, re-apply migrations, re-seed |
| `npm run db:studio` | `prisma studio` | Visual data browser |
| — | `prisma migrate deploy` | Apply migrations in production (no reset, no seed) |

Windows shortcut for the destructive reset:

```powershell
.\scripts\reset-db.ps1            # reset + seed
.\scripts\reset-db.ps1 -NoSeed    # reset only
```

After editing `server/prisma/schema.prisma`:

```powershell
npm run db:generate
npm --prefix server run prisma:migrate   # prompts for a migration name
```

---

## 8. Frontend installation

```powershell
cd binalert
npm install
Copy-Item .env.example .env     # skip if npm run setup already did this
cd ..
```

Root-level equivalent (no `cd` needed):

```powershell
npm run install:web
```

**Stack:** Vite 5 · React 18.3 · TypeScript 5.6 · Tailwind CSS 3.4 ·
react-router-dom 6.28 · Recharts · Leaflet + react-leaflet · lucide-react.

Verify the install:

```powershell
npm run typecheck:web    # tsc --noEmit, must exit 0
npm run build:web        # production bundle into binalert/dist
```

---

## 9. Backend installation

```powershell
cd server
npm install
npx prisma generate
Copy-Item .env.example .env     # then edit JWT_SECRET and DATABASE_URL
cd ..
```

Root-level equivalent:

```powershell
npm run install:api
npm run db:generate
```

**Stack:** Node ≥ 20.11 · Express 4.21 · TypeScript 5.6 (ESM) · Prisma 5.22 ·
PostgreSQL · Zod · bcryptjs · jsonwebtoken · helmet · cors · morgan · multer ·
express-rate-limit · cookie-parser.

Verify the install:

```powershell
npm run typecheck:api    # tsc --noEmit, must exit 0
npm run build:api        # compiles to server/dist
```

---

## 10. AI-service installation

The AI service is a **separate Python process** and is documented separately, as
required. It is optional — the platform is fully usable without it.

### Option A — the provided script (recommended)

```powershell
.\scripts\dev-ai.ps1
```

This creates `ai-service\.venv` on first run, installs `requirements.txt`,
copies `.env.example` → `.env` if needed, and starts uvicorn with `--reload` on
port 8000. Pass `-Port 8001` to use a different port.

### Option B — manual

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
cd ..
```

If activation is blocked by the execution policy:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Or skip activation entirely and call the venv interpreter directly:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Verify it is running

```powershell
curl.exe http://127.0.0.1:8000/health
```

```json
{"status":"ok","service":"binalert-ai","mode":"heuristic","model_configured":false,"time":"…"}
```

Interactive API docs: **http://localhost:8000/docs** (Swagger UI, generated by FastAPI).

### Using a real trained model

By default `AI_MODEL_MODE=heuristic`: a deterministic image-feature classifier
that **always** reports `"mode": "heuristic"` plus a disclaimer. It never claims
to be a neural network.

To serve real predictions:

1. Export your trained model to **ONNX** or **TorchScript**.
2. Uncomment the matching runtime in `ai-service/requirements.txt`
   (`onnxruntime==1.20.1` or `torch==2.5.1`) and re-install.
3. Set in `ai-service/.env`:
   ```
   AI_MODEL_MODE=model
   AI_MODEL_PATH=./models/waste-classifier.onnx
   AI_LABELS_PATH=./models/labels.txt
   ```
4. Restart. If the runtime or the checkpoint is missing, the service returns
   **503** rather than silently falling back — a missing model is never
   disguised as a prediction.

---

## 11. How to start each service

### 11.1 Everything at once (recommended)

```powershell
npm run dev          # frontend (5173) + API (4000)
npm run dev:all      # frontend + API + AI service (8000)
```

PowerShell equivalent:

```powershell
.\scripts\dev.ps1              # frontend + API
.\scripts\dev.ps1 -WithAi      # frontend + API + AI service
.\scripts\dev.ps1 -Only web    # one service at a time (web | api | ai)
```

Both are thin wrappers around `scripts/dev.mjs`, a **zero-dependency
cross-platform process manager**. It:

- prefixes every line with a coloured `[web]` / `[api]` / `[ai]` tag
- warns if a service's dependencies are not installed yet
- shuts all children down on `Ctrl+C`
- propagates a child's exit code, so a crash is visible rather than silent

Because it has no dependencies of its own, `npm run dev` works before you have
installed anything at the repository root.

### 11.2 Each service separately

Three PowerShell windows, one per service:

```powershell
# Window 1 — frontend
cd binalert ; npm run dev

# Window 2 — API
cd server ; npm run dev

# Window 3 — AI service
.\scripts\dev-ai.ps1
```

Or from the root without changing directory:

```powershell
npm run dev:web
npm run dev:api
npm run dev:ai
```

### 11.3 Production-style run

```powershell
npm run build                 # builds server/dist and binalert/dist
npm --prefix server run start # node dist/index.js
npm --prefix binalert run preview
```

### 11.4 All root scripts

| Command | What it does |
| --- | --- |
| `npm run setup` | Installs frontend + API deps, creates `.env` files, generates the Prisma client, creates the Python venv |
| `npm run dev` | Frontend + API |
| `npm run dev:all` | Frontend + API + AI service |
| `npm run dev:web` / `dev:api` / `dev:ai` | One service |
| `npm run install:web` / `install:api` / `install:all` | Dependency installation only |
| `npm run build` / `build:web` / `build:api` | Production builds |
| `npm run typecheck` / `typecheck:web` / `typecheck:api` | TypeScript checks |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:reset` / `db:studio` | Database lifecycle |

### 11.5 Startup order

PostgreSQL → API → AI service → frontend. `npm run dev:all` starts the Node
processes in parallel, so if PostgreSQL is not up yet the API exits with a clear
message; just start the database and re-run.

---

## 12. Default localhost URLs

| Service | URL | Notes |
| --- | --- | --- |
| **Frontend** | http://localhost:5173 | The only URL you normally open |
| **Application API** | http://localhost:4000 | JSON REST API |
| API health | http://localhost:4000/api/health | `{ status, service, time }` |
| API root | http://localhost:4000/ | Service info |
| **AI service** | http://localhost:8000 | FastAPI |
| AI health | http://localhost:8000/health | Reports `mode` and whether a model is configured |
| AI Swagger UI | http://localhost:8000/docs | Auto-generated, interactive |
| AI OpenAPI schema | http://localhost:8000/openapi.json | |
| **Prisma Studio** | http://localhost:5555 | `npm run db:studio` |
| **PostgreSQL** | `localhost:5432` | Database `binalert`, role `binalert` |

**No production URL is referenced anywhere in local development.** Every
cross-service address comes from an environment variable, and in development
the Vite server proxies `/api` so the browser only ever talks to
`http://localhost:5173`.

### Frontend routes

| Area | Paths | Roles |
| --- | --- | --- |
| Public site | `/`, `/about`, `/how-it-works`, `/services`, `/impact`, `/contact` | anyone |
| Authentication | `/login`, `/signup`, `/forgot-password`, `/reset-password` | signed out |
| Citizen / worker | `/dashboard`, `/classify`, `/report`, `/reports`, `/map`, `/analytics`, `/eco-points`, `/profile`, `/notifications` | `citizen`, `worker` |
| Municipality console | `/municipality`, `/municipality/reports`, `/bins`, `/collections`, `/routes`, `/analytics`, `/forecast`, `/citizens`, `/recycling`, `/settings` | `municipality`, `admin` |
| System administration | `/admin`, `/admin/users`, `/admin/municipalities`, `/admin/categories`, `/admin/ai`, `/admin/audit` | `admin` |
| Errors | `/404`, `/access-denied`, and any unknown path | anyone |

---

## 13. API documentation

Base URL: **`http://localhost:4000/api`**

### 13.1 Conventions

**Authentication.** With `AUTH_COOKIE=true` (the default) `POST /api/auth/login`
sets an HTTP-only cookie named `binalert_token`; send subsequent requests with
credentials. With `AUTH_COOKIE=false` the token is returned in the JSON body and
must be sent as `Authorization: Bearer <token>`.

**Enum casing.** Prisma stores `SCREAMING_SNAKE` enums (`IN_PROGRESS`,
`E_WASTE`, `MUNICIPALITY_ADMIN`). The API always speaks **kebab-case** on the
wire (`in-progress`, `e-waste`, `municipality`). Requests accept either casing;
responses are always kebab-case. `server/src/utils/serialize.ts` is the single
place this translation happens.

**Errors.** Every failure uses one envelope:

```json
{ "error": { "code": "validation", "message": "One or more fields are invalid.",
             "details": [{ "path": "location.lat", "message": "Required" }] } }
```

| HTTP | `code` | Cause |
| --- | --- | --- |
| 400 | `validation` | Zod schema rejected the payload (`details` lists the fields) |
| 400 | `bad-request` | Semantically invalid request |
| 400 | `file-too-large` / `upload-error` | Multer rejected the upload |
| 401 | `unauthorized` | Missing, expired or invalid session |
| 403 | `forbidden` | Authenticated but not permitted |
| 404 | `not-found` | Unknown route or missing record |
| 409 | `duplicate` / `conflict` | Unique constraint (e.g. email already registered) |
| 422 | — | AI service: not enough history to forecast |
| 503 | `service-unavailable` | AI service not configured or unreachable |

**Rate limiting.** `RATE_LIMIT_MAX` requests per `RATE_LIMIT_WINDOW_MINUTES` on
all of `/api`, and a tighter `AUTH_RATE_LIMIT_MAX` on the auth endpoints.

**Pagination.** List endpoints accept `page` (from 1) and `pageSize`, and return
`{ items, total, page, pageSize }`.

### 13.2 Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Liveness probe |

### 13.3 Auth — `/api/auth`

| Method | Path | Auth | Body / query | Response |
| --- | --- | --- | --- | --- |
| POST | `/signup` | — | `{ name, email, password, role?, location? }` — `role` ∈ `citizen`\|`worker`\|`municipality` | `201 { user }` + session |
| POST | `/login` | — | `{ email, password }` | `{ user }` + session cookie |
| POST | `/forgot-password` | — | `{ email }` | `{ message }` (+ `devResetUrl` in development) |
| POST | `/reset-password` | — | `{ token, password }` | `{ message }` |
| GET | `/me` | ✓ | — | `{ user }` incl. earned badge keys |
| PATCH | `/me` | ✓ | `{ name?, location? }` | `{ user }` |
| POST | `/change-password` | ✓ | `{ currentPassword, newPassword }` | `{ ok: true }` |
| POST | `/logout` | ✓ | — | `{ ok: true }`, clears the cookie |

Self-service signup can **never** create a `SYSTEM_ADMIN`. Unknown email and
wrong password return the identical error, so the endpoint cannot enumerate
accounts; `forgot-password` always returns the same message. In development the
reset link is printed to the server console (no mail transport is configured).

### 13.4 Waste reports — `/api/reports`

All routes require authentication.

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/` | any | Query: `status`, `type`, `priority`, `zone`, `q`, `page`, `pageSize`. Citizens only ever see their own reports. |
| POST | `/` | any | `{ type, description, notes?, priority?, location: { name, lat, lng, zone? }, imageUrl? }` → `{ report, pointsEarned, newBadges }` |
| GET | `/:reference` | any | Full report with timeline |
| DELETE | `/:reference` | owner / staff | |
| POST | `/:reference/assign` | municipality, admin | `{ workerId }` |
| PATCH | `/:reference/status` | assigned worker / municipality / admin | `{ status, note?, resolutionImageUrl? }` — `note` is **required** when closing as `resolved` |
| PATCH | `/:reference/priority` | municipality, admin | `{ priority }` |
| POST | `/:reference/notes` | any with access | `{ note }` — appends to the timeline |

`type` ∈ `overflowing-bin`, `illegal-dumping`, `uncollected-waste`,
`roadside-waste`, `mixed-waste`, `hazardous-waste`, `other`.
`status` ∈ `submitted`, `assigned`, `in-progress`, `resolved`, `rejected`.
`priority` ∈ `low`, `medium`, `high`, `critical`.

Filing a report awards **30 eco points** and re-evaluates badges. Every status
change writes a timeline entry, a notification to the reporter, and an audit
log record.

### 13.5 AI classification — `/api/classifications`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/` | ✓ | `multipart/form-data` with an `image` field (PNG/JPEG/WEBP, ≤ `MAX_UPLOAD_MB`) |
| GET | `/` | ✓ | Query: `page`, `pageSize`, `category`. Staff see the whole city; citizens see their own. |
| GET | `/totals` | ✓ | Aggregated weight, CO₂e avoided and points for the caller |

Classifying awards points and re-evaluates badges. Each record stores the
category, confidence, alternatives, the model identifier and the source
(`demo`, `heuristic` or `model`) exactly as the inference service reported it.

### 13.6 Bins — `/api/bins`

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/` | any | Query: `zone`, `status`. Sorted by status then fill level. |
| GET | `/summary` | any | `{ total, byStatus, averageFillLevel }` |
| GET | `/:code` | any | Bin plus its last 20 status events |
| PATCH | `/:code` | worker, municipality, admin | `{ status, fillLevel? }` — setting `normal` stamps `lastCollectedAt` |

`status` ∈ `normal`, `attention`, `high`, `critical`.

### 13.7 Waste categories — `/api/categories`

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/` | any | Category definitions with label, bin, colour and tip |
| PATCH | `/:category` | admin | `{ isActive }` — enable/disable a category platform-wide |

### 13.8 Collections — `/api/collections`

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/vehicles` | any | Fleet with live positions |
| GET | `/vehicles/:plate` | any | Single vehicle |
| PATCH | `/vehicles/:plate` | worker, municipality, admin | `{ latitude, longitude, status? }` — `status` ∈ `active`\|`idle`\|`maintenance` |
| GET | `/routes` | any | Routes shaped as `{ …route, optimized: { distanceKm, durationMin, fuelSavedL, improvementPct } }` |
| GET | `/routes/:id` | any | Route plus its vehicles and bins |
| POST | `/routes/:id/optimize` | municipality, admin | `{ fuelPerKm? }` (default `0.32`) — re-sequences the stored path and records the savings |
| GET | `/runs` | any | Query: `status`, `routeId`, `from`, `to` |
| PATCH | `/runs/:reference` | worker, municipality, admin | `{ status }` — `scheduled`\|`in-progress`\|`completed`\|`missed` |

Route optimisation is a **deterministic nearest-neighbour pass over the stored
coordinates with haversine distances** — an honest, explainable baseline, not a
learned solver. The response says so.

### 13.9 Analytics — `/api/analytics`

All routes require authentication. Every figure is aggregated from real rows.

| Method | Path | Query | Returns |
| --- | --- | --- | --- |
| GET | `/kpis` | — | City-wide headline statistics |
| GET | `/monthly` | `months` (≤ 24, default 12) | Per-month, per-category weight series, oldest first |
| GET | `/zones` | — | Zone-by-zone comparison |
| GET | `/weekly` | — | Activity by weekday |
| GET | `/categories` | `userId?`, `scope` (`own`\|`city`) | Share of classified weight per category |
| GET | `/reports-by-day` | — | Report volume per day |
| GET | `/collection-efficiency` | — | Runs completed vs missed, on-time rate |

### 13.10 Gamification — `/api/gamification`

| Method | Path | Query | Returns |
| --- | --- | --- | --- |
| GET | `/me` | — | Points, level, progress to the next level |
| GET | `/badges` | — | Full badge catalogue, each flagged `earned` |
| GET | `/points` | `page`, `pageSize` | The caller's point ledger, newest first |
| GET | `/leaderboard` | `limit` (≤ 100, default 10) | Top scorers plus the caller's own entry |

The level ladder (1 Contributor → 10 BinAlert Legend) lives in
`server/src/utils/levels.ts` and mirrors the frontend exactly.

### 13.11 Notifications — `/api/notifications`

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/` | any | Query: `unreadOnly`, `type`, `page`, `pageSize` → `{ items, total, unread }` |
| POST | `/read-all` | any | `{ updated }` |
| PATCH | `/:id/read` | any | Ownership-checked |
| DELETE | `/:id` | any | Ownership-checked |
| DELETE | `/read` | any | Clears every read notification → `{ deleted }` |
| POST | `/broadcast` | municipality, admin | `{ title, body, type?, link?, zone? }` → fans out to active citizens, optionally filtered by zone |

`type` ∈ `report-submitted`, `report-assigned`, `status-changed`, `resolved`,
`collection`, `achievement`, `points`.

### 13.12 Municipality console — `/api/municipality`

Every route requires `municipality` or `admin`. Municipal admins are scoped to
their own municipality.

| Method | Path | Body / query | Returns |
| --- | --- | --- | --- |
| GET | `/` | — | The caller's municipality |
| GET | `/kpis` | — | `{ totalReports, activeReports, resolvedReports, overflowingBins, collectionEfficiency, recyclingRate, wasteDivertedKg, landfillReductionPct }` |
| GET | `/zones` | — | Zones with bin and report counts |
| POST | `/zones` | `{ name, municipalityId }` | Created zone |
| GET | `/citizens` | `zone?`, `q?`, `page`, `pageSize` | Residents with engagement totals, most active first |
| GET | `/workers` | — | Collection crew with workload |
| GET | `/recycling-centers` | — | Drop-off / recovery facilities |
| POST | `/recycling-centers` | `{ name, zone, latitude, longitude, accepts[], throughputKgDay? }` | Created centre |
| DELETE | `/recycling-centers/:id` | — | `{ ok: true }` |

### 13.13 Platform administration — `/api/admin`

Every route requires `admin` (`SYSTEM_ADMIN`).

| Method | Path | Body / query | Notes |
| --- | --- | --- | --- |
| GET | `/stats` | — | Platform-wide totals and per-role counts |
| GET | `/users` | `role?`, `status?`, `q?`, `page`, `pageSize` | |
| GET | `/users/:id` | — | |
| PATCH | `/users/:id/role` | `{ role }` | Refuses to strip your own admin role |
| PATCH | `/users/:id/status` | `{ isActive }` | Refuses to suspend your own account |
| GET | `/municipalities` | — | |
| POST | `/municipalities` | `{ name, city, plan?, status?, population?, recyclingRate?, contactEmail? }` | `plan` ∈ Starter\|Professional\|Enterprise; `status` ∈ trial\|active\|suspended |
| PATCH | `/municipalities/:id` | any subset of the above | |
| GET | `/audit-logs` | `action?`, `actor?`, `from?`, `to?`, `page`, `pageSize` | **Read-only** — audit entries are never edited or deleted |

### 13.14 AI — `/api/ai`

`/health` and `/model-info` are **public** so the frontend can decide between
live inference and labelled demo mode before anyone signs in.

| Method | Path | Roles | Notes |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ status, configured, mode }`. Returns `503` when `AI_SERVICE_URL` is set but unreachable; `{ status: 'unconfigured', configured: false, mode: 'demo' }` when it is empty. |
| GET | `/model-info` | — | Never fails — reports the current runtime state instead |
| POST | `/forecast` | any signed-in | `{ horizonDays (1–90, default 7), scope (default 'city') }` |
| GET | `/forecasts` | municipality, admin | `scope?`, `limit` (≤ 50) — previously stored forecasts |
| GET | `/stats` | municipality, admin | `hours` (≤ 720, default 24) |

**Forecasting is honest by construction.** The API builds the observation window
from real classified weight per day and requires at least **7 observations**.
With less history it returns `400` and tells you to stay in demo mode rather
than returning an invented curve. The underlying model is an explicitly labelled
`seasonal-naive-ols-v1` statistical baseline — a seasonal-naive forecast with an
OLS trend — not a deep-learning model.

`/stats` reports `precision: null` and `recall: null`, because there is no
labelled ground truth to measure against. Accuracy figures are never guessed.

When `AI_SERVICE_URL` is empty the endpoints return `503`; they never fabricate
a prediction.

### 13.15 AI service (Python) — `http://localhost:8000`

Called directly by the browser (CORS is configured via `AI_CORS_ORIGINS`) and
server-side by the Node API.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | `{ status, service, mode, model_configured, time }` |
| GET | `/api/ai/model-info` | `{ mode, modelId, runtime, categories, labelsLoaded, trainedModelConfigured, notes }` |
| POST | `/api/ai/classify` | `multipart/form-data`, field `image` |
| POST | `/api/ai/forecast` | `{ horizon_days, scope, history[] }` → `422` when history is too short |

`POST /api/ai/classify` response (verified):

```json
{
  "itemName": "Test png",
  "category": "paper",
  "confidence": 0.49,
  "alternatives": [
    { "category": "plastic", "confidence": 0.363 },
    { "category": "glass",   "confidence": 0.024 },
    { "category": "metal",   "confidence": 0.024 }
  ],
  "recommendedBin": "Blue recycling bin",
  "binColor": "#0ea5e9",
  "environmentalTip": "Keep paper dry and flatten cardboard to save collection space.",
  "weightKg": 0.25,
  "co2SavedKg": 0.35,
  "pointsEarned": 25,
  "modelId": "binalert-heuristic-v1",
  "mode": "heuristic",
  "latencyMs": 23,
  "disclaimer": "No trained model is loaded. This result comes from a deterministic image-feature heuristic and should be treated as an estimate, not a model prediction."
}
```

Confidence values are **0–1 fractions**. The frontend normalises them to 0–100
and renders the `disclaimer` verbatim, so a heuristic result is never presented
as a model prediction.

Full interactive documentation: **http://localhost:8000/docs**

### 13.16 Trying the API from PowerShell

```powershell
# Health — no auth needed
curl.exe http://localhost:4000/api/health

# Sign in and keep the session cookie
curl.exe -c cookies.txt -X POST http://localhost:4000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"citizen@binalert.io\",\"password\":\"demo1234\"}'

# Use the session
curl.exe -b cookies.txt http://localhost:4000/api/reports?pageSize=5
curl.exe -b cookies.txt http://localhost:4000/api/gamification/me
curl.exe -b cookies.txt http://localhost:4000/api/bins/summary
```

With `AUTH_COOKIE=false`, capture the token instead and send it as a header:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"citizen@binalert.io","password":"demo1234"}'
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri http://localhost:4000/api/reports -Headers $headers
```

---

## 14. Troubleshooting

### `npm run dev` — "Dependencies are not installed yet"

```powershell
npm run setup
```

### `[api] [env] Invalid or missing environment variables`

`server/.env` is missing or incomplete. The message lists exactly which keys
failed.

```powershell
Copy-Item server\.env.example server\.env
notepad server\.env      # set DATABASE_URL and a real JWT_SECRET
```

### `[db] Could not reach PostgreSQL at the configured DATABASE_URL`

The API could not connect. Work through:

```powershell
Get-Service -Name "postgresql*"                       # is it running?
Start-Service -Name "postgresql-x64-16"
Test-NetConnection -ComputerName localhost -Port 5432 # is it listening?
psql -U binalert -d binalert -h localhost -c "SELECT 1;"  # do the credentials work?
```

Then confirm `DATABASE_URL` in `server/.env` matches — user, password, host,
port and database name. A missing `?schema=public` suffix is a common typo.

### `P1001: Can't reach database server` / `P1003: Database does not exist`

```powershell
psql -U postgres -c "CREATE DATABASE binalert OWNER binalert;"
npm run db:migrate
```

### `P2002: Unique constraint failed` while seeding

The seed is not idempotent against partially-created data. Reset it:

```powershell
.\scripts\reset-db.ps1
```

### `role "binalert" does not exist`

You skipped §4.3. Create the role, then re-run the migration.

### `EADDRINUSE: address already in use :::4000` (or 5173 / 8000)

```powershell
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
Stop-Process -Id <pid>
```

Or change the port in the relevant `.env` (`PORT`, `VITE_PORT`, `AI_PORT`).

### `Cannot find module '@prisma/client'` / `@prisma/client did not initialize yet`

```powershell
npm run db:generate
```

### `tsx: command not found`

API dependencies are not installed:

```powershell
npm run install:api
```

### Frontend shows "Demo inference" even though the AI service is running

1. `binalert/.env` must set `VITE_AI_API_URL=http://localhost:8000`.
2. **Restart the Vite dev server** — `VITE_` variables are read at startup only.
3. Confirm the service is up: `curl.exe http://127.0.0.1:8000/health`.
4. Check `AI_CORS_ORIGINS` in `ai-service/.env` includes `http://localhost:5173`.

Note the badge reads **"Heuristic — no trained model"** unless
`AI_MODEL_MODE=model` with valid weights — that is deliberate, not a bug.

### CORS error calling the AI service from the browser

Add your frontend origin to `AI_CORS_ORIGINS` in `ai-service/.env` and restart
the service.

### AI service returns `503` from `/api/ai/*`

Either `AI_SERVICE_URL` is empty in `server/.env`, or the Python process is not
running. With `AI_MODEL_MODE=model`, a missing runtime or checkpoint also
returns `503` — it will not silently fall back to the heuristic.

### Forecasting returns `400` / `422` — "not enough history"

Expected. At least **7 days** of real classification records are required.
Classify more waste (or seed more days) and retry. The API refuses to invent a
curve.

### `python was not found` / `No module named uvicorn`

```powershell
python --version                        # confirm 3.11+ is on PATH
.\scripts\dev-ai.ps1                    # creates the venv and installs deps
```

If the venv exists but is broken, delete `ai-service\.venv` and re-run the script.

### `Activate.ps1 cannot be loaded because running scripts is disabled`

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Or call the interpreter directly: `.\.venv\Scripts\python.exe -m uvicorn …`.

### `pip` fails to build `numpy` or `pillow`

You are on a Python version without prebuilt wheels. Install Python 3.11, 3.12
or 3.13 (x64) and recreate the venv.

### Blank page / "Page not found" on the landing page

Hard-refresh to clear a stale Vite cache:

```powershell
Remove-Item -Recurse -Force binalert\node_modules\.vite
npm run dev:web
```

### Tailwind classes not applying

```powershell
Remove-Item -Recurse -Force binalert\node_modules\.vite
npm run build:web        # a clean build surfaces any real error
```

### Port 5173 already taken, Vite picked 5174

`strictPort` is off by design, so Vite falls back to the next free port. Read
the URL it prints. If the API rejects the new origin, add it to `CORS_ORIGIN` in
`server/.env`.

### Type errors after pulling changes

```powershell
npm run typecheck        # checks both projects
npm run db:generate      # stale Prisma client types cause most of these
```

### Rate limit `429 Too Many Requests`

Auth endpoints allow `AUTH_RATE_LIMIT_MAX` (10) attempts per 15 minutes. Wait
for the window to roll over, or raise the value in `server/.env` for local work.

### Uploads rejected

`ALLOWED_MIME_TYPES` is `image/png,image/jpeg,image/webp` and
`MAX_UPLOAD_MB` is `10`. A file renamed to `.png` that is actually a GIF is
rejected by MIME sniffing — re-export it as a real PNG.

---

## 15. Known issues / what did not work

Everything the application does is listed here honestly, including what could
**not** be verified in the environment where this was built.

### 15.1 Not verified — no PostgreSQL was available

The build environment had **no PostgreSQL server**, so these were never
executed:

- `prisma migrate dev` — the schema has **not** been applied to a real database
- `npm run db:seed` — the seed script has **not** been run
- Any HTTP request against the running API

What *was* verified for the API:

- `npm install` completes (143 packages)
- `npx prisma generate` succeeds
- `npx tsc --noEmit` exits **0** — the whole server type-checks
- `npx tsx src/index.ts` loads the **entire module graph** (every controller,
  route, middleware and service), validates `server/.env`, and then fails only
  at the database connection with the intended readable message:

  ```
  [db] Could not reach PostgreSQL at the configured DATABASE_URL.
       Start the database, then run:  npm run prisma:migrate  and  npm run db:seed
       Can't reach database server at `localhost:5432`
  ```

So the API is compile-clean and wires together, but **no endpoint has been
exercised against a live database**. Expect to fix small runtime issues on the
first `db:migrate` / `db:seed`.

### 15.2 The frontend UI is not wired to the REST API

This is a **deliberate** decision, not an oversight. The React app runs on a
service layer backed by `localStorage` (`binalert/src/services/*Service.ts`),
which is fully populated with demo data and works with no database at all.

The **one exception is AI classification**, which is genuinely live: with
`VITE_AI_API_URL` set, `POST /api/ai/classify` is called on the Python service
and the real response is rendered. This was verified end to end in a browser.

Why not connect the rest? Every service exposes the same interface the API
implements, so swapping them is mechanical — but doing it *partially* produces a
worse product: API-backed auth would sign you into a dashboard whose lists still
read from an empty `localStorage`, so every page would look broken. The clean
switch is to replace the service implementations wholesale once the database is
confirmed working. Each service file carries a comment naming the endpoint that
replaces it.

**Consequence:** signing in through the UI does not create a row in PostgreSQL,
and reports filed in the UI do not appear in the API. The two layers are
parallel, not connected.

### 15.3 The setup script was not run end to end

`scripts/setup.mjs` and `scripts/dev.mjs` both pass `node --check`, and
`dev.mjs`'s argument handling was exercised directly. All four `.ps1` scripts
parse cleanly under `[System.Management.Automation.Language.Parser]`. But
`setup.mjs` was **never executed as a whole** — its individual steps (npm
install in both projects, `prisma generate`, venv creation, `pip install`) were
each run by hand and all succeeded, so the composition is the only untested
part.

### 15.4 No automated tests

There is no test suite anywhere in the monorepo — no unit tests, no integration
tests, no end-to-end tests. Verification was manual: TypeScript compilation on
both projects, a production Vite build, a browser walk-through of every route,
and live HTTP calls to the AI service.

### 15.5 No machine-learning model ships with the repository

`AI_MODEL_MODE` defaults to `heuristic`. There are **no trained weights** in
this repo, and no training pipeline. The heuristic is a deterministic
image-feature rule set (colour and texture statistics) that is stable per image
and always labels itself. Route optimisation is nearest-neighbour; forecasting
is seasonal-naive plus an OLS trend. All three are labelled as such in the code
and in the API responses. Nothing pretends to be a neural network.

To get real predictions you must supply your own exported ONNX or TorchScript
model — see [§10](#using-a-real-trained-model).

### 15.6 No email transport

Password reset does not send mail. In development the reset URL is printed to
the **server console** and returned as `devResetUrl` in the JSON response.
Wiring a real provider (SMTP, Resend, SES…) is left as an exercise; the token
generation, hashing, expiry and single-use enforcement are all implemented.

### 15.7 Visual layout was verified structurally, not visually

The browser tooling in the build environment could not produce screenshots, so
no page was **looked at**. Instead every route was loaded and inspected
programmatically:

- All 6 public pages, 4 auth pages, 9 citizen/worker pages, 10 municipality
  pages and 6 admin pages render with real content and **zero console errors**
- Role guards work: a citizen at `/admin` sees "Access denied"; a signed-out
  visitor at `/dashboard` is redirected to `/login`
- The full login flow works through the UI (quick-fill → Sign In → correct
  role-based landing page and navigation)
- Live AI classification works through the UI, including the file upload,
  multi-stage progress, result panel and toast

The verification viewport was narrow (~638 px), so the **mobile** layout is
confirmed working. **Desktop-width layout, exact spacing and colour contrast
were never visually inspected.**

### 15.8 `multer` 1.x deprecation warning

`npm install` in `server/` prints:

```
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of
vulnerabilities, which have been patched in 2.x.
```

The pin was left at `^1.4.5-lts.1` because multer 2.x changes some behaviour
and could not be tested without a database. **Upgrade to `multer@^2` before any
network-exposed deployment.** Uploads are already constrained by MIME allow-list
and size limit.

### 15.9 Frontend bundle is not code-split

The production build emits a single ~1.08 MB JS chunk (296 KB gzipped).
`chunkSizeWarningLimit` was raised to 1200 in `vite.config.ts` rather than
leaving a suppressed warning. Every page is statically imported in `App.tsx`.
Route-level `React.lazy` splitting is the obvious next step.

### 15.10 Leaflet map tiles need internet access

`/map` and the municipality map views load OpenStreetMap raster tiles at
runtime. Offline, the map renders its markers and controls over a grey
background. No tile server is bundled.

### 15.11 Bugs found and fixed during verification

For transparency — these were broken and are now fixed:

| Bug | Impact | Fix |
| --- | --- | --- |
| `<Route index>` nested inside `<Route path="*">` in `App.tsx` | **The landing page `/` rendered "Page not found"**, and unknown URLs rendered a blank layout | Replaced with a splat child route |
| Live AI confidence rendered raw | The UI showed `0.49%` instead of `49%`, and the breakdown showed `0.4% / 0.0% / 0.0%` | Added `fromApiResponse()` normalisation (0–1 → 0–100) in `aiClassificationService.ts` |
| Heuristic results badged "Live model" | Misrepresented a non-ML result as a model prediction | Badge now reads "Heuristic — no trained model" and the service's `disclaimer` is rendered verbatim |
| `setUserRole` / user filtering used `toPrismaEnum<Role>` | `municipality` → `MUNICIPALITY` and `admin` → `ADMIN`, neither a valid Prisma `Role` — would have thrown at runtime | Switched both call sites to the existing `toPrismaRole()` inverse map |
| `notification.controller.ts` referenced an undefined `toNotification` | **The API did not compile** | Corrected to `serializeNotification` |
| Dead `/ai` Vite proxy with an inconsistent rewrite | Unused config that would have produced `/api/ai/api/ai/...` | Removed; the browser calls the AI service directly under CORS |
| `Timeline` imported from `Feedback.tsx` but never defined | **`npm run build` failed** on two pages | Implemented the component |

---

## Security notes

- **No secret is hard-coded.** API keys, database passwords, JWT secrets and
  production URLs all come from environment variables. Only `.env.example`
  templates — containing placeholders — are committed; `.env` is git-ignored.
- Passwords are hashed with bcrypt (`BCRYPT_ROUNDS`, default 12). Plaintext
  never reaches the database.
- Sessions are JWTs in an **HTTP-only** cookie by default, which keeps them out
  of reach of client-side script.
- `helmet` sets security headers; CORS is an explicit allow-list with
  credentials; body payloads are capped at 1 MB; uploads are capped by MIME
  type and size.
- Rate limiting applies to all of `/api`, with a stricter limit on auth.
- Login and password-reset responses are deliberately identical for unknown and
  known accounts, so neither endpoint enumerates users.
- Self-service signup cannot create a system administrator. Admins cannot strip
  their own admin role or suspend their own account.
- Report status changes are authorised: only the assigned worker or municipal
  staff may change them.
- The audit log is append-only — no endpoint edits or deletes an entry.
- Municipal staff are scoped to their own municipality.

**Before deploying anywhere public:** set a strong `JWT_SECRET`, change
`SEED_PASSWORD`, do not run the seed, set `COOKIE_SECURE=true` behind HTTPS,
upgrade multer to 2.x, and put the AI service behind the Node API rather than
exposing it to browsers.

---

## Project layout

```
binalert/                     Frontend
├── src/
│   ├── components/           layout/, ui/ (Button, Card, Badge, Feedback, …)
│   ├── context/              AuthContext, ToastContext
│   ├── pages/                public/, auth/, citizen/, municipality/, admin/
│   ├── services/             localStorage demo layer + live AI client
│   ├── types/                shared TypeScript contracts
│   └── utils/                format, labels
├── vite.config.ts            env-driven dev proxy
└── .env.example

server/                       Application API
├── prisma/
│   ├── schema.prisma         22 models, 8 enums
│   └── seed.ts               demo dataset
├── src/
│   ├── config/env.ts         Zod-validated environment
│   ├── controllers/          11 controllers
│   ├── middleware/           auth, error, rateLimit, upload, validate
│   ├── routes/               12 route modules + index
│   ├── services/             audit, gamification, aiClient
│   ├── utils/                serialize (enum boundary), levels, errors
│   ├── app.ts                Express app factory
│   └── index.ts              entrypoint + graceful shutdown
└── .env.example

ai-service/                   Inference API
├── app/
│   ├── classification/       heuristic + optional ONNX/TorchScript runtime
│   ├── forecasting/          seasonal-naive + OLS baseline
│   ├── config.py, schemas.py, taxonomy.py, preprocessing.py, main.py
├── requirements.txt
└── .env.example

scripts/
├── dev.mjs                   cross-platform process manager (no dependencies)
├── setup.mjs                 one-shot installer (no dependencies)
├── setup.ps1  dev.ps1  dev-ai.ps1  reset-db.ps1
```
