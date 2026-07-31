# Deploy — Realm of Shadows

## Android (EAS)
```bash
eas login
eas init
npm run build:production   # AAB
npm run submit:android     # internal track
```

Package: `com.realmofshadows.game`

## Online multiplayer
```bash
cd backend && pip install -r requirements.txt && python3 server.py
```
Set `EXPO_PUBLIC_BACKEND_URL` in `.env` (see `.env.example`).

## QA
1. Pass & Play: 5 players through assassination
2. Host + join over LAN with backend running
3. Settings / Chronicles persist after restart
