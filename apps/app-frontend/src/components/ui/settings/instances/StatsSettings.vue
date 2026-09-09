<script setup lang="ts">
import { ChartIcon, ClockIcon, PackageIcon, RefreshCwIcon } from '@modrinth/assets'
import { Button, injectNotificationManager } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import { get_installed_project_ids, list as listInstances } from '@/helpers/instance'

const { handleError } = injectNotificationManager()
const instances = ref<any[]>([])
const totalMods = ref(0)
const loading = ref(true)

const totalPlaytime = computed(() => instances.value.reduce((total, instance) => total + Number(instance.submitted_time_played ?? 0), 0))
const mostPlayed = computed(() => instances.value.slice().sort((a, b) => Number(b.submitted_time_played ?? 0) - Number(a.submitted_time_played ?? 0))[0] ?? null)

function formatPlaytime(seconds: number) {
	const minutes = Math.max(0, Math.round(seconds / 60))
	const hours = Math.floor(minutes / 60)
	return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

async function load() {
	loading.value = true
	try {
		instances.value = await listInstances()
		const counts = await Promise.all(instances.value.map((instance) => get_installed_project_ids(instance.id).catch(() => [])))
		totalMods.value = new Set(counts.flat()).size
	} catch (error) {
		handleError(error)
	} finally {
		loading.value = false
	}
}

onMounted(load)
</script>

<template>
	<div class="bread-stats-settings">
		<div class="bread-stats-settings__header">
			<div><h2>Launcher stats</h2><p>A quick snapshot of your Bread Client worlds.</p></div>
			<Button type="quiet" size="sm" :disabled="loading" @click="load"><RefreshCwIcon /> Refresh</Button>
		</div>
		<div class="bread-stats-grid">
			<div class="bread-stat-card"><ClockIcon /><span>Total playtime</span><strong>{{ formatPlaytime(totalPlaytime) }}</strong></div>
			<div class="bread-stat-card"><ChartIcon /><span>Most played</span><strong>{{ mostPlayed?.name ?? '—' }}</strong><small v-if="mostPlayed">{{ formatPlaytime(mostPlayed.submitted_time_played) }}</small></div>
			<div class="bread-stat-card"><PackageIcon /><span>Installed mods</span><strong>{{ totalMods }}</strong></div>
		</div>
		<p v-if="loading" class="text-secondary">Loading local instance stats…</p>
	</div>
</template>

<style scoped>
.bread-stats-settings { display: grid; gap: 1.5rem; }
.bread-stats-settings__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
h2 { margin: 0; font-size: 1.2rem; }
p { margin: .35rem 0 0; color: var(--bread-color-text-muted); }
.bread-stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
.bread-stat-card { display: grid; gap: .3rem; padding: 1rem; border: 1px solid var(--bread-color-border-subtle); border-radius: var(--bread-radius-md); background: var(--bread-color-surface-panel); }
.bread-stat-card svg { width: 1.25rem; color: var(--bread-color-brand); }
.bread-stat-card span, .bread-stat-card small { color: var(--bread-color-text-muted); }
.bread-stat-card strong { color: var(--bread-color-text-primary); font-size: 1.25rem; overflow-wrap: anywhere; }
@media (max-width: 42rem) { .bread-stats-grid { grid-template-columns: 1fr; } }
</style>
