# AntWar GUI

## Visual UI system — v3.2.0

The GUI now uses the supplied game artwork as the single visual language. All root-level PNG artwork has been moved into the canonical `img/` directory; UI code resolves reusable assets through `img/` and the visual asset contract.

### Asset roles

- `list.png` — list/settings/team containers
- `box-white.png` / `box-white-brother.png` — cards and room/team panels
- `box-big.png` / `box-big-Brother.png` — large modal shells
- `Empty-button.png` — action buttons with text layered on top
- `disabled.png` / `enable.png` — checkbox/radio states and toggle indicators
- `Text BackgroundBox.png` — compact text fields, labels and value surfaces
- `frame.png` — player/avatar frames
- `frame-item.png` — item/reward frames
- `arrow-Menu.png` + `option-Menu.png` + `topbar-box.png` — dropdown controls
- `lock-list.png` / `lock-team.png` / `color-team.png` — room/team state controls
- `bg0.png`, `bg1.png`, `bg2.png`, `bg5.png` — scene backgrounds

### CSS structure

The legacy `style.css` remains the compatibility layer for the existing GUI. The new visual skin is isolated and organized under:

```text
css/ui/
├── tokens.css       # visual tokens and spacing
├── surfaces.css     # image-backed surfaces
├── controls.css     # buttons, settings, dropdowns, forms, room/reward cards
└── responsive.css   # mobile/reduced-motion rules
```

`js/ui/visual-assets.js` loads the skin, applies the image-backed checkbox/radio system, repairs legacy root image references at runtime, and exposes the canonical asset map as `window.AntWarVisualAssets`.

### Release version

`js/core/app-version.js` is the source of truth for the GUI release version. Current release: **v3.2.0**.

Arabic is the default language in `language/language.json`, while Arabic and English translation files remain available.
