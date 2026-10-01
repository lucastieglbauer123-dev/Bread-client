import { config } from '@/config'

export interface BreadWebsiteUpdateManifest {
	version: string
	release_url: string
	notes_url?: string
	published_at?: string
	channel?: string
}

const manifestUrl = `${config.breadSiteUrl}/updates.json`

export async function getBreadWebsiteUpdateManifest(): Promise<BreadWebsiteUpdateManifest | null> {
	const response = await fetch(`${manifestUrl}?t=${Date.now()}`, { cache: 'no-store' })
	if (!response.ok) return null

	const manifest = (await response.json()) as Partial<BreadWebsiteUpdateManifest>
	if (
		typeof manifest.version !== 'string' ||
		!manifest.version ||
		typeof manifest.release_url !== 'string' ||
		!/^https:\/\//.test(manifest.release_url)
	) {
		return null
	}

	return manifest as BreadWebsiteUpdateManifest
}

function numericVersionParts(version: string): number[] {
	return version
		.split(/[^0-9]+/)
		.filter(Boolean)
		.map((part) => Number(part))
}

export function compareBreadVersions(left: string, right: string): number {
	const leftParts = numericVersionParts(left)
	const rightParts = numericVersionParts(right)
	const length = Math.max(leftParts.length, rightParts.length)

	for (let index = 0; index < length; index++) {
		const leftPart = leftParts[index] ?? 0
		const rightPart = rightParts[index] ?? 0
		if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1
	}

	return 0
}
