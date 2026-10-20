# ProMax project instructions

Keep the same ProMax theme across the desktop app, sharing dialogs, invitation website and visual library. The user's colors are **red and orange**. Use the warm dark surfaces, red branding, orange actions, typography, buttons and panel styling defined in `theme.css`.

`theme.css` is the source of truth. The visual gallery embeds it through `scripts/build-visuals.cjs`; the hosted sharing project uses an identical copy in its `app/theme.css`. Update both when changing the theme. Rebuild the visual gallery and preview the affected surfaces before publication.

Presentation backgrounds may use their own artistic palettes; their surrounding controls and library follow the shared ProMax theme.
