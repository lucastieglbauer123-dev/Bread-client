<script setup>
import { BugIcon, RefreshCwIcon } from '@modrinth/assets'
import { Button, injectNotificationManager } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { list as listInstances } from '@/helpers/instance'
import { get_logs } from '@/helpers/logs.js'

const { handleError } = injectNotificationManager()
const instances = ref([])
const reports = ref([])
const loading = ref(true)

const instanceNames = computed(() => Object.fromEntries(instances.value.map((instance) => [instance.id, instance.name])))

async function loadReports() {
	loading.value = true
	reports.value = []
	try {
		instances.value = await listInstances()
		const results = await Promise.allSettled(
			instances.value.map(async (instance) => {
				// The overview only needs metadata. Asking the backend to omit file contents
				// keeps one unsupported log extension from hiding valid crash reports while
				// leaving the files untouched.
				const logs = await get_logs(instance.id, true)
				return logs
					.filter((log) => {
						const type = String(log.log_type ?? '').toLowerCase()
						const filename = String(log.filename ?? '').toLowerCase()
						return type.includes('crash') || filename.startsWith('crash-')
					})
					.map((log) => ({ ...log, instanceId: instance.id }))
			}),
		)
		reports.value = results
			.flatMap((result) => {
				if (result.status === 'fulfilled') return result.value
				handleError(result.reason)
				return []
			})
			.sort((a, b) => Number(b.age ?? 0) - Number(a.age ?? 0))
	} catch (error) {
		handleError(error)
	} finally {
		loading.value = false
	}
}

function formatAge(age) {
	const date = Number(age) > 1e12 ? Number(age) : Number(age) * 1000
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

onMounted(loadReports)
</script>

<template>
	<div class="bread-global-page bread-crash-page">
		<header class="bread-global-page__header">
			<div>
				<p class="bread-eyebrow">Bread Client</p>
				<h1>Crash reports</h1>
				<p>Review launch failures without digging through instance folders.</p>
			</div>
			<div class="bread-global-page__actions">
				<span class="bread-global-page__count">{{ loading ? 'Scanning' : `${reports.length} reports` }}</span>
				<Button type="quiet" size="sm" :disabled="loading" @click="loadReports"><RefreshCwIcon /> Refresh</Button>
			</div>
		</header>
		<div v-if="loading" class="bread-global-empty"><RefreshCwIcon class="animate-spin" /><p>Looking for reports…</p></div>
		<section v-else-if="reports.length" class="bread-activity-list" aria-label="Crash reports">
			<article v-for="report in reports" :key="`${report.instanceId}-${report.filename}`" class="bread-activity-item">
				<div class="bread-activity-item__icon"><BugIcon /></div>
				<div class="bread-activity-item__copy">
					<strong>{{ report.filename }}</strong>
					<small>{{ instanceNames[report.instanceId] ?? 'Unknown instance' }} · {{ formatAge(report.age) }}</small>
				</div>
				<RouterLink :to="`/instance/${report.instanceId}/logs?log=${encodeURIComponent(report.filename)}`" class="bread-activity-item__link">Open log</RouterLink>
			</article>
		</section>
		<div v-else class="bread-global-empty" role="status"><BugIcon /><h2>Nothing here yet!</h2><p>Your instances are looking healthy.</p></div>
	</div>
</template>

<style scoped>
.bread-global-page { min-height: 100%; padding: 2rem clamp(1.25rem, 4vw, 4rem); background: var(--bread-color-surface); color: var(--bread-color-text-primary); }
.bread-global-page__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 2rem; margin-bottom: 1.5rem; padding: 1.25rem; border: 1px solid var(--bread-color-border-subtle); border-radius: var(--bread-radius-xl); background: linear-gradient(135deg, var(--bread-color-surface-panel), var(--bread-color-surface-subtle)); }
.bread-global-page__actions { display: flex; align-items: flex-end; flex-direction: column; gap: .65rem; flex: 0 0 auto; }
.bread-global-page__count { color: var(--bread-color-brand-bright); font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.bread-eyebrow { margin: 0 0 .4rem; color: var(--bread-color-brand); text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 800; }
h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.5rem); }
.bread-global-page__header p:not(.bread-eyebrow) { margin: .4rem 0 0; color: var(--bread-color-text-muted); }
.bread-activity-list { display: grid; gap: .65rem; max-width: 58rem; }
.bread-activity-item { display: flex; align-items: center; gap: .9rem; padding: 1rem; border: 1px solid var(--bread-color-border-subtle); border-radius: var(--bread-radius-md); background: var(--bread-color-surface-panel); }
.bread-activity-item__icon { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: .7rem; background: var(--bread-color-brand-highlight); color: var(--bread-color-brand); }
.bread-activity-item__icon svg { width: 1.15rem; }
.bread-activity-item__copy { display: grid; gap: .2rem; flex: 1; min-width: 0; }
.bread-activity-item__copy small { color: var(--bread-color-text-muted); }
.bread-activity-item__link { color: var(--bread-color-brand); font-weight: 700; }
.bread-global-empty { display: grid; place-items: center; gap: .6rem; min-height: 20rem; border: 1px dashed var(--bread-color-border-subtle); border-radius: var(--bread-radius-lg); color: var(--bread-color-text-muted); text-align: center; }
.bread-global-empty svg { width: 2rem; color: var(--bread-color-brand); }
.bread-global-empty h2, .bread-global-empty p { margin: 0; }
@media (max-width: 38rem) { .bread-global-page__header { flex-direction: column; gap: 1rem; } .bread-global-page__actions { align-items: flex-start; flex-direction: row; flex-wrap: wrap; } }
</style>
