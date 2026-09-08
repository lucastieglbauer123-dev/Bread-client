# Bread Client update log

This file records user-facing launcher updates. Add a dated entry here whenever a
new Bread Client update is committed.

## 2026-09-08

- Added a working Notifications control and notification-center popover with unread badges and dismiss actions.
- Rebranded the welcome screen, account prompts, errors, settings copy, hosting labels, and translated message values from Modrinth to Bread Client while preserving the existing API/auth identifiers and links.
- Removed the Modrinth+ upsell and Hosting promotional sidebar entry; account-gated social/profile features remain available under Bread Client branding.
- Disabled the advertising webview so ads cannot cover onboarding or launcher content.
- Kept multi-select pack installation deterministic: base mods merge once with selected packs, duplicate slugs resolve once, and the existing dependency resolver handles required dependencies.
- Added the Quality of Life pack (`AppleSkin`, `Jade`, `EMI`, `Mouse Tweaks`, `Shulker Box Tooltip`) and replaced the invalid PvP `hitindicator` slug with the verified `redhitindicator` project.
- Retained the Bread Client taskbar/window icon and the isolated Bread Client data directory.

### Build follow-up

- Fixed the Notifications handler to remain valid in the plain JavaScript Vue script block used by the launcher.

## 2026-09-08 — performance and startup

- Added a Performance settings tab with deferred startup-update control, saved Java path display plus manual re-scan, and scoped content-cache clearing.
- Startup now waits until the first paint before auth reachability, announcements, news, credentials, skin previews, and update checks; update checks are deferred by 3 seconds by default or about 10 seconds when disabled in Performance.
- Browse search renders stale cached Modrinth results while revalidating in the background, and Settings, Logs, Browse, project, and hosting routes are lazy-loaded.
- Added process-start and first-paint timing markers. The pre-change release executable reached a visible window in 5.4 seconds; the warm optimized dev run reported a 36.0-second first paint (including its debug webview/backend startup), so release timing should be re-measured after the final build.
