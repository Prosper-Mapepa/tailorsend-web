# TailorSend Backend

Express API for authentication, deployed on [Railway](https://railway.app).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out (Bearer token) |
| GET | `/api/auth/me` | Current user (Bearer token) |
| POST | `/api/auth/forgot-password` | Request reset email |
| POST | `/api/auth/reset-password` | Set new password |

## Local development

```bash
# From repo root
npm run db:up                    # Postgres via Docker
cp .env.example .env             # if needed
cp backend/.env.example backend/.env
npm run db:migrate
npm run backend:install
npm run backend:dev
```

Both the backend and Next.js app use the same `DATABASE_URL` (PostgreSQL).

Start the frontend in another terminal:

```bash
npm run dev
```

## Railway deployment

Full walkthrough: **[../RAILWAY.md](../RAILWAY.md)** (Postgres + API + Web).

Config file for this service: `railway.toml` (Root Directory = `backend`).

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | From Railway Postgres plugin (linked) |
| `SESSION_SECRET` | Same long random string as the Web service |
| `FRONTEND_URL` | Public Web URL (`https://….up.railway.app` or custom domain) |
| `APP_URL` | Same as `FRONTEND_URL` |
| `SMTP_*` | Optional — password reset emails |

Migrations run from the **Web** service on start (`prisma migrate deploy`). One-off:

```bash
DATABASE_URL="<railway-postgres-url>" npm run db:migrate
```

Point the Web service at this API:

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

## Test auth

```bash
npm run backend:test
```
