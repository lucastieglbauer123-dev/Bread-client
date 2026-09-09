export type ActivityKind = 'played' | 'created' | 'installed' | 'updated' | 'crashed'

export type ActivityEntry = {
	id: string
	kind: ActivityKind
	timestamp: number
	instanceId?: string
	detail?: string
}

const STORAGE_KEY = 'bread-client-recent-activity'
const MAX_ENTRIES = 100

function readStored(): ActivityEntry[] {
	if (typeof window === 'undefined') return []
	try {
		const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
		return Array.isArray(value) ? value.filter((entry) => entry && entry.timestamp) : []
	} catch {
		return []
	}
}

export function readActivity(): ActivityEntry[] {
	return readStored().sort((a, b) => b.timestamp - a.timestamp)
}

export function recordActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
	if (typeof window === 'undefined') return
	const next: ActivityEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }
	const entries = [next, ...readStored()].slice(0, MAX_ENTRIES)
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
	window.dispatchEvent(new CustomEvent('bread-activity-updated'))
}

export function clearActivity() {
	if (typeof window === 'undefined') return
	window.localStorage.removeItem(STORAGE_KEY)
	window.dispatchEvent(new CustomEvent('bread-activity-updated'))
}
