<script setup lang="ts">
import { FolderOpenIcon, PlayIcon, PlusIcon } from '@modrinth/assets'
import { Button, ContextMenu, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { computed, inject, onActivated, ref } from 'vue'

import LibrarySection from '@/components/ui/library/index.vue'
import WelcomeScreen from '@/components/ui/WelcomeScreen.vue'
import RecentWorldsList from '@/components/ui/world/RecentWorldsList.vue'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import { useRootBreadcrumb } from '@/providers/breadcrumbs'
import { injectOnboardingChecklist } from '@/providers/onboarding-checklist'

defineOptions({
	name: 'LibraryPage',
})

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const { hasCreatedInstance, isReady } = injectOnboardingChecklist()
const showCreationModal = inject<() => void>('showCreationModal')
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
</script>

<template>
	<WelcomeScreen v-if="isReady && !hasCreatedInstance" />
	<div
		v-else-if="isReady"
		data-library-page-background
		class="bread-library-page flex flex-col gap-4 p-6"
		@contextmenu="openPageContextMenu"
	>
		<LibrarySection :instances="instances" />
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
	background: var(--bread-color-surface);
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
