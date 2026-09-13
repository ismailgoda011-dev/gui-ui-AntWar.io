# AntWar GUI — Architecture & Integration Guide

## Purpose

This project is a standalone GUI layer intended to be mounted later on the real AntWar game. The GUI is deliberately separated from the game engine so the visual layer can be tested independently and the real game can replace the mock data/providers later.

## Architecture

```text
AntWar Game Engine
        │
        ▼
GameAdapter / GUI Bridge
        │
        ├── Game Events
        ├── Game State
        └── API Client
                │
                ▼
          GUI Application
        ┌───────┼────────┐
       HUD    Lobby    Pages
                │
        ┌───────┼─────────────┐
      Shop   Inventory   Profile/Chat
```

### Core modules

- `js/core/event-bus.js` — application/game event bus.
- `js/core/game-state.js` — small reactive state container for connection, session, player, room and UI state.
- `js/game/game-adapter.js` — stable contract for the future real AntWar engine.
- `js/services/api-client.js` — centralized HTTP boundary for the future backend.
- `js/ui-registry.js` — data-driven GUI registry and asset path resolver.
- `js/i18n.js` — Arabic/English translation engine.
- `js/audio.js` — centralized sound manager.
- `js/loader.js` — asset preloader with failure diagnostics.
- `js/fullpages.js` — full-page GUI views.
- `script.js` — current GUI orchestration and legacy modal implementations; it is the next candidate for further component extraction.

## Single source of truth for navigation/events

`data/nav-items.json` is now the authoritative registry for:

- Mobile bottom navigation.
- Header quick actions.
- Daily events.
- Server options.
- Daily login rewards.
- Daily quests.
- Royal Pass tabs.

The daily login reward cards are no longer hard-coded as an array inside `script.js`. Replace the records in `data/nav-items.json` with the real game records later and the same renderer will consume them.

## Localization contract

Visible UI labels should use translation keys from:

- `language/ar/translation.json`
- `language/en/translation.json`

Configuration files should reference keys such as `labelKey`, `titleKey`, `nameKey`, `descriptionKey`, `statsKey`, `dayKey`, etc., instead of storing language-specific labels.

Dynamic UI should call `t(key, variables)` rather than embedding Arabic/English display strings.

## Image asset contract

All runtime image URLs are normalized to:

```text
img/<filename>
```

The canonical asset directory is `img/`.

The supplied source ZIP did not include the referenced PNG/GIF artwork files, so this update does not fabricate replacement artwork. The missing artwork should be copied into `img/` from the original GUI/game asset package before visual QA.

Small generic SVG item icons generated for the GUI demo are stored in `img/icons/`.

## Real game integration

The bridge is intentionally dormant in standalone mode. Enable it from the real game integration layer with:

```js
window.ANTWAR_GAME_ENGINE = true;
```

The real game should expose a compatible `window.game` object, while the GUI talks to `window.AntWarGameAdapter` instead of calling the engine directly.

Expected engine contract:

```text
play(null, options)
startSingleplayer(isTutorial, isSandbox)
exitGame()
```

The adapter emits stable GUI events such as:

```text
 game:started
 game:ended
 game:error
 state:changed
```

The exact production event contract should be finalized when the real AntWar source is connected.

## Security rules

- Do not inject player names, room names, chat messages or backend strings directly into `innerHTML`.
- Use `textContent` / DOM construction for untrusted values.
- Treat backend responses as untrusted input.
- Keep API access inside the API client/adapter boundary.
- Never put secrets or API keys in the GUI bundle.

## Production rules

Before shipping the GUI inside the real game:

1. Provide all required artwork under `img/`.
2. Replace demo/mock player, room and inventory data with real providers.
3. Finalize the WebSocket/real-time event contract.
4. Build the GUI assets locally rather than depending on development CDNs where possible.
5. Run the GUI with a production CSP and remove development-only diagnostics.
6. Continue extracting the remaining large `script.js` and `fullpages.js` modules into focused components.
