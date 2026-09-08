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

export interface BreadPackInstallResult {
	pack: BreadPackDefinition
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
	packId: string,
	gameVersion: string,
	loader: string,
): Promise<BreadPackInstallResult> {
	const pack = getBreadPack(packId)
	if (!pack) throw new Error(`Unknown Bread pack: '${packId}'`)
	if (loader !== 'fabric') {
		throw new Error(`${pack.name} is currently available for Fabric instances only.`)
	}

	const projects = await Promise.all(
		pack.slugs.map(async (slug) => {
			const project = (await get_project(slug, 'must_revalidate')) as Labrinth.Projects.v2.Project
			if (!project?.id) throw new Error(`Modrinth project not found for '${slug}'.`)
			return { slug, project }
		}),
	)

	const resolved = await Promise.all(
		projects.map(async ({ slug, project }) => {
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

	return { pack, installed: resolved.map(({ slug }) => slug), plans }
}
