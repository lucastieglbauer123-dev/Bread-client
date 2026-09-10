export interface ChangelogEntry {
	date: string
	title?: string
	items: string[]
}

/** User-facing entries mirrored in the repository CHANGELOG.md. */
export const BREAD_CHANGELOG: ChangelogEntry[] = [
	{
		date: '2026-09-10',
		items: [
			'Added Breadbound, a larger verified Fabric pack for performance, shaders, navigation, and quality-of-life tools.',
			'Existing Minecraft installations now refresh their Bread title artwork when the logo assets are updated.',
			'Rebuilt the launcher workspace around a framed Bread dashboard with distinct discovery, wardrobe, activity, instance, and settings surfaces.',
			'Introduced a framed Bread workspace shell with animated route transitions and recovery after failed async navigation.',
			'Navigation failures now keep the last working screen interactive and offer an in-place retry instead of leaving a blank GUI.',
			'Fixed rapid navigation from Skin Selector to Crash Reports so stale loading events cannot blank or unlock the new screen.',
			'Crash report discovery now reads metadata-only logs, tolerates unsupported files, and recognizes crash filenames reliably.',
			'Skin Selector now paints its layout immediately and loads skins, capes, and account data in the background.',
			'Added Bread Deluxe, a heavier 15-mod 26.2 Fabric pack with travel, maps, automation, inventory tools, shaders, and performance polish.',
			'Replaced the CSS-scaled header mark and stretched Minecraft title artwork with crisp, correctly sized Bread logo assets.',
		],
	},
	{
		date: '2026-09-09',
		items: [
			'Launcher stats now combine recent and submitted playtime and count installed Fabric mods from content metadata.',
			'Removed the Profile and Social settings tabs; Minecraft account login remains the single account surface until a Bread account service exists.',
			'Crash reports now read logs without clearing them, isolate per-instance failures, and show a friendly empty state.',
			'Fixed the recurring giant library card by constraining the card media and grid tracks at their layout boundary.',
			'Reworked the launcher shell into labelled Workspace, Tools, and Utilities navigation groups with animated active states and route transitions.',
			'Added animated, responsive card entry and focus treatment to the Bread library workspace.',
			'New Minecraft title screen.',
			'Added a BreadClient wordmark to the Minecraft title logo and replaced vanilla splash text with Bread Client messages.',
			'Added a clearly labelled Classic layout toggle to Settings → Appearance for switching between the new workspace and the compact layout.',
			'Confirmed the standalone Bread logo export is available as a 1024 × 1024 PNG.',
			'Kept the executable package metadata MSI-safe while the bundle version remains sourced from the Bread Client package.',
			'Consolidated Bread sign-in to the onboarding action; the sidebar account card remains the single Minecraft account control.',
			'Fixed the KJ purple flame theme so its animated flame wash renders above the launcher shell while preserving the Standard, Bread, csm purple, and Amber palettes.',
			'Fixed KJ theme persistence so selecting Purple flame can be saved and restored across launches.',
			'Fixed the KJ theme save path so the frontend purple-flame identifier is accepted by the settings API.',
			'Fixed KJ theme restoration on relaunch by keeping the purple-flame wire name consistent between Rust and the frontend.',
			'Updated the title-screen injector to refresh existing Minecraft jars when Bread artwork changes, so the BreadClient wordmark reaches already-installed instances.',
			'Added a new Play dashboard layout with a featured instance, quick actions, library board, and activity rail; the original grouped layout remains selectable in Behavior settings.',
			'Fixed CurseForge mod searches by allowing the frontend API requests through the Tauri HTTP capability and CSP.',
			'New instances can optionally share a Bread-managed resource-pack folder; existing instances remain isolated.',
			'Updated the purple theme label with its custom description for csm.',
			'Polished the shared resource-pack option so its opt-in state is clear in the new-instance flow.',
			'Replaced the inactive Downloads and Files sidebar entries with Recent Activity and Crash Reports views.',
			'Crash report links now open the matching instance log directly.',
			'Added the purple flame theme for KJ and a switch for showing the original launcher themes.',
			'Added an instance Settings → Import tab with local .mrpack preview and import choices.',
			'Added a one-click icon-only Quick start row to the Play page.',
			'Added local launcher statistics for total playtime, most-played instance, and installed mods.',
			'Notifications now open in a fixed overlay with a backdrop and Escape-to-close behavior.',
			'Added smooth route transitions and an optional Classic layout fallback in Settings → Appearance.',
			'Added local custom theme imports for background images and JSON palettes.',
			'Hardened merged pack installs so the same CurseForge project is never downloaded twice.',
			'Discord Rich Presence now uses Bread Client identity with idle, launching, and timed playing states.',
			'Verified the Windows taskbar icon points at the Bread icon set.',
			'Refreshed the Bread loaf mark across the Windows icon set and added a standalone 1024px PNG export.',
		],
	},
	{
		date: '2026-09-08',
		items: [
			'Added a working Notifications control with unread badges and dismiss actions.',
			'Rebranded onboarding, account prompts, errors, and settings copy to Bread Client.',
			'Removed promotional upsells and disabled advertising webviews.',
			'Added multi-select Bread packs, a Quality of Life pack, and deterministic duplicate handling.',
			'Added the Performance settings tab with deferred startup checks, Java path reuse, and cache clearing.',
			'Added a Modrinth / CurseForge source switch for Fabric mod browsing and installs.',
			'Kept the Bread Client taskbar icon and isolated Bread Client data directory.',
		],
	},
	{
		date: '2026-09-08',
		title: 'Polish',
		items: [
			'Fixed content-install headers being clipped in the install modal.',
			'Constrained library instance cards to a stable responsive grid.',
			'Made Notifications and Performance launch-behavior controls keyboard and pointer accessible.',
			'Bread pack installs continue after individual failures and report skipped slugs with reasons.',
			'Pack resolution falls back to an exact compatible CurseForge Fabric file when Modrinth has no usable result.',
			'Hardened the shell, modal rows, tabs, and responsive grids against clipping and pointer-event regressions.',
		],
	},
]
