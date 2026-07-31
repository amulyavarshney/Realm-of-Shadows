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

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Expo dev server |
| `npm test` | Unit tests (game logic, config) |
| `npm run typecheck` | TypeScript check |
| `npm run backend` | FastAPI multiplayer server |
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
