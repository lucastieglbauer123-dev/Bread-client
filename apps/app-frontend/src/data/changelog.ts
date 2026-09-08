export interface ChangelogEntry {
	date: string
	title?: string
	items: string[]
}

/** User-facing entries mirrored in the repository CHANGELOG.md. */
export const BREAD_CHANGELOG: ChangelogEntry[] = [
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
		],
	},
]
