# NEON CIRCUIT — Futuristic Racing Game

NEON CIRCUIT is a client-only 3D racing game built with React, TypeScript, Three.js, React Three Fiber, Vite, and the Web Audio API. Choose from ten rounded neon tracks, complete three laps, and keep local best times in the browser.

## Requirements

- Node.js `20.19.x`, `22.12+`, or `24.x` (`.nvmrc` selects Node 24 LTS)
- npm and the committed `package-lock.json`
- A current browser with WebGL

## Local development

```bash
npm ci
npm run dev
```

The safe default listens only on `http://127.0.0.1:5173/`. Local development uses the root path `/`.

For a phone or tablet on the same LAN, use:

```bash
npm run dev:host
```

`dev:host` binds to `0.0.0.0` and exposes the development server to the local network. Use it only on a trusted network and stop it when real-device testing is finished. `preview` is loopback-only too; `preview:host` is the explicit LAN equivalent.

## Controls

- `W` or `↑`: accelerate
- `S` or `↓`: brake/reverse
- `A`/`D` or `←`/`→`: steer
- `Escape`: pause/resume
- Touch buttons appear on coarse-pointer devices. Gyroscope steering is enabled only after permission and a verified orientation reading.

## Architecture and state flow

`GamePage` owns the state machine and service lifecycles:

```text
menu → countdown → racing ⇄ paused → finished → menu
                    ↘ restart / change track / cancel
```

- `RaceLifecycle` assigns each run a generation token and owns countdown/finish timer cleanup. Stale callbacks cannot complete a restarted race.
- `RaceClock` uses monotonic milliseconds and subtracts paused intervals from lap and total time.
- `RacingGame` owns frame-loop refs (velocity, heading, boost, lap progress) and resets them whenever the selected track changes.
- `AudioEngine` owns the Web Audio graph, scheduled sources, scheduler timeout, and context cleanup.
- `leaderboardStorage` treats `localStorage` as untrusted, bounds input before parsing, validates entries against current tracks, and limits retained results.
- Keyboard, touch, and gyro adapters share one imperative control object because React state is not suitable for frame-rate input. Every pause/unmount path resets it.

## Track geometry and collision

Three.js uses X/Z as the ground plane and Y as height. Track dimensions are X/Z half-extents. `tracks.ts` preserves all ten authored themes and original road widths; `makeTrackGeometry` doubles each original width and derives non-inverted inner, center, and outer rounded rectangles.

The signed-distance function is negative inside a rounded rectangle. A car is represented by a circle with clearance required from both road boundaries. Movement is subdivided during frame drops to prevent tunnelling; at a collision, the inward wall-normal component is removed while tangential motion is retained for wall sliding. A lap counts only after the opposite checkpoint and finish gates are crossed in their required directions.

## Repository structure

```text
.github/workflows/  GitHub Pages build and deployment
scripts/            Pages verification and clean source archive tooling
src/pages/          Race-session coordinator
src/game/           Rendering, controls, geometry, timing, audio, UI, storage, tests
src/index.css       Shared base and repeated game UI styles
```

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit
npm audit --omit=dev
git diff --check
```

Vitest explicitly includes project tests under `src/` and `scripts/`, and excludes dependencies, build/coverage output, caches, archives, and temporary/copied dependency directories.

## Production preview and GitHub Pages

```bash
npm run build
npm run preview
```

Preview listens on `http://127.0.0.1:4173/neon-circuit/`. Production uses the `/neon-circuit/` base path. The post-build verifier rejects source-entry references, missing emitted assets, and asset paths that escape `dist`.

The workflow in `.github/workflows/deploy.yml` runs clean install, typecheck, lint, tests, and build on pushes to `main`, then uploads `dist/` through GitHub’s official Pages actions. Actions are pinned to reviewed commit SHAs with release comments, and write/OIDC permissions exist only on the deploy job. Enable **Settings → Pages → Build and deployment → Source → GitHub Actions** once for a new repository.

Live site: <https://svici042.github.io/neon-circuit/>

### Blank Pages troubleshooting

1. Open the failed Actions run and confirm `npm run build` and the Pages verifier passed.
2. Confirm the repository is named `neon-circuit`; otherwise update the production base in `vite.config.ts`.
3. Confirm Pages uses **GitHub Actions**, not a branch directory.
4. Inspect `dist/index.html`: emitted `src`/`href` values must start with `/neon-circuit/assets/`, never `/src/main.tsx`.
5. Hard-refresh after a deployment to evict an older cached HTML file.

## Clean source archive

```bash
npm run archive
```

This writes `../neon-circuit-source.zip` with source, tests, configuration, lockfile, workflow, documentation, and required assets. It excludes `.git`, dependencies, builds, coverage, logs, caches, temporary files, local `.env` files, and generated ZIPs. Generated archives are outside the project by default and ZIPs are ignored if an alternate output is placed inside it.

## Adding a track safely

1. Add one metadata entry in `TRACKS` and append its preserved source width to `ORIGINAL_ROAD_WIDTHS`.
2. Use positive finite half-extents and a road width that leaves a valid inner boundary; do not hand-edit derived geometry.
3. Keep the car start, checkpoint/finish gates, and all boost-pad corners on the road. Gate directions must match the intended lap direction.
4. Run the full verification commands. Geometry tests enforce ten tracks today, doubled widths, finite/wound boundaries, valid seams, start/gate/boost placement, and collision invariants; update the intentional track-count assertion with the new count.
5. Check the preview, drive a complete lap in both keyboard and relevant real-device controls, and verify collision at inner, outer, and rounded corner walls.

## Data and security

Leaderboard results remain in browser `localStorage`; the game has no backend, accounts, network requests, API keys, or required `.env` file. Any future Vite variable prefixed with `VITE_` is public browser code and must never contain a secret.

## Copyright

© 2026 LovLaus Media.
