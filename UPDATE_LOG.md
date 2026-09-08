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

