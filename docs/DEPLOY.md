# Deploy — Realm of Shadows

Production checklist for Android (primary) and iOS. Package / bundle ID: `com.realmofshadows.game`.

## GitHub Pages (web)

Site: `https://amulyavarshney.github.io/Realm-of-Shadows/`

| Item | Detail |
|------|--------|
| Base path | `experiments.baseUrl` = `/Realm-of-Shadows` in `app.json` |
| Build | `npx expo export -p web` → `dist/` (+ `.nojekyll` for `_expo` assets) |
| CI | `.github/workflows/deploy-pages.yml` on push to `main` |
| Pages source | **GitHub Actions** (recommended) or branch `gh-pages` / root |

**One-time repo setup:** Settings → Pages → Source → **GitHub Actions**. Optional repo secret `EXPO_PUBLIC_BACKEND_URL` for online multiplayer in the web build.

**Manual publish (alternative):**

```bash
npm run deploy   # expo export + gh-pages --nojekyll -d dist
```

Then Settings → Pages → Deploy from branch → `gh-pages` / `/ (root)`.

## Prerequisites (manual)

| Step | Action |
|------|--------|
| EAS | `npm install -g eas-cli` → `eas login` → `eas init` (links real project ID into `app.json`) |
| Env | Copy `.env.example` → `.env`; set production backend URL |
| Play Console | Create app, internal testing track, service account JSON → `secrets/play-service-account.json` |
| Privacy URL | Host `docs/PRIVACY.md` at HTTPS; paste URL in Play Console → App content → Privacy policy |
| Backend | Deploy FastAPI server with HTTPS; set CORS to your domain before public launch |

Replace placeholder `"replace-with-eas-project-id"` in `app.json` → `expo.extra.eas.projectId` after `eas init`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | Online mode | HTTPS base URL, e.g. `https://api.example.com` (no trailing slash) |
| `PORT` | Backend | Server port (default `8000`) |
| `RELOAD` | Backend dev | Set `1` for uvicorn reload locally |

EAS builds: add `EXPO_PUBLIC_BACKEND_URL` in [EAS Environment Variables](https://docs.expo.dev/eas/environment-variables/) for `production` profile, or use `eas secret:create`.

**Verify locally**

```bash
cp .env.example .env
# Edit EXPO_PUBLIC_BACKEND_URL
npm start
# Host / Join screens should connect; if unset, app shows configuration message
curl "$EXPO_PUBLIC_BACKEND_URL/api/health"
```

## Backend (online multiplayer)

```bash
cd backend
pip install -r requirements.txt
python3 server.py
```

### Production backend notes

- **HTTPS required** for store builds (use reverse proxy: nginx, Caddy, cloud load balancer).
- **CORS:** `server.py` currently allows `*`. Before launch, restrict `allow_origins` to your app origin / domain.
- **Rate limiting:** Not built into v1 server. Put the API behind a reverse proxy or API gateway with rate limits (e.g., 30 req/min per IP on `/api/rooms`).
- **Room codes:** 4-digit numeric; rooms auto-purge after ~1 hour idle.
- **No auth:** Anyone with a room code can join — acceptable for friends-only MVP; add auth if exposing publicly.

## Android (EAS)

```bash
eas login
eas init                    # once — updates projectId
npm run build:preview       # internal APK for QA
npm run build:production    # AAB for Play Store
npm run submit:android      # internal track (needs service account)
```

### Android QA checklist

- [ ] Cold start: menu loads, hero image, no redbox
- [ ] Pass & Play: 5 players through full game including assassination
- [ ] Pass & Play: 7+ players — mission 4 needs two fails
- [ ] Settings toggles persist after force-quit
- [ ] Chronicles save and clear works
- [ ] **Online:** backend reachable; host creates room, join with code on second device
- [ ] **Online:** missing `EXPO_PUBLIC_BACKEND_URL` shows clear message (dev build without env)
- [ ] **Online:** wrong code → “Room not found”; timeout → friendly error
- [ ] Back navigation from all screens
- [ ] TalkBack: main buttons and settings switches have labels
- [ ] Release AAB installs on physical device (not just emulator)
- [ ] Privacy policy URL live in Play Console

### Play Console submission

1. App signing: use Play App Signing (recommended)
2. Store listing: screenshots (phone + tablet if supporting tablets)
3. Content rating questionnaire
4. Data safety form: declare display names + server traffic for online mode; no account/email
5. Upload AAB to internal → closed → production

## iOS (optional)

`eas.json` includes a `production` iOS profile. After Apple Developer enrollment:

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Update `app.json` → `ios.bundleIdentifier` if needed (currently `com.realmofshadows.game`).

## CI

GitHub Actions runs `npm test` and `npm run typecheck` on push/PR (see `.github/workflows/ci.yml`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Online buttons fail silently | Set `EXPO_PUBLIC_BACKEND_URL`; restart Metro |
| `eas build` fails | Run `eas init`; check Expo account owns project |
| WebSocket fails on device | Use LAN IP or deployed HTTPS URL, not `localhost` |
| Room not found | Server restarted (in-memory rooms); create new room |
