# Bread Client changelog

## 2026-09-09

- Fixed CurseForge mod searches by allowing the frontend's authenticated API requests through the Tauri HTTP capability and CSP.
- New instances can optionally share a Bread-managed resource-pack folder; existing instances remain isolated.
- Updated the purple theme label with its custom description for csm.
- Polished the shared resource-pack option so its opt-in state is clear in the new-instance flow.
- Replaced the inactive Downloads and Files sidebar entries with Recent Activity and Crash Reports views.
- Crash report links now open the matching instance log directly.
- Added the purple flame theme for KJ and a switch for showing the original launcher themes.
- Added an instance Settings → Import tab with local .mrpack preview and import choices.
- Added a one-click icon-only Quick start row to the Play page.
- Added local launcher statistics for total playtime, most-played instance, and installed mods.
- Notifications now open in a fixed overlay with a backdrop and Escape-to-close behavior.
- Added smooth route transitions and an optional original-layout fallback in Behavior settings.
- Added local custom theme imports for background images and JSON palettes.
- Hardened merged pack installs so the same CurseForge project is never downloaded twice.
- Discord Rich Presence now uses Bread Client identity with idle, launching, and timed playing states.
- Verified the Windows taskbar icon points at the Bread icon set in `apps/app/icons/icon.ico`.

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
- Refreshed the Bread loaf mark across the Windows icon set and added a standalone 1024px PNG export.
