import { join } from '@tauri-apps/api/path'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { remove, writeFile } from '@tauri-apps/plugin-fs'

import { config } from '@/config'
import { add_project_from_path, get_full_path } from '@/helpers/instance'

export const CURSEFORGE_GAME_ID = 432
export const CURSEFORGE_MOD_CLASS_ID = 6
export const CURSEFORGE_FABRIC_LOADER = 4

type CurseForgeMod = {
	id: number
	name: string
	slug: string
	summary: string
	downloadCount: number
	dateCreated?: string
	dateModified?: string
	logo?: { url?: string }
	links?: { websiteUrl?: string }
}

type CurseForgeFile = {
	id: number
	modId: number
	isAvailable: boolean
	fileName: string
	fileDate: string
	gameVersions: string[]
}

type CurseForgeResponse<T> = {
	data: T
	pagination?: { totalCount?: number; pageSize?: number; index?: number; resultCount?: number }
}

async function request<T>(path: string): Promise<CurseForgeResponse<T>> {
	const response = await tauriFetch(`${config.curseForgeApiBaseUrl}${path}`, {
		headers: {
			Accept: 'application/json',
			'x-api-key': config.curseForgeApiKey,
		},
	})
	if (!response.ok) {
		throw new Error(`CurseForge request failed (${response.status})`)
	}
	const body = (await response.json()) as CurseForgeResponse<T>
	return body
}

export type CurseForgeSearchResult = {
	project_id: string
	project_types: string[]
	all_project_types: string[]
	slug: string
	author: string
	author_id: string
	organization: null
	organization_id: null
	name: string
	title: string
	summary: string
	categories: string[]
	display_categories: string[]
	downloads: number
	follows: number
	icon_url: string | null
	date_created: string
	date_modified: string
	license: string
	gallery: string[]
	featured_gallery: null
	color: null
	loaders: string[]
	disclosure_types: string[]
	source: 'curseforge'
	curseforge_id: number
	curseforge_url: string
}

export async function searchCurseForgeMods(
	requestParams: string,
	gameVersion?: string,
): Promise<{ hits: CurseForgeSearchResult[]; total: number; perPage: number }> {
	const params = new URLSearchParams(requestParams.replace(/^\?/, ''))
	const query = params.get('query') ?? ''
	const index = Math.max(0, Number(params.get('offset') ?? 0) || 0)
	const pageSize = 20
	const search = new URLSearchParams({
		gameId: String(CURSEFORGE_GAME_ID),
		classId: String(CURSEFORGE_MOD_CLASS_ID),
		modLoaderType: String(CURSEFORGE_FABRIC_LOADER),
		index: String(index),
		pageSize: String(pageSize),
		sortField: '2',
		sortOrder: 'desc',
	})
	if (query) search.set('searchFilter', query)
	if (gameVersion) search.set('gameVersion', gameVersion)

	const response = await request<CurseForgeMod[]>(`/mods/search?${search.toString()}`)
	const hits = response.data.map((mod) => {
		const date = mod.dateModified ?? mod.dateCreated ?? new Date(0).toISOString()
		return {
			project_id: `curseforge:${mod.id}`,
			project_types: ['mod'],
			all_project_types: ['mod'],
			slug: mod.slug,
			author: 'CurseForge',
			author_id: 'curseforge',
			organization: null,
			organization_id: null,
			name: mod.name,
			title: mod.name,
			summary: mod.summary,
			categories: ['fabric'],
			display_categories: ['fabric'],
			downloads: mod.downloadCount ?? 0,
			follows: 0,
			icon_url: mod.logo?.url ?? null,
			date_created: mod.dateCreated ?? date,
			date_modified: date,
			license: 'CurseForge',
			gallery: [],
			featured_gallery: null,
			color: null,
			loaders: ['fabric'],
			disclosure_types: [],
			source: 'curseforge' as const,
			curseforge_id: mod.id,
			curseforge_url:
				mod.links?.websiteUrl ?? `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`,
		}
	})

	return { hits, total: response.pagination?.totalCount ?? hits.length, perPage: pageSize }
}

export async function getCurseForgeLatestFile(
	modId: number,
	gameVersion?: string,
): Promise<CurseForgeFile> {
	const params = new URLSearchParams({
		index: '0',
		pageSize: '50',
		modLoaderType: String(CURSEFORGE_FABRIC_LOADER),
	})
	if (gameVersion) params.set('gameVersion', gameVersion)
	const files = (await request<CurseForgeFile[]>(`/mods/${modId}/files?${params.toString()}`)).data
	const file = files
		.filter(
			(candidate) =>
				candidate.isAvailable &&
				candidate.fileName.toLowerCase().endsWith('.jar') &&
				(!gameVersion || candidate.gameVersions.includes(gameVersion)),
		)
		.sort((a, b) => Date.parse(b.fileDate) - Date.parse(a.fileDate))[0]
	if (!file) {
		throw new Error('No compatible Fabric file was found on CurseForge for this instance.')
	}
	return file
}

export async function getCurseForgeDownloadUrl(modId: number, fileId: number): Promise<string> {
	return (await request<string>(`/mods/${modId}/files/${fileId}/download-url`)).data
}

export async function installCurseForgeMod(
	instanceId: string,
	modId: number,
	fileId: number,
	downloadUrl: string,
): Promise<string> {
	if (!downloadUrl.startsWith('https://')) {
		throw new Error('CurseForge returned an insecure download URL.')
	}
	const response = await tauriFetch(downloadUrl)
	if (!response.ok) {
		throw new Error(`CurseForge download failed (${response.status})`)
	}
	const bytes = new Uint8Array(await response.arrayBuffer())
	const temporaryPath = await join(
		await get_full_path(instanceId),
		`.bread-curseforge-${modId}-${fileId}.jar`,
	)
	await writeFile(temporaryPath, bytes)
	try {
		return await add_project_from_path(instanceId, temporaryPath, 'mod')
	} finally {
		await remove(temporaryPath).catch(() => undefined)
	}
}
