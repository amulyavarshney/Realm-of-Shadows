# Privacy Policy — Realm of Shadows

**Last updated:** 2026-07-31

Realm of Shadows is a fantasy hidden-role party game. This policy describes what data the app handles for Pass & Play (local) and online multiplayer modes.

## Summary

- No user accounts, email collection, or advertising SDKs
- Pass & Play data stays on your device
- Online mode sends display names and game-room traffic to the game server you configure
- We do not sell personal data

## Data stored on your device

The app may store locally (via device storage):

- App preferences (sound, haptics, advanced roles default)
- Pass & Play game history (“Chronicles”)
- Your chosen display name for online play (session use)

This data is not uploaded unless you use online multiplayer.

## Online multiplayer

When you host or join an online game, the app connects to a **central game server** (configured by the app publisher via `EXPO_PUBLIC_BACKEND_URL`). Over that connection we transmit:

- Your display name
- Room codes and lobby/game events needed to run the session
- WebSocket messages during active play

Room data on the server is **temporary** (rooms expire after about one hour of inactivity). We do not operate persistent player profiles or cross-session matchmaking in v1.0.

The server operator (see Contact) is responsible for securing and operating that backend in production.

## Data we do not collect

- No analytics or crash-reporting SDKs in the current build
- No camera or photo library access (no QR join in v1.0)
- No precise location
- No contacts or address book
- No payment or billing data in-app

## Third parties

- **Hero artwork** may load from a public image CDN (Pexels) for menu visuals only; no personal data is sent with that request.
- **Google Play / Apple App Store** may collect standard store telemetry according to their policies when you install or update the app.

## Children

Realm of Shadows is a social party game intended for teens and adults in group settings. We do not knowingly collect personal information from children under 13.

## Security

Online traffic should use HTTPS/WSS in production. Pass & Play mode works fully offline.

## Your choices

- Use Pass & Play only to avoid sending data to any server
- Clear Chronicles and app data from Settings or by uninstalling the app
- Do not use online mode if you do not agree to sending your display name to the game server

## Changes

We may update this policy when features change (e.g., analytics, accounts). The “Last updated” date will change accordingly.

## Contact

For privacy questions, contact the app publisher listed on Google Play or the App Store listing.

---

**Store requirement:** Host this document at a public HTTPS URL and link it from your Play Console / App Store Connect listing before production launch.
