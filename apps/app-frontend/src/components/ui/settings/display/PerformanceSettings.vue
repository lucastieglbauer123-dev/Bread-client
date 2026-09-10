<script setup lang="ts">
import { CoffeeIcon } from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, Toggle, useVIntl } from '@modrinth/ui'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { purge_cache_types } from '@/helpers/cache.js'
import { find_filtered_jres, get_java_versions, set_java_version } from '@/helpers/jre.js'

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const queryClient = useQueryClient()

const STARTUP_UPDATE_CHECK_KEY = 'bread.performance.check-updates-on-startup'

const messages = defineMessages({
	startupTitle: {
		id: 'app.performance-settings.startup.title',
		defaultMessage: 'Launch behavior',
	},
	startupDescription: {
		id: 'app.performance-settings.startup.description',
		defaultMessage: 'Keep the launcher responsive while non-essential checks run in the background.',
	},
	checkUpdates: {
		id: 'app.performance-settings.check-updates',
		defaultMessage: 'Check for updates on startup',
	},
	checkUpdatesDescription: {
		id: 'app.performance-settings.check-updates.description',
		defaultMessage: 'When off, the check is deferred for about 10 seconds after the app opens.',
	},
	javaTitle: {
		id: 'app.performance-settings.java.title',
		defaultMessage: 'Detected Java installations',
	},
	javaDescription: {
		id: 'app.performance-settings.java.description',
		defaultMessage: 'Saved Java paths are reused between launches. Re-scan only when you install or remove Java.',
	},
	rescan: {
		id: 'app.performance-settings.java.rescan',
		defaultMessage: 'Re-scan Java',
	},
	rescanning: {
		id: 'app.performance-settings.java.rescanning',
		defaultMessage: 'Scanning…',
	},
	noJava: {
		id: 'app.performance-settings.java.none',
		defaultMessage: 'No saved Java installations yet.',
	},
	cacheTitle: {
		id: 'app.performance-settings.cache.title',
		defaultMessage: 'Content cache',
	},
	cacheDescription: {
		id: 'app.performance-settings.cache.description',
		defaultMessage: 'Clear cached project, version, and search metadata if results look stale.',
	},
	clearCache: {
		id: 'app.performance-settings.cache.clear',
		defaultMessage: 'Clear cache',
	},
	cacheCleared: {
		id: 'app.performance-settings.cache.cleared',
		defaultMessage: 'Content cache cleared.',
	},
})

const checkUpdatesOnStartup = ref(
	typeof localStorage === 'undefined' || localStorage.getItem(STARTUP_UPDATE_CHECK_KEY) !== 'false',
)
watch(checkUpdatesOnStartup, (value) => {
	localStorage.setItem(STARTUP_UPDATE_CHECK_KEY, String(value))
})

type JavaVersion = { parsed_version?: number; version?: string; path?: string }
const javaVersions = ref<Record<string, JavaVersion>>((await get_java_versions().catch(handleError)) as Record<
	string,
	JavaVersion
>)
const scanning = ref(false)
const cacheStatus = ref('')
const savedJavaVersions = computed(() =>
	Object.entries(javaVersions.value ?? {})
		.filter(([, value]) => value?.path)
		.sort(([a], [b]) => Number(b) - Number(a)),
)

async function rescanJava(): Promise<void> {
	if (scanning.value) return
	scanning.value = true
	try {
		const discovered = await Promise.all(
			[25, 21, 17, 8].map(async (version) => [version, await find_filtered_jres(version)] as const),
		)
		const next = { ...(javaVersions.value ?? {}) }
		for (const [version, installations] of discovered) {
			const first = (installations as JavaVersion[] | undefined)?.find((entry) => entry?.path)
			if (first) {
				next[String(version)] = first
				await set_java_version(first)
			}
		}
		javaVersions.value = next
	} catch (error) {
		handleError(error)
	} finally {
		scanning.value = false
	}
}

async function clearCache(): Promise<void> {
	try {
		await purge_cache_types([
			'project',
			'project_v3',
			'version',
			'version_v3',
			'project_versions',
			'search_results',
			'search_results_v3',
		])
		queryClient.removeQueries({ queryKey: ['search'] })
		queryClient.removeQueries({ queryKey: ['projects'] })
		cacheStatus.value = formatMessage(messages.cacheCleared)
	} catch (error) {
		handleError(error)
	}
}
</script>

<template>
	<div class="bread-performance-settings flex flex-col gap-8">
		<section class="flex flex-col gap-4">
			<div>
				<h2 class="m-0 text-lg font-semibold text-contrast">{{ formatMessage(messages.startupTitle) }}</h2>
				<p class="m-0 mt-1 text-secondary">{{ formatMessage(messages.startupDescription) }}</p>
			</div>
			<div
				class="bread-performance-toggle-row flex items-center justify-between gap-4 rounded-xl border border-solid border-divider px-4 py-3"
				data-tauri-drag-region-exclude
			>
				<label for="performance-check-updates" class="min-w-0 cursor-pointer">
					<h3 class="m-0 text-base font-semibold text-contrast">{{ formatMessage(messages.checkUpdates) }}</h3>
					<p class="m-0 mt-1 text-secondary">{{ formatMessage(messages.checkUpdatesDescription) }}</p>
				</label>
				<Toggle
					id="performance-check-updates"
					v-model="checkUpdatesOnStartup"
					data-tauri-drag-region-exclude
					@click.stop
				/>
			</div>
		</section>

		<section class="flex flex-col gap-4 border-0 border-t border-solid border-divider pt-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="m-0 text-lg font-semibold text-contrast">{{ formatMessage(messages.javaTitle) }}</h2>
					<p class="m-0 mt-1 text-secondary">{{ formatMessage(messages.javaDescription) }}</p>
				</div>
				<Button type="outlined" :disabled="scanning" @click="rescanJava">
					<CoffeeIcon aria-hidden="true" />
					{{ formatMessage(scanning ? messages.rescanning : messages.rescan) }}
				</Button>
			</div>
			<div v-if="savedJavaVersions.length" class="flex flex-col gap-2">
				<div
					v-for="[version, javaVersion] in savedJavaVersions"
					:key="`saved-java-${version}`"
					class="flex items-center justify-between rounded-xl border border-solid border-divider px-4 py-3"
				>
					<span class="font-semibold text-contrast">Java {{ version }}</span>
					<code class="text-sm text-secondary">{{ javaVersion.path }}</code>
				</div>
			</div>
			<p v-else class="m-0 text-secondary">{{ formatMessage(messages.noJava) }}</p>
		</section>

		<section class="flex flex-col gap-4 border-0 border-t border-solid border-divider pt-6">
			<div>
				<h2 class="m-0 text-lg font-semibold text-contrast">{{ formatMessage(messages.cacheTitle) }}</h2>
				<p class="m-0 mt-1 text-secondary">{{ formatMessage(messages.cacheDescription) }}</p>
			</div>
			<Button type="outlined" class="w-fit" @click="clearCache">
				{{ formatMessage(messages.clearCache) }}
			</Button>
			<p v-if="cacheStatus" class="m-0 text-secondary">{{ cacheStatus }}</p>
		</section>
	</div>
</template>

<style scoped>
.bread-performance-settings :deep(section) {
	padding: 1.25rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-xl);
	background: var(--bread-color-surface-panel);
}

.bread-performance-settings :deep(section + section) {
	border-top: 1px solid var(--bread-color-border-subtle);
}

.bread-performance-settings :deep(.bread-performance-toggle-row),
.bread-performance-settings :deep(section > div > div) {
	background: var(--bread-color-surface-subtle);
}
</style>
