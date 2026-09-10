<script setup>
import { HistoryIcon, RefreshCwIcon } from '@modrinth/assets'
import { Button, injectNotificationManager } from '@modrinth/ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { clearActivity, readActivity } from '@/helpers/activity'
import { list as listInstances } from '@/helpers/instance'

const { handleError } = injectNotificationManager()
const entries = ref(readActivity())
const instances = ref([])

const instanceNames = computed(() =>
	Object.fromEntries(instances.value.map((instance) => [instance.id, instance.name])),
)

function refresh() {
	entries.value = readActivity()
}

async function loadInstances() {
	try {
		instances.value = await listInstances()
	} catch (error) {
		handleError(error)
	}
}

function formatTime(timestamp) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
}

function describe(entry) {
	const name = instanceNames.value[entry.instanceId] ?? 'an instance'
	if (entry.kind === 'played') return `Played ${name}`
	if (entry.kind === 'created') return `Created ${name}`
	if (entry.kind === 'installed') return `Installed content in ${name}`
	if (entry.kind === 'updated') return `Updated ${name}`
	return `Crash report captured for ${name}`
}

function clear() {
	clearActivity()
	refresh()
}

onMounted(() => {
	loadInstances()
	window.addEventListener('bread-activity-updated', refresh)
})
onUnmounted(() => window.removeEventListener('bread-activity-updated', refresh))
</script>

<template>
	<div class="bread-global-page bread-activity-page">
		<header class="bread-global-page__header">
			<div>
				<p class="bread-eyebrow">Bread Client</p>
				<h1>Recent activity</h1>
				<p>Everything that happened in your launcher, in one place.</p>
			</div>
			<div class="bread-global-page__actions">
				<span class="bread-global-page__count">{{ entries.length }} events</span>
				<Button type="quiet" size="sm" :disabled="entries.length === 0" @click="clear">
					<RefreshCwIcon /> Clear history
				</Button>
			</div>
		</header>
		<section v-if="entries.length" class="bread-activity-list" aria-label="Recent activity">
			<article v-for="entry in entries" :key="entry.id" class="bread-activity-item">
				<div class="bread-activity-item__icon"><HistoryIcon /></div>
				<div class="bread-activity-item__copy">
					<strong>{{ describe(entry) }}</strong>
					<small>{{ formatTime(entry.timestamp) }}<span v-if="entry.detail"> · {{ entry.detail }}</span></small>
				</div>
				<RouterLink v-if="entry.instanceId" :to="`/instance/${entry.instanceId}`" class="bread-activity-item__link">Open</RouterLink>
			</article>
		</section>
		<div v-else class="bread-global-empty">
			<HistoryIcon />
			<h2>No recent activity yet</h2>
			<p>Launch an instance or install content and your activity will appear here.</p>
		</div>
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
