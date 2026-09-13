# AntWar GUI — Production-Ready GUI Foundation

> Standalone GUI prototype for **AntWar.io**, designed to become the real game frontend later. The current work hardens the GUI runtime, visual system, state boundary, performance layer, security model and integration contract **without modifying the real AntWar game frontend**.

## Current status

- **GUI prototype:** active development
- **Real game frontend replacement:** intentionally deferred until GUI QA is complete
- **Integration strategy:** direct replacement, not an overlay/wrapper
- **Integration boundary:** `GameAdapter` + explicit game contract
- **Primary branch:** `v2-direct-game-integration`
- **PR:** Draft PR #1 — GUI hardening and integration foundation

---

## What was improved

### 1. Runtime architecture

The GUI now has a clearer runtime boundary:

```text
                         AntWar Game Engine
                                  │
                                  ▼
                         ┌────────────────┐
                         │   GameAdapter  │
                         │  Contract v2   │
                         └───────┬────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
             Game State       Events        Capabilities
                  │              │              │
                  └──────────────┼──────────────┘
                                 ▼
                          AntWar GUI Runtime
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
            HUD                Pages              Modals
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 ▼
                         Services / UI Registry
```

The real engine remains behind the adapter. GUI modules should not call `window.game` directly.

### 2. Explicit game contract

`js/game/game-contract.js` defines the integration contract and validates the engine before use.

Required engine operations:

```text
play
exitGame
```

Optional capabilities include:

```text
startSingleplayer
getState
getPlayer
getRoom
getMatch
on / off
joinRoom
leaveRoom
setReady
```

The adapter exposes a stable GUI-facing API and prevents the UI from becoming coupled to the internal engine implementation.

### 3. Reactive game state

`js/core/game-state.js` is the GUI state boundary for:

- connection
- session
- player
- room
- match
- UI state
- inventory-related state

The state layer is designed to accept snapshots/events from the future real engine without forcing page components to know the engine internals.

### 4. Central runtime

`js/core/runtime.js` is the application bootstrap for the integration layer.

Responsibilities:

- initialize the performance manager
- detect reduced-motion preference
- bind supported engine events
- synchronize engine snapshots into GUI state
- expose `window.AntWarRuntime`
- expose controlled start/exit operations
- prevent duplicate runtime initialization

### 5. Performance system

The GUI now has a central performance layer instead of every component deciding independently how much animation to run.

The performance system supports:

- device-aware quality levels
- reduced-motion mode
- low-performance mode
- visibility/background throttling
- effect budget control
- animation reduction
- particle/effect disabling when appropriate

The target is a stable UI on both desktop and weaker mobile devices.

### 6. Animation hardening

`js/animations.js` now:

- respects reduced motion
- avoids expensive animation while the document is hidden
- kills existing GSAP tweens before starting new ones
- uses `overwrite` to prevent animation accumulation
- clears `will-change`
- uses shorter, cheaper transitions
- exposes animation cancellation

This prevents a common source of long-session UI degradation.

### 7. Safe DOM layer

`js/core/dom.js` provides safe primitives for runtime UI creation:

- `el()`
- `setText()`
- `clear()`
- `safeUrl()`
- `safeAssetUrl()`
- `button()`

Untrusted game/backend/user values should be inserted through text/attributes rather than HTML interpolation.

### 8. Data-driven UI registry

`js/ui-registry.js` remains the single renderer for navigation-related registry data but is now hardened.

It validates the registry shape and uses DOM construction instead of interpolating registry values into HTML.

Registry responsibilities include:

- mobile navigation
- header actions
- events
- server selection
- daily rewards
- daily quests
- Royal Pass tabs

### 9. Asset loading improvements

Registry-generated images use lazy loading and asynchronous decoding where appropriate.

Asset URLs are normalized through the asset resolver, while unsafe schemes such as `javascript:` and `data:` are rejected by the safe asset helpers.

The canonical runtime asset directory remains:

```text
img/
```

### 10. Modal / toast / navigation foundation

The GUI contains dedicated manager foundations for:

```text
js/ui/modal-manager.js
js/ui/toast-manager.js
js/ui/navigation-manager.js
```

These establish lifecycle boundaries so UI state can progressively move out of the legacy orchestration layer without changing the visual product in one destructive rewrite.

### 11. Persistent settings

`js/core/storage.js` provides a versioned storage boundary so UI preferences can be migrated instead of being permanently tied to raw `localStorage` keys.

### 12. Accessibility foundation

The GUI now has foundations for:

- keyboard navigation
- explicit button types
- ARIA labels
- reduced-motion support
- focus-friendly controls
- mobile safe-area handling
- predictable modal/page lifecycle

Full WCAG review is still part of final visual QA.

---

## Current source structure

```text
.
├── index.html
├── script.js
├── fullpages.js
├── style.css
├── tailwind.min.css
├── data/
│   └── nav-items.json
├── language/
│   ├── ar/translation.json
│   └── en/translation.json
├── img/
│   └── ... GUI artwork
└── js/
    ├── audio.js
    ├── animations.js
    ├── fullpages.js
    ├── i18n.js
    ├── loader.js
    ├── ui-registry.js
    ├── core/
    │   ├── dom.js
    │   ├── event-bus.js
    │   ├── game-state.js
    │   ├── performance-manager.js
    │   ├── performance.js
    │   ├── performance.css
    │   ├── runtime.js
    │   └── storage.js
    ├── game/
    │   ├── game-adapter.js
    │   └── game-contract.js
    ├── services/
    │   └── api-client.js
    └── ui/
        ├── modal-manager.js
        ├── navigation-manager.js
        └── toast-manager.js
```

### Legacy orchestration files

`script.js` and `fullpages.js` are still the largest orchestration modules. They remain functional while the new managers are introduced around them.

They are now the next major refactor target:

```text
script.js
   ├── bootstrap
   ├── modal templates
   ├── HUD events
   ├── audio hooks
   ├── effects
   └── page actions

fullpages.js
   ├── page routing
   ├── shop
   ├── wardrobe
   ├── profile
   ├── chat
   ├── leaderboard
   └── mobile navigation
```

The goal is to extract these responsibilities into focused modules while keeping the existing UI contract stable.

---

## Localization

Visible text should come from:

```text
language/ar/translation.json
language/en/translation.json
```

Use translation keys such as:

```text
labelKey
titleKey
nameKey
descriptionKey
statsKey
dayKey
```

Dynamic UI should call:

```js
t(key, variables)
```

Do not add language-specific strings to navigation/config data unless the value is genuinely non-translatable metadata.

---

## Security model

The GUI is treated as an untrusted rendering environment for backend/game data.

Rules:

1. Do not inject player names, room names, chat messages or backend strings into `innerHTML`.
2. Prefer `textContent` and DOM construction.
3. Validate registry/config structures before rendering.
4. Reject unsafe asset URL schemes.
5. Keep API access behind `js/services/api-client.js` and the game adapter.
6. Never ship secrets, private API keys or server credentials in the GUI.
7. Treat WebSocket messages as untrusted input.
8. Sanitize or text-render chat content.
9. Add a production CSP before shipping.
10. Do not expose debug-only engine controls in production.

---

## Performance rules

The GUI should preserve a clear performance budget.

### High quality

- desktop visual effects
- particles
- subtle parallax
- normal transitions

### Medium quality

- reduced particle count
- shorter transitions
- reduced blur/glow

### Low quality

- disable nonessential particles
- disable expensive parallax
- reduce animation
- avoid continuous canvas work

### Reduced motion

When `prefers-reduced-motion: reduce` is active, decorative animation must be reduced or disabled.

### Background tab

Animation should not continue consuming full resources while the document is hidden.

---

## Real game integration

The final GUI is intended to directly replace the old AntWar frontend.

It is **not** intended to run as an overlay on top of the old UI.

Before integration, the real game should expose a compatible engine boundary:

```js
window.game
```

The GUI communicates through:

```js
window.AntWarGameAdapter
```

and not through direct engine calls from page components.

### Engine events

The integration layer recognizes:

```text
state:changed
player:changed
room:changed
match:changed
connection:changed
game:started
game:ended
game:error
```

The final production event contract must be verified against the actual AntWar engine source before merging the GUI into the game.

---

## Visual system

The GUI uses a fantasy/RPG visual language built around:

- wood/leaf framed panels
- gold progression accents
- dark game-space backgrounds
- strong character/item silhouettes
- tactile buttons
- responsive HUD
- modal-driven secondary screens

The next visual QA pass should specifically verify:

- typography hierarchy
- excessive glow/border usage
- button consistency
- spacing rhythm
- modal scaling
- small-screen readability
- touch targets
- card density
- icon consistency
- loading/error/empty states
- landscape mobile behavior

---

## Asset contract

Canonical directory:

```text
img/
```

The supplied source previously referenced artwork that was not included in the source package. The GUI must not fabricate production artwork silently.

Before final integration:

1. restore all real artwork
2. verify every referenced asset
3. remove obsolete assets
4. compress large images
5. use modern formats where safe
6. lazy-load noncritical images
7. preload only genuinely critical assets

---

## QA checklist before real frontend replacement

### Functional

- [ ] Home screen
- [ ] Play flow
- [ ] Room creation
- [ ] Room lobby
- [ ] Server selector
- [ ] Shop
- [ ] Wardrobe
- [ ] Inventory/bag
- [ ] Profile
- [ ] Chat
- [ ] Leaderboard
- [ ] Daily rewards
- [ ] Daily quests
- [ ] Royal Pass
- [ ] Settings
- [ ] Language switching
- [ ] Audio settings

### Responsive

- [ ] Desktop 1920×1080
- [ ] Desktop 1366×768
- [ ] Laptop 1280×720
- [ ] Tablet portrait
- [ ] Tablet landscape
- [ ] Mobile portrait
- [ ] Mobile landscape
- [ ] Browser safe-area / notch

### Performance

- [ ] High quality mode
- [ ] Medium quality mode
- [ ] Low quality mode
- [ ] Reduced motion
- [ ] Background tab throttling
- [ ] Long-session memory test
- [ ] Animation accumulation test
- [ ] Large chat/list test

### Security

- [ ] Registry injection test
- [ ] Chat HTML injection test
- [ ] URL scheme validation
- [ ] Backend error rendering
- [ ] WebSocket payload validation
- [ ] Production CSP
- [ ] No secrets in bundle

### Integration

- [ ] Real engine contract
- [ ] Player state synchronization
- [ ] Room synchronization
- [ ] Match synchronization
- [ ] Connection state
- [ ] Engine error handling
- [ ] Start/exit lifecycle
- [ ] Real-time events

---

## Development principles

### Keep UI independent

A page should ask for state/capabilities instead of reaching into the game engine.

### Keep data separate

Mock/demo data belongs in data/providers, not inside UI event handlers.

### Keep rendering safe

Use DOM APIs for dynamic values.

### Keep effects optional

Gameplay information must remain usable when visual effects are disabled.

### Keep the integration reversible

The GUI should be testable without the real engine and should not require the real game just to render the interface.

---

## Final integration sequence

The intended order is:

```text
1. GUI architecture hardening
        ↓
2. Visual/design QA
        ↓
3. script.js extraction
        ↓
4. fullpages.js extraction
        ↓
5. responsive/mobile QA
        ↓
6. performance/load testing
        ↓
7. security/CSP review
        ↓
8. real engine contract verification
        ↓
9. real provider/WebSocket integration
        ↓
10. direct replacement of old AntWar frontend
```

The old frontend is deliberately kept out of this stage.

---

## Important rule

**Do not merge this GUI into the real AntWar frontend until the complete GUI QA checklist passes.**

The purpose of this repository is to make the GUI stable, fast, secure, responsive and integration-ready first.
