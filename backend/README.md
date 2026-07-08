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

1. Create a Railway project with the **Postgres** plugin.
2. Deploy the `backend/` service (or set root directory to `backend`).
3. Link the Postgres `DATABASE_URL` to the backend service.
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | From Railway Postgres plugin (auto-linked) |
| `SESSION_SECRET` | Long random string (same as Netlify) |
| `FRONTEND_URL` | Your Netlify URL |
| `APP_URL` | Same as `FRONTEND_URL` |
| `SMTP_*` | Optional — password reset emails |

5. Run migrations once from your machine or a Railway one-off:

```bash
DATABASE_URL="<railway-postgres-url>" npm run db:migrate
```

6. Copy the backend public URL for Netlify.

## Netlify (frontend)

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
SESSION_SECRET=<same-as-railway>
DATABASE_URL=<same-railway-postgres-url>
```

All three services (Netlify frontend, Railway backend, Railway Postgres) share one database.

## Test auth

```bash
npm run backend:test
```
