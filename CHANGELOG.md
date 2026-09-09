# Bread Client changelog

## 2026-09-09

- Fixed CurseForge mod searches by allowing the frontend's authenticated API requests through the Tauri HTTP capability and CSP.
- Replaced the inactive Downloads and Files sidebar entries with Recent Activity and Crash Reports views.
- Crash report links now open the matching instance log directly.
- Added the purple flame theme for KJ and a switch for showing the original launcher themes.
- Added an instance Settings → Import tab with local .mrpack preview and import choices.

## 2026-09-08

- Added a working Notifications control with unread badges and dismiss actions.
- Rebranded onboarding, account prompts, errors, and settings copy to Bread Client.
- Removed promotional upsells and disabled advertising webviews.
- Added multi-select Bread packs, a Quality of Life pack, and deterministic duplicate handling.
- Added the Performance settings tab with deferred startup checks, Java path reuse, and cache clearing.
- Added a Modrinth / CurseForge source switch for Fabric mod browsing and installs.
- Kept the Bread Client taskbar icon and isolated Bread Client data directory.

## 2026-09-08 — polish

- Fixed content-install headers being clipped in the install modal.
- Constrained library instance cards to a stable responsive grid.
- Made Notifications and Performance launch-behavior controls keyboard and pointer accessible.
- Bread pack installs now continue after individual lookup, compatibility, download, or install failures; skipped slugs and reasons are shown in a persistent notification.
- Pack resolution falls back to an exact compatible CurseForge Fabric file when Modrinth has no usable project or version.
- Hardened the shell, modal rows, tabs, and responsive grids against clipping and pointer-event regressions.
