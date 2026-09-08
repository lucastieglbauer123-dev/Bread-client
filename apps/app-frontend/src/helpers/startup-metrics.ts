type BreadStartupMetrics = {
	processStart: number
	firstPaint?: number
	firstPaintMs?: number
}

declare global {
	interface Window {
		__breadStartupMetrics?: BreadStartupMetrics
	}
}

const metrics: BreadStartupMetrics = {
	processStart: Date.now(),
}

function publishMetrics(): void {
	if (typeof window !== 'undefined') {
		window.__breadStartupMetrics = metrics
	}
}

export function markProcessStart(): void {
	metrics.processStart = Date.now()
	publishMetrics()
	console.info(`[Bread startup] process start: ${new Date(metrics.processStart).toISOString()}`)
}

export function markFirstPaint(): void {
	if (metrics.firstPaint !== undefined) return

	metrics.firstPaint = Date.now()
	metrics.firstPaintMs = metrics.firstPaint - metrics.processStart
	publishMetrics()
	console.info(
		`[Bread startup] first paint: ${new Date(metrics.firstPaint).toISOString()} (${metrics.firstPaintMs} ms)`,
	)
}

publishMetrics()

export {}
