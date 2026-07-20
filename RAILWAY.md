# Deploy TailorSend on Railway

Use **three services** in one Railway project:

| Service | Root directory | Config file |
|---------|----------------|-------------|
| **Postgres** | (plugin) | — |
| **API** | `backend` | `backend/railway.toml` |
| **Web** | `/` (repo root) | `railway.toml` |

---

## 1. Create the project

1. [railway.app](https://railway.app) → **New Project** → deploy from this GitHub repo.
2. Add **PostgreSQL** (New → Database → PostgreSQL).
3. Add two empty services from the same repo (or split after first deploy).

### API service

- **Settings → Root Directory:** `backend`
- Railway will pick up `backend/railway.toml`.
- **Variables → Variable Reference** (or “Add variable”) so `DATABASE_URL` comes from Postgres.
- Also set:

```
SESSION_SECRET=<long-random-string>
FRONTEND_URL=https://<your-web-service>.up.railway.app
APP_URL=https://<your-web-service>.up.railway.app
```

Optional SMTP for password resets:

```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=TailorSend <noreply@yourdomain.com>
```

Generate a public domain: **Settings → Networking → Generate Domain**.

### Web service

- **Settings → Root Directory:** leave empty / `/`
- Uses root `railway.toml` (build + `npm run start:railway` which migrates then serves Next).
- Share / set:

```
DATABASE_URL=<same Postgres reference>
SESSION_SECRET=<same as API>
NEXT_PUBLIC_API_URL=https://<your-api-service>.up.railway.app
OPENAI_API_KEY=<your-key>
OPENAI_MODEL=gpt-4o-mini
ADMIN_EMAILS=you@example.com
```

**Do not set `PORT` yourself** — Railway injects it. Overriding it (e.g. `PORT=8888`) is a common cause of 502s.

Optional:

```
RAPIDAPI_KEY=
GREENHOUSE_BOARDS=
LEVER_BOARDS=
```

Generate a public domain for the Web service. Then update API `FRONTEND_URL` / `APP_URL` to that Web URL if you created API first.

---

## 2. Custom domain (optional)

1. Web service → **Networking → Custom Domain** → `tailorsend.cc` (or your host).
2. Point Namecheap DNS (CNAME / A as Railway shows).
3. Set `FRONTEND_URL` and `APP_URL` on the API to `https://tailorsend.cc`.
4. Keep `NEXT_PUBLIC_API_URL` on the Web service pointing at the API public URL.

---

## 3. Migrations

Web `startCommand` runs `prisma migrate deploy` automatically.

One-off from your machine (if needed):

```bash
DATABASE_URL="<railway-postgres-url>" npm run db:migrate
```

---

## 4. Admin access

Either:

- Set `ADMIN_EMAILS=you@example.com` on the **Web** service, or  
- `UPDATE "User" SET role = 'admin' WHERE email = 'you@example.com';` via Railway Postgres.

Then open `/admin` while signed in as that user.

---

## 5. Local check against Railway Postgres

Not recommended for day-to-day (use Docker Postgres), but for a one-off migrate:

```bash
DATABASE_URL="postgresql://…" npm run db:migrate
```

Use Railway’s **public** or TCP proxy URL only when required; prefer private networking between Railway services.

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| **502 Application failed to respond** | Open Web service → **Deployments → latest → Deploy Logs**. Look for `prisma migrate deploy` errors or crash before `next start`. Confirm `DATABASE_URL` is set (Postgres variable reference). Remove any custom `PORT` variable. Redeploy. |
| CORS errors on auth | `FRONTEND_URL` / `APP_URL` must exactly match the Web origin (including `https://`) |
| Auth 401 after deploy | `SESSION_SECRET` must be identical on Web and API |
| Empty dashboard / DB errors | Confirm both services reference the **same** Postgres `DATABASE_URL` |
| Healthcheck failing (API) | Hit `https://<api>/health` — should return `{ "ok": true }` |
| Healthcheck failing (Web) | `/` must return 200; migrate + boot can take >100s — timeout is 300s in `railway.toml` |
| Build OOM | Raise Web service memory / use fewer concurrent builds |

### Playwright / autofill on Railway

Chromium for autofill is large. Autofill may need a dedicated worker or larger instance with:

```bash
npx playwright install chromium
```

For v1 production, many teams run autofill from a local/dev agent and keep Railway for web + auth + DB. Tailoring and core APIs work without browser install.
