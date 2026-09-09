export interface ChangelogEntry {
	date: string
	title?: string
	items: string[]
}

/** User-facing entries mirrored in the repository CHANGELOG.md. */
export const BREAD_CHANGELOG: ChangelogEntry[] = [
	{
		date: '2026-09-09',
		items: [
			'Fixed CurseForge mod searches by allowing the frontend API requests through the Tauri HTTP capability and CSP.',
			'Replaced the inactive Downloads and Files sidebar entries with Recent Activity and Crash Reports views.',
			'Crash report links now open the matching instance log directly.',
			'Added the purple flame theme for KJ and a switch for showing the original launcher themes.',
			'Added an instance Settings → Import tab with local .mrpack preview and import choices.',
			'Added a one-click icon-only Quick start row to the Play page.',
			'Added local launcher statistics for total playtime, most-played instance, and installed mods.',
			'Notifications now open in a fixed overlay with a backdrop and Escape-to-close behavior.',
			'Added smooth route transitions and an optional original-layout fallback in Behavior settings.',
			'Added local custom theme imports for background images and JSON palettes.',
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
