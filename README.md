# TailorSend — Tailor Resumes & Send Applications

Find vacancies for your target roles, tailor your resume and cover letter with AI,
and **auto-fill** the company application form — then review and submit it yourself.

> **Design principle:** the app auto-fills applications but **stops before
> submitting**. You stay in control, verify accuracy, and click *Submit*. This keeps
> you compliant with site terms and prevents bad/fabricated submissions.

## Features

- **Multi-source job search** with a pluggable adapter system:
  - **Greenhouse** & **Lever** public ATS boards (most automatable)
  - **RemoteOK** & **We Work Remotely** remote boards
  - **LinkedIn / Indeed / Glassdoor** via the **JSearch** aggregator (no scraping)
- **Relevance scoring** of every job against your target roles and skills
- **AI tailoring** (OpenAI): a tailored resume + cover letter per job, with honest
  match notes — and a hard rule against inventing experience
- **Auto-fill** of application forms with Playwright (contact fields, resume upload,
  cover letter), leaving the browser open for your review and submission
- **Application tracker** from draft → tailored → needs review → submitted → offer

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS
- **Express backend** (`backend/`) for auth — deploy to Railway
- Prisma 7 + **PostgreSQL** (local via Docker, production via Railway)
- OpenAI SDK for tailoring
- Playwright for browser automation

## Authentication

Auth runs on the **Express backend** (`backend/`). The Next.js frontend calls it for register, sign-in, forgot password, and reset password.

### Local dev (two terminals)

```bash
# Terminal 1 — backend API on :4000
npm run backend:install
npm run backend:dev

# Terminal 2 — frontend on :3000
npm run dev
```

Set matching secrets in `.env` (root) and `backend/.env`:

```
SESSION_SECRET=your-long-random-string
```

When `NEXT_PUBLIC_API_URL` is unset, Next.js proxies `/api/auth/*` to `http://localhost:4000`.

### Production (Netlify + Railway)

| Service | Role |
|---------|------|
| **Netlify** | Frontend (`NEXT_PUBLIC_API_URL=https://your-api.up.railway.app`) |
| **Railway** | Backend auth API + **PostgreSQL** plugin |

Set the **same** `SESSION_SECRET` on both. See `backend/README.md` for Railway env vars.

Run auth smoke tests: `npm run backend:test`

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

| Variable            | Required | Purpose                                                        |
| ------------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`      | yes      | PostgreSQL connection string                                   |
| `OPENAI_API_KEY`    | for AI   | Enables resume / cover-letter tailoring                        |
| `OPENAI_MODEL`      | no       | Defaults to `gpt-4o-mini`                                      |
| `RAPIDAPI_KEY`      | no       | Enables LinkedIn/Indeed/Glassdoor results via JSearch          |
| `GREENHOUSE_BOARDS` | no       | Comma-separated company slugs, e.g. `stripe,figma,airbnb`      |
| `LEVER_BOARDS`      | no       | Comma-separated company slugs, e.g. `netflix,spotify`          |

- Get a free **RapidAPI/JSearch** key: <https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch>
- Find a company's **Greenhouse** slug from its careers URL `boards.greenhouse.io/<slug>`,
  and **Lever** slug from `jobs.lever.co/<slug>`.

### 3. Start PostgreSQL and run migrations

```bash
npm run db:up          # starts Postgres via Docker (port 5432)
npm run db:migrate     # applies migrations
```

Local connection string (default in `.env.example`):

```
postgresql://postgres:Letmein%4099x%21@localhost:5432/tailorsend
```

(`@` and `!` in the password must be URL-encoded as `%40` and `%21`.)

On **Railway**, add the Postgres plugin and use its `DATABASE_URL` on both the backend service and Netlify.

### 4. Install the browser for auto-fill

```bash
npm run browser:install
```

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## How to use

1. **Profile** — paste your master resume, add contact details, skills, and one or
   more **target roles** (title, locations, keywords, remote preference).
2. **Jobs** — click **Scan for jobs** to pull and score vacancies. Filter by minimum
   match. Click **Tailor & prep** on a job to generate a tailored resume + cover letter.
3. **Applications** — open an application to edit the documents, then click
   **Auto-fill & open browser**. Review every field in the opened window and submit.
   Mark the application **submitted** to track it.

## Architecture

```
src/
  app/
    api/                     # Route handlers
      profile/               # GET/PUT profile
      search/                # POST run multi-source scan
      jobs/                  # list, get, patch status, /tailor
      applications/          # list, get, patch, /autofill, /screenshot
    page.tsx                 # Dashboard
    jobs/ applications/ profile/   # UI pages
  components/                # Nav + UI primitives
  lib/
    sources/                 # Job-source adapters (one file each) + registry
    match.ts                 # Relevance scoring
    search-service.ts        # Orchestrate sources -> score -> dedupe -> persist
    ai.ts                    # OpenAI tailoring
    apply/                   # Playwright autofill + ATS detection
    db.ts profile.ts util.ts types.ts
prisma/schema.prisma         # Profile, Job, Application models
```

### Adding a new job source

Create `src/lib/sources/<name>.ts` exporting
`search(params: SearchParams): Promise<SourceResult>`, then register it in
`src/lib/sources/index.ts`. The scoring, dedupe, and storage pipeline handles the rest.

## Important notes on automation, legality & safety

- **Review before submitting.** The auto-filler intentionally never clicks Submit.
- **Respect Terms of Service.** Scraping or automating some sites (notably LinkedIn,
  Indeed) can violate their terms; this project routes those through the JSearch API
  instead of scraping them directly. Use ATS boards (Greenhouse/Lever) and official
  APIs where possible.
- **Never fabricate.** The AI prompt forbids inventing experience, but you are
  responsible for the accuracy of everything you submit.
- **Workday and account-gated sites** often require login and multi-step flows; expect
  to complete those manually.
- Tailored resumes are written to `storage/resumes/` and review screenshots to
  `storage/screenshots/` (both git-ignored).

## License

For personal use. You are responsible for complying with the terms of any site you
apply through.
