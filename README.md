# Go Calories (web / PWA)

See exactly what you eat, every single day. A fully responsive, installable calorie & macro tracker built with
Next.js (App Router), Supabase (Google sign-in + Postgres) and Google Gemini for the "Describe" feature.

It is the web twin of the iOS design in `../Go-Calorie` — same look, same flows, no Apple Developer fee.

## What's in the core loop

- Sign in with Google (Supabase) — or "Continue without an account" (data stays on the device)
- Onboarding: body stats → goal & activity → calorie / macro plan
- Home, Today's Consumption (macros, micros, "still need today"), Calendar (week / month / year), Profile
- Log food four ways: **Manual**, **Barcode** (camera + Open Food Facts), **Describe** (AI), **Presets**
- Edit / delete any logged item
- Light / dark / auto, 9 accent colours, metric / imperial display
- AI Food Parsing settings: **Cloud (Gemini)** or an **experimental on-device model** (WebGPU, ~1 GB, offline)
- Installable PWA with offline app shell

Not built yet (planned): Preset editor screen, Notifications, Units picker page, Apple Health (iOS only).

## Run it

```bash
npm install
cp .env.example .env.local   # then fill it in (see below) — or skip to try it device-only
npm run dev                  # http://localhost:3000
```

With no `.env.local` the app still works: it runs in "this device only" mode (data in `localStorage`) and the
Describe just needs a Gemini key pasted in the app.

For a production build (this is also what registers the service worker):

```bash
npm run build && npm run start
```

## 1. Gemini (Describe) — bring your own key

There is no server-side Gemini key. Each user pastes their own free key in **Profile → AI Food Parsing → Gemini API key**
(get one at <https://aistudio.google.com/apikey>). The key is kept only in that browser's `localStorage`; requests go straight
from the device to Google, so nothing is stored in Vercel/Supabase environment variables and your quota isn't shared.
The model defaults to `gemini-3.5-flash` and can be changed under *Advanced*.

## 2. Supabase (sign-in + sync)

1. Create a project at <https://supabase.com/dashboard>.
2. **SQL editor** → paste `supabase/migrations/0001_init.sql` → Run. (Creates `profiles`, `food_entries`, `presets` with
   Row Level Security so users only ever see their own rows.)
3. **Project Settings → API** → copy the Project URL and the `anon` / publishable key into `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Google sign-in**
   1. Google Cloud Console → *APIs & Services → Credentials → Create credentials → OAuth client ID* (Web application).
   2. *Authorized redirect URI*: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   3. Copy the Client ID and Client Secret.
   4. Supabase → **Authentication → Sign In / Providers → Google** → enable, paste both.
5. Supabase → **Authentication → URL Configuration**
   - *Site URL*: your deployed URL (e.g. `https://go-calories.vercel.app`)
   - *Redirect URLs*: add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

## 3. Deploy (Vercel)

1. Push this folder to a GitHub repo and import it at <https://vercel.com/new> (framework: Next.js, nothing to change).
2. Add the two Supabase environment variables from `.env.example` in *Project → Settings → Environment Variables*.
3. Deploy, then add the production URL to Supabase's redirect list (step 2.5).

## 4. Install it on a phone

- **iPhone / iPad (Safari):** open the site → *Share* → *Add to Home Screen*.
- **Android (Chrome):** open the site → *Install app* (or the in-app *Install the app* button).
- **Desktop Chrome / Edge:** install icon in the address bar.

Camera (barcode) and the on-device model need HTTPS — Vercel gives you that; `localhost` also counts.

## Notes & limits

- iOS PWAs: no background sync, web-push works only once installed (iOS 16.4+), and Safari can evict site storage for
  rarely-used apps — signed-in users are safe because data lives in Supabase.
- On-device AI needs WebGPU. A 1 GB model may not fit in iPhone Safari's memory budget; Cloud always works.
- Barcode lookups use Open Food Facts; Indian product coverage is thinner than for EU products.
- Supabase's free tier pauses a project after about a week with no activity; just click *Restore* in the dashboard.
- Calorie goals use Mifflin–St Jeor with the male/female constants averaged (the app doesn't ask for sex). It's an estimate,
  not medical advice.

## Project layout

```
src/app/            routes (App Router): /, /login, /onboarding, /add, /calendar, /day/[date], /edit/[id], /profile, /settings/ai
src/app/api/describe  retired stub (safe to delete)
src/lib/gemini.ts   browser-side Gemini call with the user's own key
src/lib/            nutrition maths, Supabase + local repos, auth/app context, on-device model, Open Food Facts
src/components/     shell/nav, icons, form pieces, barcode scanner, install hint
public/sw.js        service worker (production only)
supabase/migrations SQL schema + RLS
```
