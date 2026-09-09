<script setup lang="ts">
import { FolderOpenIcon, PlayIcon, PlusIcon } from '@modrinth/assets'
import { Avatar, Button, ContextMenu, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { computed, inject, onActivated, ref } from 'vue'

import LibrarySection from '@/components/ui/library/index.vue'
import WelcomeScreen from '@/components/ui/WelcomeScreen.vue'
import RecentWorldsList from '@/components/ui/world/RecentWorldsList.vue'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { BREAD_PACK_OPTIONS } from '@/helpers/bread-packs'
import { getInstanceIconUrl, run } from '@/helpers/instance'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import { useRootBreadcrumb } from '@/providers/breadcrumbs'
import { injectOnboardingChecklist } from '@/providers/onboarding-checklist'

defineOptions({
	name: 'LibraryPage',
})

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const { hasCreatedInstance, isReady } = injectOnboardingChecklist()
const showCreationModal = inject<(packId?: string) => void>('showCreationModal')
const pageOptions = ref<InstanceType<typeof ContextMenu>>()
const appSettings = useAppSettings()

const messages = defineMessages({
	home: {
		id: 'app.navigation.home',
		defaultMessage: 'Home',
	},
	newInstance: {
		id: 'app.library.context-menu.create-instance',
		defaultMessage: 'New instance',
	},
	libraryActionsLabel: {
		id: 'app.library.actions.label',
		defaultMessage: 'Library actions',
	},
	installationFound: {
		id: 'app.library.installation-found',
		defaultMessage: 'Minecraft installation found',
	},
	installationFoundDescription: {
		id: 'app.library.installation-found.description',
		defaultMessage: '{count, plural, one {# game folder} other {# game folders}} detected',
	},
	refreshInstallation: {
		id: 'app.library.installation-found.refresh',
		defaultMessage: 'Refresh',
	},
	findNextWorld: {
		id: 'app.library.find-next-world',
		defaultMessage: 'Find your next world',
	},
})

const homeBreadcrumb = useRootBreadcrumb({
	slot: 'root',
	id: 'home',
	label: formatMessage(messages.home),
	to: '/',
	visual: { type: 'icon', component: PlayIcon },
})
onActivated(homeBreadcrumb.reset)

const instancesQuery = useQuery(instanceListQueryOptions())
const instances = computed(() => instancesQuery.data.value ?? [])
if (hasCreatedInstance.value) {
	await instancesQuery.suspense().catch(handleError)
}

const recentInstances = computed(() =>
	instances.value
		.slice()
		.sort((a, b) => dayjs(b.last_played ?? b.created).diff(dayjs(a.last_played ?? a.created))),
)

function openPageContextMenu(event: MouseEvent) {
	if (
		!(event.target instanceof HTMLElement) ||
		!event.target.hasAttribute('data-library-page-background')
	) {
		return
	}

	event.preventDefault()
	event.stopPropagation()
	pageOptions.value?.open(event, [
		{
			id: 'new_instance',
			label: formatMessage(messages.newInstance),
			icon: PlusIcon,
			action: () => showCreationModal?.(),
		},
	])
}

async function launchQuickstart(instance) {
	try {
		await run(instance.id)
	} catch (error) {
		handleError(error)
	}
}
</script>

<template>
	<WelcomeScreen v-if="isReady && !hasCreatedInstance" />
	<div
		v-else-if="isReady"
		data-library-page-background
		class="bread-library-page flex flex-col gap-4 p-6"
		@contextmenu="openPageContextMenu"
	>
		<section v-if="instances.length" class="bread-quickstart" aria-label="Quick start">
			<button
				v-for="instance in instances.slice(0, 8)"
				:key="instance.id"
				type="button"
				class="bread-quickstart__item"
				:title="`Launch ${instance.name}`"
				:aria-label="`Launch ${instance.name}`"
				@click="launchQuickstart(instance)"
			>
				<Avatar :src="getInstanceIconUrl(instance.icon_path)" :tint-by="instance.id" size="40px" pad-transparent-corners />
			</button>
		</section>
		<LibrarySection :instances="instances" />
		<section v-if="BREAD_PACK_OPTIONS.length" class="bread-pack-suggestions">
			<div class="bread-pack-suggestions__heading">
				<div>
					<h2>Start with a Bread pack</h2>
					<p>Pick a focus and we’ll resolve the current Fabric mods when you create it.</p>
				</div>
				<Button type="quiet" size="sm" @click="showCreationModal?.()">Build your own</Button>
			</div>
			<div class="bread-pack-suggestions__grid">
				<button
					v-for="pack in BREAD_PACK_OPTIONS"
					:key="pack.id"
					type="button"
					class="bread-pack-suggestion"
					@click="showCreationModal?.(pack.id)"
				>
					<span class="bread-pack-suggestion__topline">
						<strong>{{ pack.name }}</strong>
						<small>{{ pack.slugs.length }} mods</small>
					</span>
					<span class="bread-pack-suggestion__description">{{ pack.description }}</span>
					<span class="bread-pack-suggestion__mods" aria-label="Included mods">
						<span
							v-for="slug in pack.slugs"
							:key="slug"
							class="bread-pack-suggestion__mod"
							:title="pack.modReasons[slug]"
						>
							{{ slug }}
						</span>
					</span>
				</button>
			</div>
		</section>
		<div v-if="instances.length > 0" class="bread-installation-found">
			<div class="bread-installation-found__icon">
				<FolderOpenIcon />
			</div>
			<div class="bread-installation-found__copy">
				<strong>{{ formatMessage(messages.installationFound) }}</strong>
				<span>
					{{
						formatMessage(messages.installationFoundDescription, { count: instances.length })
					}}
				</span>
			</div>
			<Button type="quiet" size="sm" class="bread-installation-found__refresh" @click="instancesQuery.refetch()">
				{{ formatMessage(messages.refreshInstallation) }}
			</Button>
		</div>
		<section
			v-if="recentInstances?.length > 0 && appSettings.getFeatureFlag('worlds_in_home')"
			class="bread-next-worlds"
		>
			<RecentWorldsList
				:recent-instances="recentInstances"
				:section-title="formatMessage(messages.findNextWorld)"
				section-subtitle="Hand-picked adventures from the community."
			/>
		</section>
		<ContextMenu ref="pageOptions" :label="formatMessage(messages.libraryActionsLabel)" />
	</div>
</template>

<style scoped>
.bread-library-page {
	min-height: 100%;
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--bread-color-surface-panel) 30%, transparent), transparent 18rem),
		var(--bread-color-surface);
}

.bread-quickstart {
	display: flex;
	align-items: center;
	gap: var(--bread-space-3);
	min-height: 3rem;
	padding: var(--bread-space-2) var(--bread-space-3);
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background: color-mix(in srgb, var(--bread-color-surface-panel) 70%, transparent);
	overflow-x: auto;
}

.bread-quickstart__item {
	display: grid;
	place-items: center;
	flex: 0 0 auto;
	padding: 0;
	border: 0;
	border-radius: var(--bread-radius-md);
	background: transparent;
	cursor: pointer;
	transition: transform 120ms ease, filter 120ms ease;
}

.bread-quickstart__item:hover,
.bread-quickstart__item:focus-visible {
	transform: translateY(-2px);
	filter: brightness(1.14);
}

.bread-installation-found {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-top: 0.25rem;
	padding: 0.9rem 1rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-surface-subtle);
	box-shadow: 0 0.75rem 1.5rem rgb(0 0 0 / 12%);
}

.bread-pack-suggestions {
	margin-top: 0.5rem;
}

.bread-pack-suggestions__heading {
	display: flex;
	align-items: end;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 0.75rem;
}

.bread-pack-suggestions__heading h2 {
	margin: 0;
	color: var(--bread-color-text);
	font-family: var(--bread-font-display);
	font-size: 1.15rem;
	letter-spacing: -0.025em;
}

.bread-pack-suggestions__heading p {
	margin: 0.25rem 0 0;
	color: var(--bread-color-text-muted);
	font-size: 0.78rem;
}

.bread-pack-suggestions__grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.75rem;
}

.bread-pack-suggestion {
	display: flex;
	min-height: 6rem;
	flex-direction: column;
	align-items: stretch;
	gap: 0.45rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-surface-subtle);
	padding: 0.85rem;
	color: var(--bread-color-text-muted);
	text-align: left;
	transition: border-color 120ms ease, transform 120ms ease, background-color 120ms ease;
	box-shadow: 0 0.35rem 0 rgb(0 0 0 / 16%);
}

.bread-pack-suggestion:hover {
	border-color: var(--bread-color-brand);
	background: var(--bread-color-surface-elevated);
	transform: translateY(-1px);
	box-shadow: 0 0.55rem 1rem rgb(0 0 0 / 18%);
}

.bread-pack-suggestion__topline {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	color: var(--bread-color-text);
}

.bread-pack-suggestion__topline small {
	color: var(--bread-color-brand-bright);
	font-size: 0.7rem;
	font-weight: 600;
}

.bread-pack-suggestion__description {
	font-size: 0.75rem;
	line-height: 1.35;
}

.bread-pack-suggestion__mods {
	display: flex;
	flex-wrap: wrap;
	gap: 0.3rem;
	margin-top: auto;
}

.bread-pack-suggestion__mod {
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-pill);
	background: var(--bread-color-surface-panel);
	padding: 0.16rem 0.42rem;
	color: var(--bread-color-text-subtle);
	font-size: 0.64rem;
	line-height: 1.2;
}

@media (max-width: 800px) {
	.bread-pack-suggestions__grid {
		grid-template-columns: 1fr;
	}
}

.bread-installation-found__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	flex: 0 0 auto;
	border-radius: var(--bread-radius-md);
	background: rgb(243 169 54 / 16%);
	color: var(--bread-color-brand-bright);
}

.bread-installation-found__icon svg {
	width: 1.2rem;
	height: 1.2rem;
}

.bread-installation-found__copy {
	display: flex;
	flex-direction: column;
	gap: 0.15rem;
	min-width: 0;
}

.bread-installation-found__copy strong {
	color: var(--bread-color-text);
	font-size: 0.9rem;
}

.bread-installation-found__copy span {
	color: var(--bread-color-text-muted);
	font-size: 0.78rem;
}

.bread-installation-found__refresh {
	margin-left: auto;
	color: var(--bread-color-brand-bright) !important;
}

.bread-next-worlds {
	margin-top: 0.5rem;
}

.bread-next-worlds :deep(.bread-world-section-heading .text-2xl) {
	font-family: var(--bread-font-display);
	letter-spacing: -0.035em;
}
</style>
