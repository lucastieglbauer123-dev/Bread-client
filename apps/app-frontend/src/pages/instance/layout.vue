<template>
	<div v-if="instance" class="bread-instance-page" :class="{ 'flex h-full flex-col': isFixedRender }">
		<div
			:class="['bread-instance-header-wrap p-6 pr-2 pb-4', { 'shrink-0': isFixedRender }]"
			@contextmenu.prevent.stop="(event) => handleRightClick(event)"
		>
			<ExportModal v-if="!instance.quarantined" ref="exportModal" :instance="instance" />
			<ConfirmDeleteInstanceModal
				ref="deleteConfirmModal"
				:instances="selectedInstanceToDelete ? [selectedInstanceToDelete] : []"
				@delete="deleteSelectedInstance"
			/>
			<InstanceSettingsModal
				:key="instance.id"
				ref="settingsModal"
				class="bread-instance-settings-modal"
				:instance="instance"
				:offline="offline"
				@unlinked="refreshInstance"
			/>
			<UpdateToPlayModal ref="updateToPlayModal" :instance="instance" />
			<SharedInstanceUpdateModal
				ref="sharedInstanceUpdateModal"
				@accepted="hideAcceptedSharedInstanceUpdate"
				@complete="handleSharedInstanceUpdateComplete"
				@shared-instance-unavailable="handleSharedInstanceUnavailable"
				@report="(event) => reportSharedInstance(event, true)"
			/>
			<SharedInstanceInstallModal
				ref="sharedInstanceReportModal"
				@reported="handleSharedInstanceReported"
			/>
			<InstancePageHeader
				:instance="instance"
				:icon-src="icon"
				:is-server-instance="isServerInstance"
				:show-instance-play-time="showInstancePlayTime"
				:time-played="timePlayed"
				:playing="playing"
				:loading="loading"
				:stopping="stopping"
				:loading-server-ping="loadingServerPing"
				:players-online="playersOnline"
				:status-online="statusOnline"
				:ping="ping"
				:minecraft-server="minecraftServer"
				@repair="() => repairInstance()"
				@stop="() => stopInstance('InstancePage')"
				@play="() => startInstance('InstancePage')"
				@delete="requestInstanceDeletion"
				@play-server="() => handlePlayServer()"
				@settings="() => settingsModal?.show()"
				@open-folder="() => instance && showInstanceInFolder(instance.id)"
				@export="() => !instance?.quarantined && exportModal?.show()"
				@create-shortcut="() => createShortcut()"
				@report="reportSharedInstance"
			/>
		</div>
		<div :class="['bread-instance-tab-wrap px-6', { 'shrink-0': isFixedRender }]">
			<NavTabs :links="tabs" />
			<InstanceAdmonitions
				class="mt-4"
				:instance="instance"
				:shared-instance-unavailable-reason="sharedInstanceUnavailableReason"
				:shared-instance-unavailable-manager="sharedInstanceUnavailableManager"
				:shared-instance-wrong-account="sharedInstanceWrongAccount"
				:shared-instance-expected-user-id="sharedInstanceExpectedUserId"
				:shared-instance-role="instance.shared_instance?.role"
				:shared-instance-signed-out="sharedInstanceSignedOut"
				@published="refreshInstance"
				@delete="requestInstanceDeletion"
			/>
		</div>
		<div :class="['bread-instance-body p-6 pt-4', { 'min-h-0 flex-1 overflow-y-auto': isFixedRender }]">
			<RouterView v-slot="{ Component }">
				<template v-if="Component">
					<Suspense
						:key="instance.id"
						@pending="subpagePending = true"
						@resolve="subpagePending = false"
					>
						<component :is="Component" />
					</Suspense>
				</template>
			</RouterView>
		</div>
		<ContextMenu ref="options" :label="formatMessage(messages.instanceActionsLabel)" />
	</div>
</template>
<script setup lang="ts">
import {
	BoxesIcon,
	ClipboardCopyIcon,
	EditIcon,
	FolderOpenIcon,
	GlobeIcon,
	ImagesIcon,
	PlayIcon,
	PlusIcon,
	SettingsIcon,
	StopCircleIcon,
	TerminalSquareIcon,
	UserPlusIcon,
} from '@modrinth/assets'
import {
	commonMessages,
	ContextMenu,
	defineMessages,
	injectNotificationManager,
	NavTabs,
	useLoadingBarToken,
	useVIntl,
} from '@modrinth/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useOnline } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { computed, type Component, type ComputedRef, onUnmounted, ref, shallowRef, watch } from 'vue'
import {
	onBeforeRouteUpdate,
	type RouteLocationNormalizedLoaded,
	useRoute,
	useRouter,
} from 'vue-router'

import ExportModal from '@/components/ui/ExportModal.vue'
import ConfirmDeleteInstanceModal from '@/components/ui/modal/ConfirmDeleteInstanceModal.vue'
import UpdateToPlayModal from '@/components/ui/modal/UpdateToPlayModal.vue'
import SharedInstanceInstallModal from '@/components/ui/shared-instances/shared-instance-install-modal/index.vue'
import SharedInstanceUpdateModal from '@/components/ui/shared-instances/SharedInstanceUpdateModal.vue'
import {
	fetchCachedServerStatus,
	getFreshCachedServerStatus,
} from '@/composables/instances/use-server-status-query'
import { useAppEvent } from '@/composables/use-app-event'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { handleSevereError } from '@/composables/use-error.js'
import { useInstanceConsole } from '@/composables/useInstanceConsole'
import { trackEvent } from '@/helpers/analytics'
import { toError } from '@/helpers/errors'
import {
	getSharedInstanceUnavailableReason,
	install_existing_instance,
	install_get_shared_instance_preview,
	install_pack_to_existing_instance,
	isSharedInstanceUnavailableError,
	type SharedInstanceUnavailableReason,
} from '@/helpers/install'
import {
	get_full_path,
	get_global_synced_options,
	getInstanceIconUrl,
	kill,
	refresh_content_updates,
	remove,
	run,
} from '@/helpers/instance'
import { useSharedInstanceErrors } from '@/helpers/shared-instance-errors'
import type { GameInstance } from '@/helpers/types'
import { createInstanceShortcut, showInstanceInFolder } from '@/helpers/utils.js'
import type { ServerStatus } from '@/helpers/worlds'
import { useRootBreadcrumb } from '@/providers/breadcrumbs'
import { provideInstanceBackup } from '@/providers/instance-backup'
import { injectServerInstall } from '@/providers/server-install'

import InstanceAdmonitions from './components/admonitions/index.vue'
import InstancePageHeader from './components/page-header/index.vue'
import InstanceSettingsModal from './components/settings-modal/index.vue'
import { provideInstancePage } from './instance-context'
import {
	instanceContentQueryOptions,
	instanceDetailQueryOptions,
	instanceKeys,
	instanceLinkedProjectQueryOptions,
	instanceProcessesQueryOptions,
} from './query-options'
import { createSharedInstanceContext, provideSharedInstance } from './shared-instance-context'

dayjs.extend(relativeTime)

const { addNotification, handleError } = injectNotificationManager()
const { playServerProject } = injectServerInstall()
const queryClient = useQueryClient()
const route = useRoute()
const { formatMessage } = useVIntl()

const messages = defineMessages({
	play: { id: 'app.instance.action.play', defaultMessage: 'Play' },
	stop: { id: 'app.instance.action.stop', defaultMessage: 'Stop' },
	addContent: { id: 'app.instance.action.add-content', defaultMessage: 'Add content' },
	edit: { id: 'app.instance.action.edit', defaultMessage: 'Edit' },
	copyPath: { id: 'app.instance.action.copy-path', defaultMessage: 'Copy path' },
	openFolder: { id: 'app.instance.action.open-folder', defaultMessage: 'Open folder' },
	instanceActionsLabel: {
		id: 'app.instance.actions.label',
		defaultMessage: 'Instance actions',
	},
	contentTab: { id: 'app.instance.tab.content', defaultMessage: 'Mods' },
	resourcePacksTab: { id: 'app.instance.tab.resource-packs', defaultMessage: 'Resource Packs' },
	shadersTab: { id: 'app.instance.tab.shaders', defaultMessage: 'Shaders' },
	datapacksTab: { id: 'app.instance.tab.datapacks', defaultMessage: 'Datapacks' },
	filesTab: { id: 'app.instance.tab.files', defaultMessage: 'Files' },
	screenshotsTab: { id: 'app.instance.tab.screenshots', defaultMessage: 'Screenshots' },
	worldsTab: { id: 'app.instance.tab.worlds', defaultMessage: 'Worlds' },
	logsTab: { id: 'app.instance.tab.logs', defaultMessage: 'Logs' },
	shareTab: { id: 'app.instance.tab.share', defaultMessage: 'Share' },
	settingsTab: { id: 'app.instance.tab.settings', defaultMessage: 'Settings' },
	shortcutCreated: {
		id: 'app.instance.shortcut.created',
		defaultMessage: 'Shortcut created',
	},
	shortcutCreationError: {
		id: 'app.instance.shortcut.creation-error',
		defaultMessage: 'Error creating shortcut',
	},
})

const router = useRouter()
const displayedInstanceRoute = shallowRef(router.currentRoute.value)
watch(
	() => router.currentRoute.value,
	(nextRoute) => {
		if (nextRoute.path.startsWith('/instance/')) {
			displayedInstanceRoute.value = nextRoute
		}
	},
	{ immediate: true },
)
const appSettings = useAppSettings()
const showInstancePlayTime = computed(() => appSettings.getFeatureFlag('show_instance_play_time'))

const online = useOnline()
const offline = computed(() => !online.value)
const instanceId = computed(() => String(displayedInstanceRoute.value.params.id ?? ''))
const instanceQuery = useQuery(
	computed(() => ({
		...instanceDetailQueryOptions(instanceId.value),
		enabled: !!instanceId.value,
	})),
)
useQuery(
	computed(() => ({
		...instanceContentQueryOptions(instanceId.value, (error) => handleError(toError(error))),
		enabled: !!instanceId.value,
	})),
)
const instance = computed(() => instanceQuery.data.value)
const globalSyncedOptionsQuery = useQuery({
	queryKey: ['global-synced-options'],
	queryFn: get_global_synced_options,
})
useQuery(
	computed(() => ({
		queryKey: instanceKeys.contentUpdateCheck(instanceId.value),
		queryFn: async () => {
			const targetInstanceId = instanceId.value
			await refresh_content_updates(targetInstanceId)
			await queryClient.invalidateQueries({
				queryKey: instanceKeys.content(targetInstanceId),
			})
			return targetInstanceId
		},
		enabled: !!instanceId.value && !offline.value && instance.value?.install_stage === 'installed',
		staleTime: 10 * 60_000,
		gcTime: 30 * 60_000,
		retry: false,
	})),
)
const linkedProjectId = computed(
	() => instance.value?.link?.server_project_id ?? instance.value?.link?.project_id ?? '',
)
const linkedProjectQuery = useQuery(
	computed(() => ({
		...instanceLinkedProjectQueryOptions(linkedProjectId.value),
		enabled: !!linkedProjectId.value && !offline.value,
	})),
)
const linkedProjectV3 = computed(() => linkedProjectQuery.data.value ?? undefined)
const isServerInstance = computed(() => linkedProjectV3.value?.minecraft_server != null)
const processesQuery = useQuery(
	computed(() => ({
		...instanceProcessesQueryOptions(instanceId.value),
		enabled: !!instanceId.value,
	})),
)
const playing = computed(() => (processesQuery.data.value?.length ?? 0) > 0)

async function ensureCriticalContent(targetInstanceId: string) {
	await queryClient.ensureQueryData(
		instanceContentQueryOptions(targetInstanceId, (error) => handleError(toError(error))),
	)
}

async function ensureCriticalInstanceData(targetInstanceId: string) {
	await Promise.all([
		queryClient.ensureQueryData(instanceDetailQueryOptions(targetInstanceId)),
		ensureCriticalContent(targetInstanceId),
	])
}

function isUnmanagedInstanceError(error: unknown) {
	return error instanceof Error && error.message.includes('is not managed')
}

try {
	await ensureCriticalInstanceData(instanceId.value)
} catch (error) {
	if (isUnmanagedInstanceError(error)) await router.replace('/')
	else handleError(toError(error))
}

onBeforeRouteUpdate(async (to, from) => {
	const targetInstanceId = String(to.params.id ?? '')
	const currentInstanceId = String(from.params.id ?? '')
	if (!targetInstanceId || targetInstanceId === currentInstanceId) return

	try {
		await ensureCriticalInstanceData(targetInstanceId)
		instanceId.value = targetInstanceId
	} catch (error) {
		if (isUnmanagedInstanceError(error)) return { path: '/' }
		handleError(toError(error))
		return false
	}
})

useRootBreadcrumb({
	slot: 'instance',
	id: () => `instance:${instanceId.value}`,
	label: () => instance.value?.name ?? formatMessage(commonMessages.loadingLabel),
	visual: () => ({
		type: 'image',
		src: getInstanceIconUrl(instance.value?.icon_path),
		alt: instance.value?.name,
		tintBy: instance.value?.id ?? instanceId.value,
	}),
	to: () => `/instance/${encodeURIComponent(instanceId.value)}`,
})

const loading = ref(false)
const checkingSharedInstanceLaunch = ref(false)
const subpagePending = ref(false)
const stopping = ref(false)
const exportModal = ref<InstanceType<typeof ExportModal>>()
const updateToPlayModal = ref<InstanceType<typeof UpdateToPlayModal>>()
const sharedInstanceUpdateModal = ref<InstanceType<typeof SharedInstanceUpdateModal>>()
const sharedInstanceReportModal = ref<InstanceType<typeof SharedInstanceInstallModal>>()
const deleteConfirmModal = ref<InstanceType<typeof ConfirmDeleteInstanceModal>>()
const settingsModal = ref<InstanceType<typeof InstanceSettingsModal>>()
const selectedInstanceToDelete = ref<GameInstance | null>(null)
const hiddenSharedInstanceUpdateKey = ref<string | null>(null)

const { notifySharedInstanceError, notifySharedInstanceUnavailable } = useSharedInstanceErrors()

useLoadingBarToken(subpagePending)
useLoadingBarToken(computed(() => instanceQuery.isPending.value && !instance.value))

const minecraftServer = computed(() => linkedProjectV3.value?.minecraft_server)
const javaServerPingData = computed(() => linkedProjectV3.value?.minecraft_java_server?.ping?.data)
const liveServerStatusOnline = ref(false)
const statusOnline = computed(() => liveServerStatusOnline.value || !!javaServerPingData.value)
const playersOnline = ref<number | undefined>(undefined)
const ping = ref<number | undefined>(undefined)
const loadingServerPing = ref(false)
const sharedInstanceState = createSharedInstanceContext(
	instance,
	offline,
	notifySharedInstanceError,
)
provideSharedInstance(sharedInstanceState)
const {
	actionsLocked: sharedInstanceActionsLocked,
	expectedUserId: sharedInstanceExpectedUserId,
	refreshUpdatePreview: refreshSharedInstanceUpdatePreview,
	setUnavailable: setSharedInstanceUnavailable,
	signedOut: sharedInstanceSignedOut,
	unavailableManager: sharedInstanceUnavailableManager,
	unavailableReason: sharedInstanceUnavailableReason,
	updatePreview: sharedInstanceUpdatePreview,
	wrongAccount: sharedInstanceWrongAccount,
} = sharedInstanceState
const sharedInstanceUpdateKey = computed(() => {
	const instanceId = instance.value?.id
	const latestVersion = sharedInstanceUpdatePreview.value?.latestVersion
	return instanceId && latestVersion !== undefined ? `${instanceId}:${latestVersion}` : null
})
const sharedInstanceUpdateAvailable = computed(
	() =>
		sharedInstanceUpdatePreview.value?.updateAvailable === true &&
		sharedInstanceUpdateKey.value !== hiddenSharedInstanceUpdateKey.value,
)

function applyServerStatus(status: ServerStatus) {
	playersOnline.value = status.players?.online
	ping.value = status.ping
	liveServerStatusOnline.value = true
	loadingServerPing.value = true
}

function resetServerStatus() {
	ping.value = undefined
	playersOnline.value = undefined
	liveServerStatusOnline.value = false
	loadingServerPing.value = false
}

const serverAddress = computed(() => linkedProjectV3.value?.minecraft_java_server?.address)
watch(
	[instanceId, serverAddress, isServerInstance],
	([requestedInstanceId, address, serverInstance]) => {
		resetServerStatus()
		if (serverInstance && address) {
			const cachedStatus = getFreshCachedServerStatus(queryClient, address)
			if (cachedStatus) {
				applyServerStatus(cachedStatus)
			} else {
				playersOnline.value = undefined
				ping.value = undefined
				loadingServerPing.value = false
			}

			fetchCachedServerStatus(queryClient, address)
				.then((status) => {
					if (instanceId.value !== requestedInstanceId || serverAddress.value !== address) return
					applyServerStatus(status)
				})
				.catch((error) => {
					console.error(`Failed to fetch server status for ${address}:`, error)
				})
				.finally(() => {
					if (instanceId.value !== requestedInstanceId) return
					loadingServerPing.value = true
				})
		} else {
			loadingServerPing.value = true
		}
	},
	{ immediate: true },
)

async function refreshInstance() {
	await Promise.all([instanceQuery.refetch(), sharedInstanceState.refreshAvailability()])
}

async function refreshPlayState() {
	await processesQuery.refetch()
}

watch(
	instanceQuery.error,
	(error) => {
		if (!error) return
		if (error.message.includes('is not managed')) void router.replace('/')
		else handleError(toError(error))
	},
	{ immediate: true },
)
watch(
	linkedProjectQuery.error,
	(error) => {
		if (error) handleError(toError(error))
	},
	{ immediate: true },
)

const basePath = computed(() => `/instance/${encodeURIComponent(instanceId.value)}`)

/**
 * Per-route layout mode.
 * - `'scroll'` (default): the whole instance page scrolls inside `.app-viewport`. This lets
 *   `position: sticky` children (and the viewport-rooted `IntersectionObserver` used by
 *   `useStickyObserver`) work correctly.
 * - `'fixed'`: the header + tabs are pinned and only the tab body scrolls in its own container.
 *   Used by tabs whose content (e.g. the log console) needs a bounded height to resolve `h-full`.
 */
const renderMode = computed<'scroll' | 'fixed'>(() =>
	route.meta.renderMode === 'fixed' ? 'fixed' : 'scroll',
)
const isFixedRender = computed(() => renderMode.value === 'fixed')
const currentUserCanUseSharedInstances = sharedInstanceState.currentUserCanUseSharedInstances
const showShareTab = computed(() => {
	const linkType = instance.value?.link?.type

	return (
		currentUserCanUseSharedInstances.value &&
		!instance.value?.quarantined &&
		instance.value?.shared_instance?.role !== 'member' &&
		linkType !== 'server_project' &&
		linkType !== 'server_project_modpack'
	)
})

const tabs = computed(() => {
	const instanceTabs: {
		label: string
		href: string
		shown?: boolean
		icon?: Component
		isActive?: (route: RouteLocationNormalizedLoaded) => boolean
		onClick?: (event: MouseEvent) => void
	}[] = [
		{
			label: formatMessage(messages.contentTab),
			href: `${basePath.value}`,
			icon: BoxesIcon,
		},
	]

	instanceTabs.push(
		{
			label: formatMessage(messages.resourcePacksTab),
			href: `${basePath.value}#resource-packs`,
			icon: BoxesIcon,
			isActive: (currentRoute) =>
				currentRoute.path === basePath.value && currentRoute.hash === '#resource-packs',
		},
		{
			label: formatMessage(messages.shadersTab),
			href: `${basePath.value}#shaders`,
			icon: BoxesIcon,
			isActive: (currentRoute) =>
				currentRoute.path === basePath.value && currentRoute.hash === '#shaders',
		},
		{
			label: formatMessage(messages.datapacksTab),
			href: `${basePath.value}#datapacks`,
			icon: BoxesIcon,
			isActive: (currentRoute) =>
				currentRoute.path === basePath.value && currentRoute.hash === '#datapacks',
		},
	)

	if (instance.value?.visible_tabs.files !== false) {
		instanceTabs.push({
			label: formatMessage(messages.filesTab),
			href: `${basePath.value}/files`,
			icon: FolderOpenIcon,
		})
	}

	const screenshotsGloballyAvailable = globalSyncedOptionsQuery.data.value?.screenshots === true
	if (!screenshotsGloballyAvailable || instance.value?.visible_tabs.screenshots !== false) {
		instanceTabs.push({
			label: formatMessage(messages.screenshotsTab),
			href: `${basePath.value}/screenshots`,
			shown: route.path.startsWith(`${basePath.value}/screenshots`),
			icon: ImagesIcon,
		})
	}

	if (instance.value?.visible_tabs.worlds !== false) {
		instanceTabs.push({
			label: formatMessage(messages.worldsTab),
			href: `${basePath.value}/worlds`,
			icon: GlobeIcon,
		})
	}

	instanceTabs.push({
		label: formatMessage(messages.logsTab),
		href: `${basePath.value}/logs`,
		icon: TerminalSquareIcon,
	})

	if (showShareTab.value) {
		instanceTabs.push({
			label: formatMessage(messages.shareTab),
			href: `${basePath.value}/share`,
			shown: route.path.startsWith(`${basePath.value}/share`),
			icon: UserPlusIcon,
		})
	}

	instanceTabs.push({
		label: formatMessage(messages.settingsTab),
		href: `${basePath.value}#settings`,
		icon: SettingsIcon,
		isActive: (currentRoute) =>
			currentRoute.path === basePath.value && currentRoute.hash === '#settings',
		onClick: () => settingsModal.value?.show(),
	})

	return instanceTabs
})

watch(
	() => ({
		quarantined: instance.value?.quarantined ?? false,
		routeName: router.currentRoute.value.name,
	}),
	({ quarantined, routeName }) => {
		if (quarantined && routeName === 'InstanceShare') {
			void router.replace(basePath.value)
		}
	},
	{ immediate: true },
)

const options = ref<InstanceType<typeof ContextMenu> | null>(null)

const launchInstance = async (context: string) => {
	if (!instance.value || instance.value.quarantined) return
	const currentInstance = instance.value
	loading.value = true
	try {
		await run(currentInstance.id)
		queryClient.setQueryData(instanceKeys.processes(currentInstance.id), [true])
	} catch (err) {
		handleSevereError(err, { instanceId: currentInstance.id })
	}
	loading.value = false

	if (!instance.value) return
	trackEvent('InstanceStart', {
		loader: instance.value.loader,
		game_version: instance.value.game_version,
		source: context,
	})
}

async function handleSharedInstanceUnavailable(
	reason: SharedInstanceUnavailableReason | null = null,
) {
	notifySharedInstanceUnavailable(reason, sharedInstanceUnavailableManager.value)
	await refreshInstance()
	setSharedInstanceUnavailable(reason)
}

function reviewSharedInstanceUpdate(event?: MouseEvent) {
	const currentInstance = instance.value
	const preview = sharedInstanceUpdatePreview.value
	if (
		!currentInstance ||
		currentInstance.shared_instance?.role !== 'member' ||
		!preview?.updateAvailable
	) {
		return
	}

	sharedInstanceUpdateModal.value?.show(
		currentInstance,
		preview,
		async () => {
			await refreshInstance()
		},
		event,
	)
}

function hideAcceptedSharedInstanceUpdate() {
	hiddenSharedInstanceUpdateKey.value = sharedInstanceUpdateKey.value
}

function handleSharedInstanceUpdateComplete(successful: boolean) {
	if (!successful && hiddenSharedInstanceUpdateKey.value === sharedInstanceUpdateKey.value) {
		hiddenSharedInstanceUpdateKey.value = null
	}
}

const startInstance = async (context: string) => {
	if (!instance.value || instance.value.quarantined) return
	if (checkingSharedInstanceLaunch.value || loading.value || playing.value) return

	const instanceId = instance.value.id
	const isSharedInstanceMember = instance.value.shared_instance?.role === 'member'
	const canCheckSharedInstanceUpdate =
		!!instance.value.shared_instance && !sharedInstanceActionsLocked.value && !offline.value

	if (canCheckSharedInstanceUpdate) {
		let preview: Awaited<ReturnType<typeof refreshSharedInstanceUpdatePreview>> = null
		checkingSharedInstanceLaunch.value = true
		try {
			preview = await refreshSharedInstanceUpdatePreview()
		} catch (error) {
			if (isSharedInstanceUnavailableError(error)) {
				await handleSharedInstanceUnavailable(getSharedInstanceUnavailableReason(error))
				return
			}
			notifySharedInstanceError(error)
		} finally {
			checkingSharedInstanceLaunch.value = false
		}

		if (instance.value?.id !== instanceId) return

		if (preview?.updateAvailable && sharedInstanceUpdateModal.value) {
			sharedInstanceUpdateModal.value.show(instance.value, preview, async () => {
				await refreshInstance()
				await launchInstance(context)
			})
			return
		}
	}

	if (updateToPlayModal.value?.hasUpdate) {
		if (isSharedInstanceMember) {
			updateToPlayModal.value.show(instance.value, null, async () => {
				await refreshInstance()
				await launchInstance(context)
			})
		} else {
			updateToPlayModal.value.show(instance.value)
		}
		return
	}

	await launchInstance(context)
}

const stopInstance = async (context: string) => {
	const currentInstance = instance.value
	if (!currentInstance) return
	stopping.value = true
	await kill(currentInstance.id).catch((error) => handleError(toError(error)))
	stopping.value = false
	queryClient.setQueryData(instanceKeys.processes(currentInstance.id), [])

	trackEvent('InstanceStop', {
		loader: currentInstance.loader,
		game_version: currentInstance.game_version,
		source: context,
	})
}

const handlePlayServer = async () => {
	if (!instance.value?.link?.project_id || instance.value.quarantined) return
	loading.value = true
	try {
		await playServerProject(instance.value.link.project_id)
	} finally {
		await refreshPlayState()
		loading.value = false
	}
}

function openSettings(tab?: number) {
	settingsModal.value?.show(tab)
}

async function browseContent(projectType?: string) {
	const currentInstance = instance.value
	if (!currentInstance || currentInstance.quarantined) return
	await router.push({
		path: `/browse/${projectType ?? (currentInstance.loader === 'vanilla' ? 'resourcepack' : 'mod')}`,
		query: { i: currentInstance.id },
	})
}

async function browseServers() {
	if (!instance.value || instance.value.quarantined) return
	await router.push({
		path: '/browse/server',
		query: { i: instance.value.id, from: 'worlds' },
	})
}

const repairInstance = async () => {
	const currentInstance = instance.value
	if (!currentInstance || currentInstance.quarantined) return
	if (
		currentInstance.install_stage !== 'pack_installed' &&
		(currentInstance.link?.type === 'modrinth_modpack' ||
			currentInstance.link?.type === 'server_project_modpack')
	) {
		await install_pack_to_existing_instance(currentInstance.id, {
			type: 'fromVersionId',
			project_id: currentInstance.link.project_id ?? currentInstance.link.server_project_id ?? '',
			version_id: currentInstance.link.version_id ?? currentInstance.link.content_version_id ?? '',
			title: currentInstance.name,
		}).catch((error) => handleError(toError(error)))
	} else {
		await install_existing_instance(currentInstance.id, false).catch((error) =>
			handleError(toError(error)),
		)
	}
}

const createShortcut = async () => {
	if (!instance.value || instance.value.quarantined) return
	try {
		const shortcutPath = await createInstanceShortcut(instance.value.name, instance.value.id)
		if (!shortcutPath) return

		addNotification({
			type: 'success',
			title: formatMessage(messages.shortcutCreated),
		})
	} catch (error: unknown) {
		addNotification({
			type: 'error',
			title: formatMessage(messages.shortcutCreationError),
			text: `${error}`,
		})
	}
}

async function reportSharedInstance(event?: MouseEvent, closeUpdateModal = false) {
	const reportInstance = instance.value
	const sharedInstance = reportInstance?.shared_instance
	if (!reportInstance || sharedInstance?.role !== 'member') return

	try {
		const preview = await install_get_shared_instance_preview(
			sharedInstance.id,
			reportInstance.name,
		)
		if (instance.value?.id !== reportInstance.id) return
		if (closeUpdateModal) sharedInstanceUpdateModal.value?.hide()
		sharedInstanceReportModal.value?.showReport(preview, sharedInstance.manager_id, event)
	} catch (error) {
		notifySharedInstanceError(error)
	}
}

function handleSharedInstanceReported(deleteInstance: boolean) {
	if (!deleteInstance || !instance.value) return
	requestInstanceDeletion()
}

function requestInstanceDeletion() {
	if (!instance.value) return
	selectedInstanceToDelete.value = instance.value
	deleteConfirmModal.value?.show()
}

async function deleteSelectedInstance() {
	const selectedInstance = selectedInstanceToDelete.value
	selectedInstanceToDelete.value = null
	if (!selectedInstance) return

	trackEvent('InstanceRemove', {
		loader: selectedInstance.loader,
		game_version: selectedInstance.game_version,
	})
	await router.push({ path: '/' })
	await remove(selectedInstance.id).catch((error) => handleError(toError(error)))
}

const handleRightClick = (event: MouseEvent) => {
	const canAddContent = !instance.value?.quarantined

	options.value?.open(event, [
		{
			id: 'stop',
			label: formatMessage(messages.stop),
			icon: StopCircleIcon,
			shown: playing.value,
			tone: 'red',
			action: () => void stopInstance('InstancePageContextMenu'),
		},
		{
			id: 'play',
			label: formatMessage(messages.play),
			icon: PlayIcon,
			shown: !playing.value && canAddContent,
			tone: 'brand',
			action: () => void startInstance('InstancePageContextMenu'),
		},
		{
			id: 'add_content',
			label: formatMessage(messages.addContent),
			icon: PlusIcon,
			shown: canAddContent,
			action: () => void browseContent(instance.value?.loader === 'vanilla' ? 'datapack' : 'mod'),
		},
		{ type: 'divider', shown: canAddContent },
		{
			id: 'edit',
			label: formatMessage(messages.edit),
			icon: EditIcon,
			action: openSettings,
		},
		{
			id: 'open_folder',
			label: formatMessage(messages.openFolder),
			icon: FolderOpenIcon,
			action: () => {
				if (instance.value) void showInstanceInFolder(instance.value.id)
			},
		},
		{
			id: 'copy_path',
			label: formatMessage(messages.copyPath),
			icon: ClipboardCopyIcon,
			action: () => void copyInstancePath(),
		},
	])
}

const copyInstancePath = async () => {
	if (!instance.value) return
	const fullPath = await get_full_path(instance.value.id)
	await navigator.clipboard.writeText(fullPath)
}

provideInstancePage({
	instanceId,
	instance: instance as ComputedRef<GameInstance>,
	linkedProject: linkedProjectV3,
	isServerInstance,
	sharedInstanceUpdateAvailable,
	offline,
	playing,
	loading,
	stopping,
	refreshInstance,
	refreshPlayState,
	play: startInstance,
	stop: stopInstance,
	playServer: handlePlayServer,
	openSettings,
	browseContent,
	browseServers,
	reviewSharedInstanceUpdate,
})
provideInstanceBackup(() => instance.value!)

function destroyInstanceConsole(targetInstanceId: string) {
	void useInstanceConsole(targetInstanceId).destroy()
	queryClient.removeQueries({ queryKey: instanceKeys.console(targetInstanceId), exact: true })
}

watch(instanceId, (currentInstanceId, previousInstanceId) => {
	if (!previousInstanceId || previousInstanceId === currentInstanceId) return
	destroyInstanceConsole(previousInstanceId)
})

useAppEvent('instance', async (event) => {
	if (event.instance_id !== instanceId.value || event.event !== 'removed') return
	if (route.path !== '/') await router.push({ path: '/' })
})

useAppEvent('process', (event) => {
	if (event.instance_id !== instanceId.value) return
	if (event.event === 'finished') {
		queryClient.setQueryData(instanceKeys.processes(event.instance_id), [])
		useInstanceConsole(event.instance_id).invalidate()
		void queryClient.invalidateQueries({ queryKey: instanceKeys.logs(event.instance_id) })
	} else if (event.event === 'launched') {
		queryClient.setQueryData(instanceKeys.processes(event.instance_id), [true])
	}
})

const icon = computed(() => getInstanceIconUrl(instance.value?.icon_path))

const timePlayed = computed(() => {
	return instance.value
		? instance.value.recent_time_played + instance.value.submitted_time_played
		: 0
})

onUnmounted(() => {
	if (instanceId.value) {
		destroyInstanceConsole(instanceId.value)
	}
})
</script>

<style scoped lang="scss">
.bread-instance-page {
	min-height: 100%;
	background: var(--bread-color-surface);
	color: var(--bread-color-text);
}

.bread-instance-header-wrap {
	background: var(--bread-color-bg);
	border-bottom: 1px solid var(--bread-color-border-subtle);
}

.bread-instance-header-wrap :deep(.bread-instance-header) {
	padding-bottom: var(--bread-space-5);
	border-bottom-color: transparent;
}

.bread-instance-header-wrap :deep(.bread-instance-header__row) {
	align-items: center;
}

.bread-instance-header-wrap :deep(.bread-instance-header__main) {
	align-items: center;
}

.bread-instance-header-wrap :deep(.bread-instance-header__title) {
	font-family: var(--bread-font-display);
	font-size: clamp(1.75rem, 3vw, 2.4rem);
	letter-spacing: -0.045em;
}

.bread-instance-header-wrap :deep(.page-header-metadata) {
	color: var(--bread-color-text-muted);
}

.bread-instance-header-wrap :deep([data-page-header-metadata-item]) {
	color: var(--bread-color-text-muted);
}

.bread-instance-header-wrap :deep([data-page-header-metadata-item] svg) {
	color: var(--bread-color-text-subtle);
}

.bread-instance-header-wrap :deep([data-button]) {
	min-height: 2.75rem;
}

.bread-instance-header-wrap :deep([data-button][data-color='red']) {
	border-color: color-mix(in srgb, var(--bread-color-danger) 55%, transparent);
	background: transparent;
	color: var(--bread-color-danger);
}

.bread-instance-tab-wrap {
	padding-top: var(--bread-space-4);
	padding-bottom: var(--bread-space-2);
}

.bread-instance-tab-wrap :deep(nav) {
	width: 100%;
	max-width: 100%;
	justify-content: flex-start;
	gap: 0.15rem;
	overflow-x: auto;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-surface-subtle);
	box-shadow: none;
	scrollbar-width: none;
}

.bread-instance-tab-wrap :deep(nav::-webkit-scrollbar) {
	display: none;
}

.bread-instance-tab-wrap :deep(nav .button-animation) {
	min-height: 2.5rem;
	border-radius: var(--bread-radius-md);
	color: var(--bread-color-text-muted);
	font-size: 0.82rem;
	white-space: nowrap;
}

.bread-instance-tab-wrap :deep(nav .button-animation:hover) {
	background: var(--bread-color-surface-raised);
	color: var(--bread-color-text);
}

.bread-instance-tab-wrap :deep(nav > .bg-button-bgSelected) {
	background: var(--bread-color-brand);
}

.bread-instance-tab-wrap :deep(nav > .bg-button-bgSelected ~ .button-animation) {
	color: var(--bread-color-text-muted);
}

.bread-instance-tab-wrap :deep(nav .text-button-textSelected) {
	color: var(--bread-color-brand-contrast) !important;
}

.bread-instance-body {
	padding-bottom: var(--bread-space-12);
}

.bread-instance-body :deep(.content-table),
.bread-instance-body :deep(.content-list) {
	border-color: var(--bread-color-border-subtle);
	background: var(--bread-color-surface-subtle);
}

.bread-instance-settings-modal :deep(.modal-content),
.bread-instance-settings-modal :deep(.settings-content) {
	background: var(--bread-color-surface);
}
</style>
