# Realm of Shadows

Fantasy hidden-role party game for 5–10 players. **Pass & Play** locally on one device, or **Host / Join online** with a 4-digit room code via a central game server.

## Run locally

```bash
npm install
cp .env.example .env          # set EXPO_PUBLIC_BACKEND_URL for online mode
npm start

# Online backend (separate terminal)
npm run backend
```

Pass & Play works without a backend. Online mode requires `EXPO_PUBLIC_BACKEND_URL` pointing at a running FastAPI server.

## Play on the web

Live build: [amulyavarshney.github.io/Realm-of-Shadows](https://amulyavarshney.github.io/Realm-of-Shadows/)

Pass & Play works in the browser. Online Host/Join needs a public HTTPS backend (`EXPO_PUBLIC_BACKEND_URL` secret for the Pages deploy workflow).

```bash
npm run export:web   # static site → dist/
npm run deploy       # publish dist/ to gh-pages (needs GitHub write access)
```

Or push to `main` — `.github/workflows/deploy-pages.yml` builds and deploys via GitHub Pages (Actions source).

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Expo dev server |
| `npm test` | Unit tests (game logic, config) |
| `npm run typecheck` | TypeScript check |
| `npm run backend` | FastAPI multiplayer server |
| `npm run export:web` | Static web export (`dist/`) |
| `npm run deploy` | Export + publish to `gh-pages` |
| `npm run build:production` | EAS Android AAB |
| `npm run submit:android` | Submit to Play internal track |

## Stack

Expo · React Native · TypeScript · Reanimated · FastAPI (online rooms + WebSocket)

## Production docs

- [Deploy & QA checklist](docs/DEPLOY.md)
- [Privacy policy (host at public URL for stores)](docs/PRIVACY.md)

## Environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_BACKEND_URL` | HTTPS base URL for online API (required for Host/Join) |

See `.env.example`.
