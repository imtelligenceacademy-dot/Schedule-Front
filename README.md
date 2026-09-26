# IM-Telligence Schedule Manager — Frontend

React, TypeScript, Vite and Tailwind browser frontend for the shared robotics scheduling platform. Deploy this repository to **Vercel**. The [FastAPI backend](https://github.com/imtelligenceacademy-dot/Schedule-back) runs on Render Free and stores shared data in Supabase PostgreSQL.

**[Complete deployment instructions](docs/DEPLOYMENT.md)**

## Deploy on Vercel

Import `imtelligenceacademy-dot/Schedule-Front` with these settings:

| Setting | Value |
|---|---|
| Root Directory | `.` (repository root) |
| Framework | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Set **`VITE_API_URL=https://YOUR-BACKEND.onrender.com`** in Vercel's Production environment. Do not append `/api`. Redeploy after changing this value.

Set the backend's `FRONTEND_URL` to this Vercel project's exact HTTPS production origin. `vercel.json` includes SPA routing and security headers; update its CSP `connect-src` if the backend later uses a custom domain.

Do not add database credentials, `JWT_SECRET`, bootstrap passwords or a Supabase service-role key to this repository or Vercel. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unused placeholders with the selected FastAPI authentication option.

## Local preview

Run the backend on `http://127.0.0.1:8000`, then from this repository root:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Leave `VITE_API_URL` unset locally to use the development `/api` proxy. Use the backend's development login details and replace its temporary password on first sign-in.

## Interface

- Authenticated dashboard, today's sessions, upcoming sessions and school/teacher statistics.
- Timeline, compact table, teacher columns and school columns.
- Backend filters for school, teacher, day, grade, class, year and search.
- Role-aware schools, teachers, session editing, conflicts, imports, exports, users, audit log and year settings.
- Shared school colors, change attribution, stale-edit handling and 45-second refresh.
- Render cold-start loading and retries, including “Starting schedule server...” after five seconds.

Schedule records come from FastAPI. Browser session storage contains only the expiring authentication token; schedule data is not persisted there.

## Build and browser tests

```powershell
npm run build
npm run test:e2e
```

Browser tests need the backend cloned as a sibling folder named `backend`, with its `.venv` and development dependencies installed. They start a disposable migrated API on port 8001 and a separate frontend origin on port 5174. They do not touch local or production schedules.

Windows uses installed Microsoft Edge by default. On Linux/macOS:

```bash
npx playwright install chromium
PLAYWRIGHT_CHANNEL=chromium npm run test:e2e
```
