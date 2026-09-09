<script setup lang="ts">
import { HistoryIcon, PlusIcon, StarIcon } from '@modrinth/assets'
import { Button, ContextMenu, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, inject, nextTick, onDeactivated, onUnmounted, ref, toRef, watch } from 'vue'
import Draggable from 'vuedraggable'

import IconEditorModal from '@/components/ui/instance_settings/icon-editor-modal/index.vue'
import GroupInstancesModal from '@/components/ui/library/group-instances-modal.vue'
import InstanceCard from '@/components/ui/library/instance-group/instance-card.vue'
import InstanceGroup from '@/components/ui/library/instance-group/index.vue'
import InstanceGroupDnd from '@/components/ui/library/instance-group/instance-group-dnd.vue'
import LibraryToolbar from '@/components/ui/library/library-toolbar/index.vue'
import LibrarySelectionActionBar from '@/components/ui/library/LibrarySelectionActionBar.vue'
import {
	getLibraryInstanceSelectionKey,
	type InstanceCard as InstanceCardExposed,
	type InstanceGroup as InstanceGroupType,
	provideLibrary,
} from '@/components/ui/library/use-library'
import ConfirmDeleteInstanceModal from '@/components/ui/modal/ConfirmDeleteInstanceModal.vue'
import { FAVORITES_GROUP_ID } from '@/helpers/instance-groups'
import type { GameInstance } from '@/helpers/types'

const props = defineProps<{
	instances: GameInstance[]
	legacy?: boolean
}>()

const { formatMessage } = useVIntl()
const showCreationModal = inject<() => void>('showCreationModal')
const messages = defineMessages({
	library: { id: 'app.library.title', defaultMessage: 'Your instances' },
	libraryDescription: {
		id: 'app.library.description',
		defaultMessage: 'Your own worlds, exactly how you want them.',
	},
	noSearchResults: {
		id: 'app.library.search.no-results.title',
		defaultMessage: 'No instances match your search.',
	},
	instanceActionsLabel: {
		id: 'app.library.instance.actions.label',
		defaultMessage: 'Instance actions',
	},
})

const {
	instanceGroups,
	libraryGroupsLoaded,
	isSearching,
	displayState,
	filters,
	reorderingGroups,
	reorderGroups,
	instanceOptions,
	confirmDeleteModal,
	iconEditorModal,
	currentIconEditorInstance,
	currentDeleteInstances,
	clearLibraryInstanceSelection,
	deleteInstance,
	handleInstanceIconSaved,
	selectedLibraryInstances,
	setSelectedLibraryInstances,
	toggleLibraryInstanceSelection,
	handleInstanceContextMenu,
} = provideLibrary(toRef(props, 'instances'))

const hasActiveFilters = computed(() =>
	Object.values(filters.value).some((selectedValues) => selectedValues.length > 0),
)

const visibleInstanceGroups = computed(() =>
	instanceGroups.value.filter((instanceGroup) =>
		instanceGroup.id === FAVORITES_GROUP_ID
			? instanceGroup.instances.length > 0
			: instanceGroup.instances.length > 0 ||
				(!isSearching.value && !hasActiveFilters.value && instanceGroup.key !== 'None'),
	),
)

const visibleReorderableGroups = computed(() =>
	displayState.value.group === 'Group'
		? visibleInstanceGroups.value.filter((group) => group.id !== FAVORITES_GROUP_ID)
		: [],
)
const visibleFavoritesGroup = computed(() =>
	visibleInstanceGroups.value.find((group) => group.id === FAVORITES_GROUP_ID),
)
const draggableGroups = ref<InstanceGroupType[]>([])
const libraryGroupsContainer = ref<HTMLElement>()
const isDraggingGroup = ref(false)
const GROUP_REORDERING_CLASS = 'instance-group-reordering'
const canDragReorderGroups = computed(
	() => !reorderingGroups.value && draggableGroups.value.length > 1,
)
const modernInstanceComponents = new Map<string, InstanceCardExposed>()
const modernInstances = computed(() => {
	const seen = new Set<string>()
	return visibleInstanceGroups.value.flatMap((group) =>
		group.instances.flatMap((instance) => {
			if (seen.has(instance.id)) return []
			seen.add(instance.id)
			return [{ instance, groupId: group.id }]
		}),
	)
})
const modernHero = computed(() => modernInstances.value[0])
const modernGrid = computed(() => modernInstances.value.slice(1))
const modernGroups = computed(() => visibleInstanceGroups.value.filter((group) => group.instances.length > 0))

watch(
	visibleReorderableGroups,
	(groups) => {
		if (!isDraggingGroup.value) {
			const previousGroupTops = getReorderableGroupTops()
			draggableGroups.value = [...groups]
			void nextTick(() => animateGroupReorder(previousGroupTops))
		}
	},
	{ immediate: true },
)

function getReorderableGroupTops() {
	const groupTops = new Map<string, number>()
	const groupElements = libraryGroupsContainer.value?.querySelectorAll<HTMLElement>(
		'[data-instance-group-reorder-id]',
	)

	for (const groupElement of groupElements ?? []) {
		const groupId = groupElement.dataset.instanceGroupReorderId
		if (groupId) {
			groupTops.set(groupId, groupElement.getBoundingClientRect().top)
		}
	}

	return groupTops
}

function animateGroupReorder(previousGroupTops: Map<string, number>) {
	if (
		previousGroupTops.size === 0 ||
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	) {
		return
	}

	const groupElements = libraryGroupsContainer.value?.querySelectorAll<HTMLElement>(
		'[data-instance-group-reorder-id]',
	)

	for (const groupElement of groupElements ?? []) {
		const groupId = groupElement.dataset.instanceGroupReorderId
		const previousTop = groupId ? previousGroupTops.get(groupId) : undefined
		if (previousTop === undefined) continue

		const offset = previousTop - groupElement.getBoundingClientRect().top
		if (Math.abs(offset) < 1) continue

		groupElement.animate(
			[{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }],
			{ duration: 200, easing: 'ease-out' },
		)
	}
}

function onGroupDragStart() {
	isDraggingGroup.value = true
	document.documentElement.classList.add(GROUP_REORDERING_CLASS)
}

function onGroupDragEnd() {
	isDraggingGroup.value = false
	document.documentElement.classList.remove(GROUP_REORDERING_CLASS)

	const currentGroupIds = visibleReorderableGroups.value.map((group) => group.id)
	const orderedGroupIds = draggableGroups.value.map((group) => group.id)
	if (orderedGroupIds.every((groupId, index) => groupId === currentGroupIds[index])) {
		draggableGroups.value = [...visibleReorderableGroups.value]
		return
	}

	void reorderGroups(orderedGroupIds)
}

onUnmounted(() => {
	document.documentElement.classList.remove(GROUP_REORDERING_CLASS)
})

onDeactivated(clearLibraryInstanceSelection)

const anchorInstance = ref<{ groupId: string; instanceId: string } | null>(null)

function handleToggleInstance(groupId: string, instanceId: string, shiftKey: boolean) {
	const displayedInstances = visibleInstanceGroups.value.flatMap((group) =>
		group.instances.map((instance) => ({
			groupId: group.id,
			instanceId: instance.id,
		})),
	)
	const anchor = anchorInstance.value

	if (shiftKey && anchor && displayedInstances.length) {
		const anchorIndex = displayedInstances.findIndex(
			(instance) =>
				instance.groupId === anchor.groupId && instance.instanceId === anchor.instanceId,
		)
		const targetIndex = displayedInstances.findIndex(
			(instance) => instance.groupId === groupId && instance.instanceId === instanceId,
		)

		if (anchorIndex === -1 || targetIndex === -1) {
			toggleLibraryInstanceSelection({ groupId, instanceId })
			return
		}

		const start = Math.min(anchorIndex, targetIndex)
		const end = Math.max(anchorIndex, targetIndex)
		const range = displayedInstances.slice(start, end + 1)
		const nextSelectedInstances = new Map(selectedLibraryInstances.value)
		const targetKey = getLibraryInstanceSelectionKey({ groupId, instanceId })

		if (nextSelectedInstances.has(targetKey)) {
			for (const instance of range) {
				nextSelectedInstances.delete(getLibraryInstanceSelectionKey(instance))
			}
		} else {
			for (const instance of range) {
				nextSelectedInstances.set(getLibraryInstanceSelectionKey(instance), instance)
			}
		}

		setSelectedLibraryInstances(nextSelectedInstances.values())
		anchorInstance.value = null
		return
	}

	toggleLibraryInstanceSelection({ groupId, instanceId })
	anchorInstance.value = { groupId, instanceId }
}

function setInstanceOptions(component: unknown) {
	instanceOptions.value = component as InstanceType<typeof ContextMenu> | null
}

function setConfirmDeleteModal(component: unknown) {
	confirmDeleteModal.value = component as InstanceType<typeof ConfirmDeleteInstanceModal> | null
}

function setIconEditorModal(component: unknown) {
	iconEditorModal.value = component as InstanceType<typeof IconEditorModal> | null
}

function setModernInstanceComponent(instanceId: string, component: unknown) {
	if (component) {
		modernInstanceComponents.set(instanceId, component as InstanceCardExposed)
	} else {
		modernInstanceComponents.delete(instanceId)
	}
}

function openModernInstanceContextMenu(event: MouseEvent, instanceId: string, groupId: string) {
	const instanceComponent = modernInstanceComponents.get(instanceId)
	if (instanceComponent) handleInstanceContextMenu(event, instanceComponent, groupId)
}

watch(selectedLibraryInstances, (selectedInstances) => {
	if (selectedInstances.size === 0) {
		anchorInstance.value = null
		return
	}

	if (
		anchorInstance.value &&
		!selectedInstances.has(getLibraryInstanceSelectionKey(anchorInstance.value))
	) {
		anchorInstance.value = null
	}
})
</script>

<template>
	<InstanceGroupDnd :instances="instances">
		<section
			v-if="!legacy"
			data-library-page-background
			class="bread-library-modern"
		>
			<header class="bread-library-modern__header">
				<div class="bread-library-modern__eyebrow">BREAD WORKSPACE</div>
				<div class="bread-library-modern__header-row">
					<div>
						<h1>Play your way</h1>
						<p>Everything you play, tuned to your world.</p>
					</div>
					<div class="bread-library-modern__count">
						<strong>{{ modernInstances.length }}</strong>
						<span>instances ready</span>
					</div>
				</div>
				<div class="bread-library-modern__toolbar">
					<LibraryToolbar />
				</div>
			</header>

			<div class="bread-library-modern__layout">
				<main class="bread-library-modern__main">
					<section class="bread-library-modern__feature-grid" aria-label="Play controls">
						<article v-if="modernHero" class="bread-library-modern__feature">
							<div class="bread-library-modern__feature-heading">
								<div>
									<span>FEATURED INSTANCE</span>
									<h2>{{ modernHero.instance.name }}</h2>
									<p>{{ modernHero.instance.loader }} {{ modernHero.instance.game_version }}</p>
								</div>
								<span class="bread-library-modern__status">READY</span>
							</div>
							<InstanceCard
								:ref="
									(component: unknown) =>
										setModernInstanceComponent(modernHero!.instance.id, component)
								"
								:instance="modernHero.instance"
								:instance-group-id="modernHero.groupId"
								:is-selection-anchor="
									anchorInstance?.groupId === modernHero.groupId &&
									anchorInstance?.instanceId === modernHero.instance.id
								"
								class="bread-library-modern__feature-card"
								@toggle-selection="
									(shiftKey: boolean) =>
										handleToggleInstance(modernHero!.groupId, modernHero!.instance.id, shiftKey)
								"
								@contextmenu.prevent.stop="
									(event: MouseEvent) =>
										openModernInstanceContextMenu(
											event,
											modernHero!.instance.id,
											modernHero!.groupId,
										)
								"
							/>
						</article>
						<article class="bread-library-modern__command-card">
							<div class="bread-library-modern__command-heading">
								<span>QUICK ACTIONS</span>
								<h2>What are you building?</h2>
							</div>
							<button type="button" @click="showCreationModal?.()">
								<PlusIcon />
								<span><strong>New instance</strong><small>Start with a clean world</small></span>
							</button>
							<RouterLink to="/browse/modpack">
								<span class="bread-library-modern__command-icon">↗</span>
								<span><strong>Discover content</strong><small>Find your next adventure</small></span>
							</RouterLink>
							<RouterLink to="/activity">
								<HistoryIcon />
								<span><strong>Recent activity</strong><small>Pick up where you left off</small></span>
							</RouterLink>
						</article>
					</section>

					<section class="bread-library-modern__instances">
						<div class="bread-library-modern__section-heading">
							<div>
								<span class="bread-library-modern__eyebrow">YOUR LIBRARY</span>
								<h2>All instances</h2>
							</div>
							<span v-if="modernGroups.length" class="bread-library-modern__group-count">
								{{ modernGroups.length }} groups
							</span>
						</div>
						<p v-if="libraryGroupsLoaded && isSearching && modernInstances.length === 0" class="bread-library-modern__empty">
							{{ formatMessage(messages.noSearchResults) }}
						</p>
						<TransitionGroup
							v-else
							tag="div"
							name="bread-library-card"
							class="bread-library-modern__grid"
						>
							<div
								v-for="item in modernGrid"
								:key="item.instance.id"
								class="bread-library-modern__card-slot"
							>
								<InstanceCard
									:ref="
										(component: unknown) => setModernInstanceComponent(item.instance.id, component)
									"
									:instance="item.instance"
									:instance-group-id="item.groupId"
									:is-selection-anchor="
										anchorInstance?.groupId === item.groupId &&
										anchorInstance?.instanceId === item.instance.id
									"
									@toggle-selection="
										(shiftKey: boolean) =>
											handleToggleInstance(item.groupId, item.instance.id, shiftKey)
									"
									@contextmenu.prevent.stop="
										(event: MouseEvent) =>
											openModernInstanceContextMenu(event, item.instance.id, item.groupId)
								"
								/>
							</div>
						</TransitionGroup>
					</section>
				</main>

				<aside class="bread-library-modern__rail">
					<section class="bread-library-modern__rail-card">
						<span class="bread-library-modern__eyebrow">LIBRARY PULSE</span>
						<h2>Your worlds at a glance</h2>
						<div class="bread-library-modern__metrics">
							<div><strong>{{ instances.length }}</strong><span>installed</span></div>
							<div><strong>{{ modernGroups.length }}</strong><span>groups</span></div>
							<div><strong>{{ modernHero ? modernHero.instance.loader : '—' }}</strong><span>featured loader</span></div>
						</div>
					</section>
					<section class="bread-library-modern__rail-card bread-library-modern__rail-card--accent">
						<div class="bread-library-modern__rail-mark">+</div>
						<h2>Make a world that feels yours.</h2>
						<p>Use a Bread pack or tune every mod yourself.</p>
						<Button type="colored" color="brand" size="sm" @click="showCreationModal?.()">
							Create instance
					</Button>
					</section>
				</aside>
			</div>
		</section>
		<section v-else data-library-page-background class="bread-library flex flex-col gap-4 pb-16 min-h-[500px]">
			<div class="bread-library-heading">
				<div>
					<h2 class="m-0 text-3xl font-semibold text-contrast">
						{{ formatMessage(messages.library) }}
						<span class="bread-library-count">{{ instances.length }}</span>
					</h2>
					<p>{{ formatMessage(messages.libraryDescription) }}</p>
				</div>
				<span class="bread-library-view-all">View all <span aria-hidden="true">→</span></span>
			</div>
			<LibraryToolbar />
			<div
				v-if="libraryGroupsLoaded && isSearching && visibleInstanceGroups.length === 0"
				class="text-base text-primary"
			>
				{{ formatMessage(messages.noSearchResults) }}
			</div>
			<Transition
				v-else
				enter-active-class="transition-opacity duration-200 ease-out motion-reduce:transition-none"
				enter-from-class="opacity-0"
				enter-to-class="opacity-100"
			>
				<div
					v-if="libraryGroupsLoaded && displayState.group === 'Group'"
					ref="libraryGroupsContainer"
					data-library-page-background
					class="flex flex-col"
				>
					<div v-if="visibleFavoritesGroup" class="min-w-0">
						<InstanceGroup
							:instance-group="visibleFavoritesGroup"
							:selection-anchor-instance-id="
								anchorInstance?.groupId === FAVORITES_GROUP_ID ? anchorInstance.instanceId : null
							"
							@toggle-selection="
								(instanceId: string, shiftKey: boolean) =>
									handleToggleInstance(FAVORITES_GROUP_ID, instanceId, shiftKey)
							"
						/>
					</div>

					<Draggable
						:list="draggableGroups"
						class="flex flex-col"
						item-key="id"
						:disabled="!canDragReorderGroups"
						:animation="250"
						:swap-threshold="0.75"
						:invert-swap="true"
						:force-fallback="true"
						:fallback-on-body="true"
						:fallback-tolerance="4"
						filter=".instance-group-reorder-ignore, input, textarea, [contenteditable='true']"
						handle=".instance-group-reorder-handle"
						:prevent-on-filter="false"
						ghost-class="instance-group-reorder-ghost"
						chosen-class="instance-group-reorder-chosen"
						drag-class="instance-group-reorder-drag"
						fallback-class="instance-group-reorder-fallback"
						@start="onGroupDragStart"
						@end="onGroupDragEnd"
					>
						<template #item="{ element: instanceGroup }">
							<div
								:key="instanceGroup.id"
								class="min-w-0 w-full"
								:data-instance-group-reorder-id="instanceGroup.id"
							>
								<InstanceGroup
									:can-drag-reorder="canDragReorderGroups"
									:hide-header="
										instanceGroup.id === 'group:none' && visibleInstanceGroups.length === 1
									"
									:instance-group="instanceGroup"
									:selection-anchor-instance-id="
										anchorInstance?.groupId === instanceGroup.id ? anchorInstance?.instanceId : null
									"
									@toggle-selection="
										(instanceId: string, shiftKey: boolean) =>
											handleToggleInstance(instanceGroup.id, instanceId, shiftKey)
									"
								/>
							</div>
						</template>
					</Draggable>
				</div>

				<TransitionGroup
					v-else-if="libraryGroupsLoaded"
					data-library-page-background
					tag="div"
					class="flex flex-col"
					move-class="transition-transform duration-200 ease-out"
					enter-active-class="transition-[opacity,transform] duration-200 ease-out"
					enter-from-class="opacity-0 -translate-y-2"
					enter-to-class="opacity-100 translate-y-0"
				>
					<div
						v-for="instanceGroup in visibleInstanceGroups"
						:key="instanceGroup.id"
						class="min-w-0"
					>
						<InstanceGroup
							:hide-header="instanceGroup.key === 'None' && visibleInstanceGroups.length === 1"
							:instance-group="instanceGroup"
							:selection-anchor-instance-id="
								anchorInstance?.groupId === instanceGroup.id ? anchorInstance.instanceId : null
							"
							@toggle-selection="
								(instanceId: string, shiftKey: boolean) =>
									handleToggleInstance(instanceGroup.id, instanceId, shiftKey)
							"
						/>
					</div>
				</TransitionGroup>
			</Transition>
		</section>
	</InstanceGroupDnd>
	<LibrarySelectionActionBar />
	<GroupInstancesModal />
	<ConfirmDeleteInstanceModal
		:ref="setConfirmDeleteModal"
		:instances="currentDeleteInstances"
		@delete="deleteInstance"
	/>
	<IconEditorModal
		:ref="setIconEditorModal"
		:instance-id="currentIconEditorInstance?.id"
		:config="currentIconEditorInstance?.icon_config"
		@saved="handleInstanceIconSaved"
	/>
	<ContextMenu :ref="setInstanceOptions" :label="formatMessage(messages.instanceActionsLabel)">
		<template #remove_from_favorites="{ option }">
			<StarIcon style="color: var(--color-text-default); fill: var(--color-text-default)" />
			{{ option.label }}
		</template>
	</ContextMenu>
</template>

<style scoped>
.bread-library h2 {
	font-family: var(--bread-font-display);
	letter-spacing: -0.04em;
}

.bread-library-heading {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1rem;
}

.bread-library-heading h2 {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.bread-library-heading p {
	margin: 0.2rem 0 0;
	color: var(--bread-color-text-muted);
	font-size: 0.82rem;
}

.bread-library-count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.35rem;
	height: 1.35rem;
	padding: 0 0.35rem;
	border-radius: var(--bread-radius-pill);
	background: var(--bread-color-surface-raised);
	color: var(--bread-color-text-muted);
	font-family: var(--bread-font-body);
	font-size: 0.72rem;
	letter-spacing: 0;
	vertical-align: middle;
}

.bread-library-view-all {
	color: var(--bread-color-brand-bright);
	font-size: 0.82rem;
	font-weight: 700;
}

.bread-library-modern {
	min-height: 500px;
	padding: var(--bread-space-3) 0 var(--bread-space-8);
	color: var(--bread-color-text);
}

.bread-library-modern__header {
	padding: var(--bread-space-5);
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-xl);
	background:
		radial-gradient(circle at 85% 0%, rgb(243 169 54 / 16%), transparent 18rem),
		linear-gradient(135deg, var(--bread-color-surface-panel), var(--bread-color-surface-subtle));
	box-shadow: 0 1rem 2rem rgb(0 0 0 / 12%);
}

.bread-library-modern__eyebrow {
	color: var(--bread-color-brand-bright);
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.16em;
	text-transform: uppercase;
}

.bread-library-modern__header-row {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--bread-space-4);
	margin-top: var(--bread-space-2);
}

.bread-library-modern h1,
.bread-library-modern h2,
.bread-library-modern p {
	margin: 0;
}

.bread-library-modern h1,
.bread-library-modern h2 {
	font-family: var(--bread-font-display);
	letter-spacing: -0.04em;
}

.bread-library-modern h1 {
	margin-top: 0.25rem;
	font-size: clamp(1.8rem, 3vw, 2.8rem);
}

.bread-library-modern__header-row p {
	margin-top: 0.3rem;
	color: var(--bread-color-text-muted);
	font-size: 0.9rem;
}

.bread-library-modern__count {
	display: flex;
	align-items: flex-end;
	gap: 0.5rem;
	color: var(--bread-color-text-muted);
	font-size: 0.72rem;
	text-transform: uppercase;
}

.bread-library-modern__count strong {
	color: var(--bread-color-text);
	font-family: var(--bread-font-display);
	font-size: 2rem;
	line-height: 1;
}

.bread-library-modern__toolbar {
	margin-top: var(--bread-space-5);
	padding-top: var(--bread-space-4);
	border-top: 1px solid var(--bread-color-border-subtle);
}

.bread-library-modern__toolbar :deep(.bread-library-toolbar__filters),
.bread-library-modern__toolbar :deep(.bread-library-toolbar__secondary-action) {
	display: none;
}

.bread-library-modern__layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(15rem, 19rem);
	gap: var(--bread-space-5);
	margin-top: var(--bread-space-5);
}

.bread-library-modern__main,
.bread-library-modern__rail {
	min-width: 0;
}

.bread-library-modern__main {
	display: flex;
	flex-direction: column;
	gap: var(--bread-space-5);
}

.bread-library-modern__feature-grid {
	display: grid;
	grid-template-columns: minmax(0, 1.45fr) minmax(15rem, 0.8fr);
	gap: var(--bread-space-4);
}

.bread-library-modern__feature,
.bread-library-modern__command-card,
.bread-library-modern__rail-card,
.bread-library-modern__instances {
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-xl);
	background: var(--bread-color-surface-panel);
}

.bread-library-modern__feature {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: var(--bread-space-3);
	padding: var(--bread-space-4);
	background:
		linear-gradient(150deg, color-mix(in srgb, var(--bread-color-brand) 12%, transparent), transparent 45%),
		var(--bread-color-surface-panel);
}

.bread-library-modern__feature-heading {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
}

.bread-library-modern__feature-heading span:first-child,
.bread-library-modern__command-heading span {
	color: var(--bread-color-brand-bright);
	font-size: 0.65rem;
	font-weight: 800;
	letter-spacing: 0.14em;
}

.bread-library-modern__feature-heading h2 {
	margin-top: 0.3rem;
	font-size: 1.35rem;
}

.bread-library-modern__feature-heading p {
	margin-top: 0.2rem;
	color: var(--bread-color-text-muted);
	font-size: 0.78rem;
	text-transform: capitalize;
}

.bread-library-modern__status {
	padding: 0.28rem 0.5rem;
	border: 1px solid color-mix(in srgb, var(--bread-color-brand) 50%, transparent);
	border-radius: var(--bread-radius-pill);
	background: color-mix(in srgb, var(--bread-color-brand) 14%, transparent);
	color: var(--bread-color-brand-bright) !important;
	font-size: 0.62rem !important;
	letter-spacing: 0.08em !important;
}

.bread-library-modern__feature-card {
	min-height: 14rem;
	flex: 1;
}

.bread-library-modern__feature-card :deep(.bread-instance-card) {
	height: 100%;
	min-height: 14rem;
	max-height: 25rem;
	border-radius: var(--bread-radius-lg) !important;
}

.bread-library-modern__command-card {
	display: flex;
	flex-direction: column;
	gap: 0.55rem;
	padding: var(--bread-space-4);
	background: var(--bread-color-surface-subtle);
}

.bread-library-modern__command-heading {
	margin-bottom: 0.35rem;
}

.bread-library-modern__command-heading h2 {
	margin-top: 0.35rem;
	font-size: 1.1rem;
}

.bread-library-modern__command-card button,
.bread-library-modern__command-card a {
	display: flex;
	align-items: center;
	gap: 0.7rem;
	width: 100%;
	padding: 0.65rem 0.7rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-md);
	background: color-mix(in srgb, var(--bread-color-surface-panel) 80%, transparent);
	color: var(--bread-color-text);
	text-align: left;
	text-decoration: none;
	cursor: pointer;
	transition: border-color 140ms ease, transform 140ms ease, background 140ms ease;
}

.bread-library-modern__command-card button:hover,
.bread-library-modern__command-card a:hover {
	border-color: var(--bread-color-brand);
	background: var(--bread-color-surface-elevated);
	transform: translateX(2px);
}

.bread-library-modern__command-card svg,
.bread-library-modern__command-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.8rem;
	height: 1.8rem;
	flex: 0 0 auto;
	border-radius: var(--bread-radius-sm);
	background: color-mix(in srgb, var(--bread-color-brand) 18%, transparent);
	color: var(--bread-color-brand-bright);
}

.bread-library-modern__command-card span:not(.bread-library-modern__command-icon) {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 0.12rem;
}

.bread-library-modern__command-card small {
	color: var(--bread-color-text-muted);
	font-size: 0.68rem;
}

.bread-library-modern__instances {
	padding: var(--bread-space-4);
}

.bread-library-modern__section-heading {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: var(--bread-space-3);
}

.bread-library-modern__section-heading h2 {
	margin-top: 0.25rem;
	font-size: 1.35rem;
}

.bread-library-modern__group-count {
	color: var(--bread-color-text-muted);
	font-size: 0.75rem;
}

.bread-library-modern__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(17rem, 100%), 1fr));
	align-items: start;
	gap: var(--bread-space-4);
}

.bread-library-modern__card-slot {
	display: flex;
	min-height: 0;
	min-width: 0;
	max-width: 30rem;
	contain: layout paint;
	transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.bread-library-modern__card-slot :deep(.bread-instance-card) {
	width: 100%;
	min-width: 0;
	max-width: 100%;
	min-height: 0;
}

.bread-library-card-enter-active,
.bread-library-card-leave-active,
.bread-library-card-move {
	transition: opacity 180ms ease, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.bread-library-card-enter-from,
.bread-library-card-leave-to {
	opacity: 0;
	transform: translateY(0.5rem) scale(0.98);
}

.bread-library-card-leave-active {
	position: absolute;
}

.bread-library-modern__empty {
	padding: 2rem 0;
	color: var(--bread-color-text-muted);
	text-align: center;
}

.bread-library-modern__rail {
	display: flex;
	flex-direction: column;
	gap: var(--bread-space-4);
}

.bread-library-modern__rail-card {
	padding: var(--bread-space-4);
}

.bread-library-modern__rail-card h2 {
	margin-top: 0.4rem;
	font-size: 1.1rem;
}

.bread-library-modern__metrics {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.6rem;
	margin-top: var(--bread-space-4);
}

.bread-library-modern__metrics div {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 0.1rem;
	padding: 0.65rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-md);
	background: var(--bread-color-surface-subtle);
}

.bread-library-modern__metrics strong {
	overflow: hidden;
	color: var(--bread-color-text);
	font-family: var(--bread-font-display);
	font-size: 1.2rem;
	text-overflow: ellipsis;
	text-transform: capitalize;
	white-space: nowrap;
}

.bread-library-modern__metrics span,
.bread-library-modern__rail-card p {
	color: var(--bread-color-text-muted);
	font-size: 0.7rem;
}

.bread-library-modern__rail-card--accent {
	background:
		radial-gradient(circle at 100% 0%, rgb(243 169 54 / 18%), transparent 12rem),
		var(--bread-color-surface-subtle);
}

.bread-library-modern__rail-mark {
	display: grid;
	width: 2rem;
	height: 2rem;
	place-items: center;
	border-radius: var(--bread-radius-md);
	background: var(--bread-color-brand);
	color: var(--bread-color-brand-contrast);
	font-size: 1.2rem;
	font-weight: 800;
}

.bread-library-modern__rail-card--accent p {
	margin: 0.5rem 0 1rem;
	line-height: 1.45;
}

.bread-library-modern__rail-card--accent :deep([data-button]) {
	width: 100%;
	justify-content: center;
}

@media (max-width: 70rem) {
	.bread-library-modern__layout {
		grid-template-columns: 1fr;
	}

	.bread-library-modern__rail {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 46rem) {
	.bread-library-modern__header-row,
	.bread-library-modern__feature-grid,
	.bread-library-modern__rail {
		grid-template-columns: 1fr;
		flex-direction: column;
		align-items: stretch;
	}

	.bread-library-modern__count {
		align-self: flex-start;
	}
}

.bread-library :deep(.bread-library-toolbar__secondary-action),
.bread-library :deep(.bread-library-toolbar__filters) {
	display: none;
}

.bread-library :deep(.bread-library-toolbar__primary) {
	align-items: center;
}

.bread-library :deep(.bread-library-toolbar__primary > [data-button]:last-child) {
	margin-left: auto;
}

:global(.instance-group-reorder-ghost) {
	opacity: 0.35;
}

:global(html.instance-group-reordering),
:global(html.instance-group-reordering *) {
	-webkit-user-select: none !important;
	cursor: grabbing !important;
	user-select: none !important;
}

:global(.instance-group-reorder-fallback) {
	opacity: 0.9;
	pointer-events: none;
}
</style>
