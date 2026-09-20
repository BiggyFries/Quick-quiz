# Daily Venture

**Little escapes. Big discoveries.** A responsive puzzle arcade with 27 playable games, a five-room daily expedition, an explorer creator, saved favorites, and a local stamp passport. Built with React, TypeScript, Vite, and Canvas. The original seven story adventures remain available from the footer.

## Play and test

```sh
npm install
npm run dev
```

Open the printed local address. The app works without an account or backend. Each room includes a ready screen, instructions, a pause menu, touch controls, and a manually entered completion portal. Daily expeditions save at room boundaries; individual unfinished rooms restart after a reload. Arcade layouts are handcrafted; the daily mix uses the date to select rooms and remix memory, word, gear, lantern, and connection puzzles.

- **Explore:** Venture Circuit, Relic Run, and Icebound Route.
- **Think:** Block Shift, Mine Trail, Rune Merge, Lantern Grid, Crate Circuit, Gear Links, Rune Word, Relic Groups, and ten motion puzzles.
- **React:** Sky Stack, River Relay, Trail Coil, Prism Break, and Orbit Pulse.
- **Remember:** Echo Sequence.

Use the on-screen controls or arrow keys/WASD for movement. Space activates many mechanics. Escape pauses. Select How to play for each room's instructions. Logic games expose an Undo move action; Block Shift retains its built-in undo. Games pause when the document becomes hidden. Sound and reduced menu motion can be adjusted in Settings.

## Install on iPhone

1. Open the deployed HTTPS address in Safari.
2. Tap **Share → Add to Home Screen**.
3. Leave **Open as Web App** enabled, then tap **Add**.

Wait for the first online visit to finish downloading before going offline. The production build precaches the complete game, including lazily loaded rooms and original story art. A manifest, Apple touch icon, standalone metadata, safe-area layout, and versioned service worker are included. Progress is stored on the current device; it does not sync between browsers or installations.

## Verification

```sh
npm test
npm run test:smoke
npm run test:e2e
npm run build
npm run preview -- --port 4174
```

The production preview is served at `/Quick-quiz/` to match the existing GitHub Pages site. Service-worker registration runs only in production. `scripts/build-offline.mjs` generates a versioned asset list after the Vite build. Existing open installs adopt a new version after their old tabs are closed.

The browser suites cover the rebuilt home, search/categories/favorites, all 27 game layouts at three phone sizes, ready/pause/undo, portal awards, a full seeded daily expedition, the complete maze with both terminals, all classic and motion engines, and the original 35 story rooms. `window.render_game_to_text()` and `window.advanceTime(ms)` provide deterministic inspection.

## Source map

- `src/venture/VentureApp.tsx` — discovery, arcade, passport, player shell, and daily expedition.
- `src/venture/Art.tsx` — original vector island, compass, and puzzle illustrations.
- `src/venture/scenery.ts` — canvas landscape scenes shared by all arcade rooms.
- `src/venture/catalog.ts` — the full game inventory, instructions, tips, and daily selection.
- `src/venture/storage.ts` — device-local passport, favorites, personal bests, and room checkpoints.
- `src/lab/` — game engines and renderers, with reusable portal completion.
- `src/character/` — the shared customizable explorer.
- `src/App.tsx`, `src/content/week1.ts`, `src/game/` — the preserved story-adventure collection (`?legacy=1`).
- `supabase/` — optional account backend for the original stories; the new arcade does not require it.

## Publishing

The existing GitHub Pages workflow tests and builds `main`, then deploys `dist`. Production uses `/Quick-quiz/` as its base. Update `vite.config.ts` when hosting at a different path. No production credentials are required for the rebuilt arcade.
