import type { Labrinth } from '@modrinth/api-client'
import { getLatestMatchingInstallVersion } from '@modrinth/ui'

import packDefinitions from '@/data/bread-packs.json'
import { get_project, get_version_many } from '@/helpers/cache.js'
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
	hitindicator: 'Shows when a clean, fully charged hit can land.',
	'ping-display': 'Shows numerical player ping in the tab list.',
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
	plans: ResolveContentPlan[]
}

/**
 * Resolves each pack slug through Modrinth immediately before install, then lets the existing
 * instance resolver install the selected version and its dependencies. No jars or version IDs are
 * stored in the Bread pack registry.
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

	const projects = await Promise.all(
		slugs.map(async (slug) => {
			const project = (await get_project(slug, 'must_revalidate')) as Labrinth.Projects.v2.Project
			if (!project?.id) throw new Error(`Modrinth project not found for '${slug}'.`)
			return { slug, project }
		}),
	)
	// A slug can be listed by more than one pack (or resolve through an alias);
	// keep one project entry so it is version-resolved/installed once while
	// preserving the merged slug order for deterministic installs.
	const projectsById = new Map<string, { slug: string; project: Labrinth.Projects.v2.Project }>()
	for (const project of projects) {
		if (!projectsById.has(project.project.id)) projectsById.set(project.project.id, project)
	}

	const resolved = await Promise.all(
		[...projectsById.values()].map(async ({ slug, project }) => {
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
			return { slug, project, version }
		}),
	)

	const plans: ResolveContentPlan[] = []
	for (const { project, version } of resolved) {
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
	}

	return {
		pack: packs[0],
		packs,
		slugs,
		installed: resolved.map(({ slug }) => slug),
		plans,
	}
}
