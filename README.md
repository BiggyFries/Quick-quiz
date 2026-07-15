# The Daily Venture

A mobile-first daily puzzle anthology built with Vite, React, TypeScript, Phaser, Matter physics, Zod, and Supabase. Week 1 contains seven complete draft adventures, each with trivia, logic, rhythm, spatial, and multi-stage finale rooms.

## Run locally

```bash
npm install
npm run dev
```

With no Supabase environment variables, the app runs in local reviewer mode. `Preview Week 1` creates a local reviewer profile, exposes all seven drafts, and lets a reviewer assign a simulated launch date. Guest play, attempts, achievements, archive availability, and settings can all be reviewed locally.

## Verification

```bash
npm test
npm run test:smoke
npm run test:e2e
npm run build
```

- Unit coverage validates the seven content schemas, unique logic solutions, timezone boundaries, attempt rules, idempotent completion, archive behavior, and achievement thresholds.
- Deterministic reducer smoke coverage completes seven victories and all 35 room failure routes.
- Playwright drives the real React/Phaser UI through all 35 rooms and seven Matter finales, checks themed defeat/results states, validates guest non-persistence, and captures the 360×640, 390×844, and 430×932 layouts.
- `window.advanceTime(ms)` and `window.render_game_to_text()` remain available for deterministic game clients.

## Supabase production setup

1. Create a Supabase project and apply [the migration](./supabase/migrations/202607140001_daily_venture.sql).
2. Run `npm run content:seed`, then apply [the generated Week 1 seed](./supabase/seed.sql).
3. Deploy every function in `supabase/functions`. Public content functions perform server-time gating; protected functions validate the bearer token internally and use the service role only after authentication.
4. Promote the reviewer account after its first magic-link sign-in:

   ```sql
   update public.profiles
   set role = 'reviewer'
   where id = (select id from auth.users where email = 'reviewer@example.com');
   ```

5. Add these deployment secrets without committing them:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   ```

The reviewer gallery starts unscheduled. After content approval, `Set Date` updates the seven database rows to consecutive release dates. No frontend rebuild is needed.

## GitHub Pages

[The Pages workflow](./.github/workflows/deploy.yml) tests and builds on `main`, then publishes `dist`. The current production base path is `/Quick-quiz/`, matching this repository; update `vite.config.ts` if the repository name changes.

## Project map

- `src/content/week1.ts` — all seven validated adventures.
- `src/game/session.ts` — deterministic puzzle/run state machine and active-time accounting.
- `src/game/VentureCanvas.tsx` — Phaser scene, layered code-native room art, explorer vignettes, and Matter finale mechanisms.
- `src/services/ventureService.ts` — Supabase production adapter and local reviewer adapter.
- `supabase/` — Postgres schema, RLS policies, generated seed, and eight Edge Functions.
- `public/assets/backplates/` — home and seven generated paper-diorama establishing scenes.

The web output stays framework-neutral at the native boundary, so a later Capacitor iOS wrapper can package the same `dist` build without changing gameplay architecture.
