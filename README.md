# NEON CIRCUIT — Futuristic Racing Game

NEON CIRCUIT is a client-only 3D racing game built with React, TypeScript, Three.js, React Three Fiber, Vite, and the Web Audio API. Choose from ten neon tracks, complete three laps, and keep local best times in the browser.

## Requirements

- Node.js `20.19.x`, `22.12+`, or `24.x` (Node 24 LTS is selected in `.nvmrc`)
- npm (the repository uses `package-lock.json`)
- A current browser with WebGL

## Install and run

```bash
npm ci
npm run dev
```

The development server listens on `http://localhost:5173/`. Local development uses the root path `/`.

## Controls

- `W` or `↑`: accelerate
- `S` or `↓`: brake/reverse
- `A`/`D` or `←`/`→`: steer
- `Escape`: pause/resume
- Touch controls appear on coarse-pointer devices. Gyroscope steering is offered only when the browser exposes and verifies a device-orientation sensor.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit
npm audit --omit=dev
```

## Production preview

```bash
npm run build
npm run preview
```

The preview server listens on `http://localhost:4173/neon-circuit/`. Production builds use the GitHub Pages repository base path `/neon-circuit/`. Deploy the generated `dist/` directory to a static host; do not commit it.

## GitHub Pages

Live site: <https://svici042.github.io/neon-circuit/>

The workflow in `.github/workflows/deploy.yml` runs the clean install, typecheck, lint, tests, and production build whenever a commit is pushed to `main`. It then uploads only `dist/` and deploys it through GitHub's official Pages actions. The workflow can also be started manually from the Actions tab.

If Pages has not previously been enabled for the repository, select **GitHub Actions** under **Settings → Pages → Build and deployment → Source**.

## Data and configuration

Leaderboard results remain in browser `localStorage`; the game has no backend, accounts, API keys, or secrets. No `.env` file is required. Any Vite variable prefixed with `VITE_` is bundled into public browser code and must never contain a secret.

## Repository exports

Exclude `.git/`, `node_modules/`, `dist/`, caches, and local environment files when making a source archive. Keep `.git/` in the active working repository.

## Copyright

© 2026 LovLaus Media.
