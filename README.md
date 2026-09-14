# AntWar GUI

## Visual UI system — v1.1.0

The GUI uses the supplied game artwork as the visual language while keeping the window chrome clean and readable. Settings, dropdowns, chat, player profiles and modal surfaces are refined without changing the core navigation structure.

### UI improvements in v1.1

- Settings tabs are centered, larger and white for readability.
- Settings controls are grouped into clearer sections with stronger hierarchy and focus states.
- Settings dropdowns enforce a single visible menu, stable stacking, selection feedback and one visible arrow.
- Window top bars no longer use `topbar-box.png` as their background.
- Desktop chat follows a Discord-inspired slate/indigo visual system with clearer channel rhythm, message grouping, unread emphasis and local message sending.
- Player profile and player dossier surfaces now use stronger identity headers, stats, XP progress, status indicators and responsive cards.
- Shared player/member cards and semantic button classes create a more consistent visual system across the GUI.
- Shop, mailbox, rewards and inventory cards use consistent hover, spacing and elevation behavior.
- Empty/loading/error states and keyboard/focus states are defined for future and existing UI surfaces.
- Reduced-motion support is included for accessibility.
- Royal Pass has a runtime safety guard for the known `t is not a function` crash path.

### Asset roles

- `list.png` — list/settings/team containers
- `box-white.png` / `box-white-brother.png` — cards and room/team panels
- `box-big.png` / `box-big-Brother.png` — large modal shells
- `Empty-button.png` — action buttons with text layered on top
- `disabled.png` / `enable.png` — checkbox/radio states and toggle indicators
- `Text BackgroundBox.png` — compact text fields, labels and value surfaces
- `frame.png` — player/avatar frames
- `frame-item.png` — item/reward frames
- `arrow-Menu.png` + `option-Menu.png` — dropdown controls
- `lock-list.png` / `lock-team.png` / `color-team.png` — room/team state controls
- `bg0.png`, `bg1.png`, `bg2.png`, `bg5.png` — scene backgrounds

### CSS structure

The legacy `style.css` remains the compatibility layer. The reusable visual skin is organized under:

```text
css/ui/
├── tokens.css       # visual tokens and spacing
├── surfaces.css     # image-backed surfaces
├── controls.css     # buttons, settings, dropdowns, chat and profiles
├── ux-overhaul.css  # v1.1 visual system, profiles, chat, states and motion
└── responsive.css   # mobile/reduced-motion rules
```

`js/ui/visual-assets.js` loads the skin, repairs legacy asset references, applies the control skin, exposes the GUI version and installs runtime UI guards.

### Release version

`js/core/app-version.js` is the source of truth for the GUI release version. Current release: **v1.1.0**.

Arabic is the default language in `language/language.json`, while Arabic and English translation files remain available.
