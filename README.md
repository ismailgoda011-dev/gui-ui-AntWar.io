# AntWar — PixiJS UI

## v2.0.0

AntWar is rebuilt as a clean PixiJS application. The visible interface is rendered by PixiJS 8.20.0 with a single render tree instead of the previous HTML/CSS modal stack.

### Architecture

```text
src/
├── main.js        # Pixi Application, HUD and runtime
├── screens.js     # Home, profile, inventory, shop, rank, chat, settings, rewards
├── components.js  # reusable Pixi panels, buttons, progress bars and item cards
├── theme.js       # orange-first game theme
├── data.js        # content loading
└── state.js       # runtime state
```

### Modern PixiJS stack

- PixiJS 8.20.0
- Async `Application.init()`
- Automatic high-DPI rendering and viewport resize
- Federated pointer events for mouse/touch interaction
- `Assets` for texture loading
- `Graphics` and `Text` primitives for game UI
- Canvas-wide responsive scaling
- Ambient particles and lightweight motion
- One Pixi render tree for HUD, navigation, windows and feedback

### Cleanup

The legacy HTML/CSS GUI, Tailwind configuration, old GUI bridge, legacy script, old UI CSS tree, and compatibility visual runtime are removed from the active project tree. The old image collection is also removed from the project except for the previously approved `frame-item.png`, which is now loaded as a real PixiJS texture inside inventory item cards.

### Run

```bash
npm install
npm run dev
```

For production:

```bash
npm run build
npm run preview
```
