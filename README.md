# AntWar — PixiJS UI

## v2.0.0

AntWar is now rebuilt around **PixiJS 8.20.0**, the current stable PixiJS release. The visible game interface is rendered through a single PixiJS application rather than HTML/CSS modal systems. citeturn123982search1turn770817search3

### Architecture

```text
src/
├── main.js        # Pixi application + HUD + runtime
├── screens.js     # Home, inventory, shop, profile, chat, settings, rewards...
├── components.js  # reusable Pixi buttons, panels, progress and item cards
├── theme.js       # orange-first visual system
├── data.js        # JSON data loading
└── state.js       # UI/game state
```

### PixiJS approach

- Async `Application.init()` with automatic resize and high-DPI rendering.
- Pixi federated pointer events for mouse/touch interactions.
- Pixi `Assets` for item-frame texture loading.
- Graphics/Text primitives for the majority of UI instead of image-backed panels.
- Responsive scaling driven by the canvas viewport.
- Animated ambient particles and lightweight motion.
- Single render tree for HUD, navigation, windows and feedback.

PixiJS v8 uses asynchronous application initialization and its unified event system for pointer/touch interaction. citeturn770817search3turn123982search0

### Cleanup

The previous HTML/CSS GUI stack, Tailwind configuration, legacy GUI bridge, legacy `script.js`, old UI CSS tree, and compatibility visual runtime are intentionally removed from the new source tree. Game data and language resources remain as content sources. The legacy artwork set is not part of the new GUI; the new UI is drawn by PixiJS, with the existing item frame retained as the only legacy decorative texture.

### Run

```bash
npm install
npm run dev
```

The project is a Vite application and can also be built with `npm run build`.
