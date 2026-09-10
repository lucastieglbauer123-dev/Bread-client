import type { Labrinth } from '@modrinth/api-client'
import { getLatestMatchingInstallVersion } from '@modrinth/ui'

import packDefinitions from '@/data/bread-packs.json'
import { get_project, get_version_many } from '@/helpers/cache.js'
import {
	getCurseForgeDownloadUrl,
	getCurseForgeLatestFile,
	installCurseForgeMod,
	searchCurseForgeMods,
} from '@/helpers/curseforge'
import {
	install_project_with_dependencies,
	type ResolveContentPlan,
} from '@/helpers/instance'

export interface BreadPackDefinition {
	id: string
	name: string
	description: string
	slugs: string[]
}

export interface BreadPackOption extends BreadPackDefinition {
	modReasons: Record<string, string>
}

/**
 * These mods are part of the Bread experience for every selectable pack. They
 * are kept separate from the pack registry so a multi-pack selection can merge
 * them once alongside the selected pack slugs.
 */
export const BREAD_BASE_MODS = [
	'modmenu',
	'ok-zoomer',
	'chat-heads',
	'chatanimation',
	'modernfix',
] as const

export const BREAD_BASE_MOD_REASONS: Record<string, string> = {
	modmenu: 'Browse installed mods and open their configuration screens in-game.',
	'ok-zoomer': 'A lightweight, configurable zoom with smooth transitions.',
	'chat-heads': 'Shows the sender’s head beside each chat message.',
	chatanimation: 'Adds a smooth entrance animation to chat messages.',
	modernfix: 'Improves performance, memory use, and fixes common Minecraft bugs.',
}

const modReasons: Record<string, string> = {
	sodium: 'High-performance rendering engine.',
	lithium: 'Optimizes game logic without changing vanilla mechanics.',
	'ferrite-core': 'Reduces memory use, especially in larger instances.',
	modmenu: 'Quick in-game access to installed mod settings.',
	iris: 'Loads modern shader packs on Fabric.',
	entityculling: 'Skips entities and block entities hidden behind walls.',
	lambdynamiclights: 'Adds dynamic light from held and dropped light sources.',
	continuity: 'Adds connected and emissive resource-pack textures.',
	dynamiccrosshair: 'Changes the crosshair based on the block or entity under it.',
	redhitindicator: 'Shows a clear hit marker below the crosshair when you damage an enemy.',
	'ping-display': 'Shows numerical player ping in the tab list.',
	appleskin: 'Adds food values and saturation previews to the HUD.',
	jade: 'Shows useful information about the block or entity you are looking at.',
	emi: 'Provides a fast, searchable item and recipe viewer.',
	'mouse-tweaks': 'Makes moving and sorting inventory items quicker and easier.',
	shulkerboxtooltip: 'Previews shulker box contents directly in your inventory.',
	waystones: 'Adds craftable waystones and scrolls for survival-friendly travel.',
	'xaeros-minimap': 'Adds a detailed minimap with entities, terrain, and waypoints.',
	'xaeros-world-map': 'Adds a full-screen map of explored terrain and dimensions.',
	'create-fly': 'Brings Create-style automation content to newer Fabric releases.',
	'inventory-profiles-next': 'Sorts inventories, moves matching items, and manages gear sets.',
}

export const BREAD_PACKS: BreadPackDefinition[] = packDefinitions

export const BREAD_PACK_OPTIONS: BreadPackOption[] = BREAD_PACKS.map((pack) => ({
	...pack,
	modReasons,
}))

export function getBreadPack(id: string | null | undefined): BreadPackDefinition | undefined {
	return id ? BREAD_PACKS.find((pack) => pack.id === id) : undefined
}

/**
 * Returns the base mods followed by every selected pack's mods, preserving
 * registry order while removing duplicate project slugs before any API lookup.
 */
export function mergeBreadPackSlugs(packIds: readonly string[]): string[] {
	const slugs = [...BREAD_BASE_MODS]
	for (const packId of packIds) {
		const pack = getBreadPack(packId)
		if (pack) slugs.push(...pack.slugs)
	}
	return [...new Set(slugs)]
}

export interface BreadPackInstallResult {
	pack: BreadPackDefinition
	packs: BreadPackDefinition[]
	slugs: string[]
	installed: string[]
	skipped: BreadPackSkippedMod[]
	plans: ResolveContentPlan[]
}

export interface BreadPackSkippedMod {
	slug: string
	reason: string
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function normalizeSlug(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function resolveCurseForgeMod(slug: string, gameVersion: string) {
	const result = await searchCurseForgeMods(`?query=${encodeURIComponent(slug)}`, gameVersion)
	const normalized = normalizeSlug(slug)
	const match = result.hits.find(
		(hit) => normalizeSlug(hit.slug) === normalized || normalizeSlug(hit.name) === normalized,
	)
	if (!match) throw new Error(`No exact CurseForge project match for '${slug}'.`)
	const file = await getCurseForgeLatestFile(match.curseforge_id, gameVersion)
	const downloadUrl = await getCurseForgeDownloadUrl(match.curseforge_id, file.id)
	return { slug, modId: match.curseforge_id, fileId: file.id, downloadUrl }
}

/**
 * Resolves each pack slug through Modrinth (with an exact CurseForge fallback) immediately before
 * install, then lets the existing instance resolver install Modrinth versions and their
 * dependencies. No jars or version IDs are stored in the Bread pack registry.
 */
export async function installBreadPack(
	instanceId: string,
	packIds: string | readonly string[],
	gameVersion: string,
	loader: string,
): Promise<BreadPackInstallResult> {
	const selectedIds = [...new Set(typeof packIds === 'string' ? [packIds] : packIds)]
	const packs = selectedIds.map((packId) => {
		const pack = getBreadPack(packId)
		if (!pack) throw new Error(`Unknown Bread pack: '${packId}'`)
		return pack
	})
	if (packs.length === 0) throw new Error('Select at least one Bread pack before installing.')
	if (loader !== 'fabric') {
		throw new Error(
			`${packs.map((pack) => pack.name).join(' + ')} is currently available for Fabric instances only.`,
		)
	}
	const slugs = mergeBreadPackSlugs(selectedIds)

	const skipped: BreadPackSkippedMod[] = []
	const projects: { slug: string; project: Labrinth.Projects.v2.Project }[] = []
	const curseForgeResolved: {
		slug: string
		modId: number
		fileId: number
		downloadUrl: string
	}[] = []
	const curseForgeIds = new Set<number>()
	const addCurseForgeResolved = (resolvedMod: (typeof curseForgeResolved)[number]) => {
		if (curseForgeIds.has(resolvedMod.modId)) return
		curseForgeIds.add(resolvedMod.modId)
		curseForgeResolved.push(resolvedMod)
	}
	for (const slug of slugs) {
		try {
			const project = (await get_project(slug, 'must_revalidate')) as Labrinth.Projects.v2.Project
			if (!project?.id) throw new Error(`Community project not found for '${slug}'.`)
			projects.push({ slug, project })
			continue
		} catch (error) {
			try {
				addCurseForgeResolved(await resolveCurseForgeMod(slug, gameVersion))
			} catch (curseForgeError) {
				skipped.push({
					slug,
					reason: `Modrinth: ${errorMessage(error)} CurseForge: ${errorMessage(curseForgeError)}`,
				})
			}
		}
	}
	// A slug can be listed by more than one pack (or resolve through an alias);
	// keep one project entry so it is version-resolved/installed once while
	// preserving the merged slug order for deterministic installs.
	const projectsById = new Map<string, { slug: string; project: Labrinth.Projects.v2.Project }>()
	for (const project of projects) {
		if (!projectsById.has(project.project.id)) projectsById.set(project.project.id, project)
	}

	const resolved: {
		slug: string
		project: Labrinth.Projects.v2.Project
		version: Labrinth.Versions.v2.Version
	}[] = []
	for (const { slug, project } of projectsById.values()) {
		try {
			const versions = (await get_version_many(
				project.versions,
				'must_revalidate',
			)) as Labrinth.Versions.v2.Version[]
			const version = getLatestMatchingInstallVersion(versions, {
				gameVersions: [gameVersion],
				loaders: [loader],
			})
			if (!version) {
				throw new Error(
					`No Fabric ${gameVersion} version is available for '${slug}'. Update the instance version or try again later.`,
				)
			}
			resolved.push({ slug, project, version })
		} catch (error) {
			try {
				addCurseForgeResolved(await resolveCurseForgeMod(slug, gameVersion))
			} catch (curseForgeError) {
				skipped.push({
					slug,
					reason: `Modrinth: ${errorMessage(error)} CurseForge: ${errorMessage(curseForgeError)}`,
				})
			}
		}
	}

	const plans: ResolveContentPlan[] = []
	const installed: string[] = []
	for (const { slug, project, version } of resolved) {
		try {
			const plan = await install_project_with_dependencies(instanceId, {
				project_id: project.id,
				version_id: version.id,
				content_type: 'mod',
				selected: {
					game_versions: [gameVersion],
					loaders: [loader],
				},
			})
			plans.push(plan)
			installed.push(slug)
		} catch (error) {
			skipped.push({ slug, reason: errorMessage(error) })
		}
	}
	for (const { slug, modId, fileId, downloadUrl } of curseForgeResolved) {
		try {
			await installCurseForgeMod(instanceId, modId, fileId, downloadUrl)
			installed.push(slug)
		} catch (error) {
			skipped.push({ slug, reason: `CurseForge install failed: ${errorMessage(error)}` })
		}
	}

	return {
		pack: packs[0],
		packs,
		slugs,
		installed,
		skipped,
		plans,
	}
}
