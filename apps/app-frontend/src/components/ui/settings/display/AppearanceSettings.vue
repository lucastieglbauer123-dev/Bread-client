<script setup lang="ts">
import {
	AppearanceSettingsLayout,
	Button,
	defineMessages,
	injectAuth,
	injectUserPreferences,
	provideAppearanceSettings,
	useVIntl,
	useSavable,
	injectFilePicker,
} from '@modrinth/ui'
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { type ColorTheme, isDarkTheme, useTheme } from '@/composables/use-theme.ts'
import { type AppSettings, get, set } from '@/helpers/settings.ts'
import { getOS } from '@/helpers/utils'
import { appSettingsModalContextKey } from '@/providers/app-settings-modal'

const theme = useTheme()
const { formatMessage } = useVIntl()
const auth = injectAuth()
const filePicker = injectFilePicker()
const { updatePreferences } = injectUserPreferences()
const settingsModal = inject(appSettingsModalContextKey, null)
const os = await getOS()
const settings = ref(await get())

const messages = defineMessages({
	breadEyebrow: {
		id: 'app.settings.bread.eyebrow',
		defaultMessage: 'PERSONALIZE',
	},
	breadHeading: {
		id: 'app.settings.bread.heading',
		defaultMessage: 'Make Bread Client',
	},
	breadHeadingAccent: {
		id: 'app.settings.bread.heading.accent',
		defaultMessage: 'yours.',
	},
	breadDescription: {
		id: 'app.settings.bread.description',
		defaultMessage: 'Your choices are saved on this device.',
	},
	accentTitle: {
		id: 'app.settings.bread.accent.title',
		defaultMessage: 'Accent colour',
	},
	accentDescription: {
		id: 'app.settings.bread.accent.description',
		defaultMessage: 'Use a color that feels right to you.',
	},
	restoreTitle: {
		id: 'app.settings.bread.restore.title',
		defaultMessage: 'Back to standard',
	},
	restoreDescription: {
		id: 'app.settings.bread.restore.description',
		defaultMessage: 'Restore the original Bread Client appearance at any time.',
	},
	restoreButton: {
		id: 'app.settings.bread.restore.button',
		defaultMessage: 'Restore standard',
	},
	classicLayout: {
		id: 'app.settings.bread.classic-layout',
		defaultMessage: 'Classic layout',
	},
	classicLayoutDescription: {
		id: 'app.settings.bread.classic-layout.description',
		defaultMessage: 'Use the familiar compact layout instead of the new Bread workspace.',
	},
	originalThemes: {
		id: 'app.settings.bread.original-themes',
		defaultMessage: 'Switch to original themes',
	},
	originalThemesDescription: {
		id: 'app.settings.bread.original-themes.description',
		defaultMessage: 'Show the original launcher themes alongside Bread themes.',
	},
	accentLime: {
		id: 'app.settings.bread.accent.lime',
		defaultMessage: 'Lime accent',
	},
	accentOrange: {
		id: 'app.settings.bread.accent.orange',
		defaultMessage: 'Orange accent',
	},
	accentBlue: {
		id: 'app.settings.bread.accent.blue',
		defaultMessage: 'Blue accent',
	},
	accentPink: {
		id: 'app.settings.bread.accent.pink',
		defaultMessage: 'Pink accent',
	},
})

type BreadAccent = 'lime' | 'orange' | 'blue' | 'pink'

const accentOptions: ReadonlyArray<{ id: BreadAccent; color: string; label: typeof messages.accentLime }> = [
	{ id: 'lime', color: '#cbed57', label: messages.accentLime },
	{ id: 'orange', color: '#f3a936', label: messages.accentOrange },
	{ id: 'blue', color: '#65c0e6', label: messages.accentBlue },
	{ id: 'pink', color: '#db7db2', label: messages.accentPink },
]

const accentPalette: Record<
	BreadAccent,
	{ brand: string; bright: string; hover: string; contrast: string; shadow: string }
> = {
	lime: {
		brand: '#cbed57',
		bright: '#dcff74',
		hover: '#e9ff9c',
		contrast: '#16210e',
		shadow: 'rgb(203 237 87 / 42%)',
	},
	orange: {
		brand: '#f3a936',
		bright: '#ffc45a',
		hover: '#ffd071',
		contrast: '#2b190b',
		shadow: 'rgb(243 169 54 / 42%)',
	},
	blue: {
		brand: '#65c0e6',
		bright: '#87d8f4',
		hover: '#abe8fb',
		contrast: '#10242c',
		shadow: 'rgb(101 192 230 / 42%)',
	},
	pink: {
		brand: '#db7db2',
		bright: '#eba2cb',
		hover: '#f4c2df',
		contrast: '#2c1424',
		shadow: 'rgb(219 125 178 / 42%)',
	},
}

function loadAccent(): BreadAccent {
	try {
		const stored = window.localStorage.getItem('bread-accent')
		if (stored && stored in accentPalette) return stored as BreadAccent
	} catch {
		// storage blocked or full
	}
	return 'orange'
}

const selectedAccent = ref<BreadAccent>(loadAccent())

function loadOriginalThemes(): boolean {
	try {
		return window.localStorage.getItem('bread-show-original-themes') === 'true'
	} catch {
		return false
	}
}

const showOriginalThemes = ref(loadOriginalThemes())
const classicLayout = ref(localStorage.getItem('bread-legacy-ui') === 'true')
const customBackground = ref(localStorage.getItem('bread-custom-background') ?? '')

function applyCustomBackground() {
	if (customBackground.value) {
		document.documentElement.style.setProperty('--bread-custom-background', `url("${customBackground.value}")`)
	} else {
		document.documentElement.style.removeProperty('--bread-custom-background')
	}
}

async function importBackground() {
	const picked = await filePicker.pickImage()
	if (!picked?.previewUrl) return
	customBackground.value = picked.previewUrl
	localStorage.setItem('bread-custom-background', customBackground.value)
	applyCustomBackground()
}

async function importPalette() {
	const picked = await filePicker.pickFiles?.({ multiple: false })
	const text = await picked?.[0]?.file?.text()
	if (!text) return
	try {
		const palette = JSON.parse(text)
		const root = document.documentElement
		for (const key of ['bg', 'surface', 'surfacePanel', 'surfaceRaised', 'border', 'borderStrong', 'text', 'textMuted', 'brand', 'brandBright', 'brandHover', 'brandContrast']) {
			if (typeof palette[key] === 'string') root.style.setProperty(`--bread-color-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`, palette[key])
		}
		localStorage.setItem('bread-custom-palette', JSON.stringify(palette))
	} catch {
		// Invalid palette files are ignored; the current theme remains active.
	}
}

function applyAccent(accent: BreadAccent): void {
	const colors = accentPalette[accent]
	const root = document.documentElement
	root.style.setProperty('--bread-color-brand', colors.brand)
	root.style.setProperty('--bread-color-brand-bright', colors.bright)
	root.style.setProperty('--bread-color-brand-hover', colors.hover)
	root.style.setProperty('--bread-color-brand-contrast', colors.contrast)
	root.style.setProperty('--bread-color-brand-shadow', colors.shadow)
	root.style.setProperty('--color-green', colors.brand)
	root.style.setProperty('--color-brand', colors.brand)
	root.style.setProperty('--color-button-bg-selected', colors.brand)
	root.style.setProperty('--color-button-text-selected', colors.contrast)
	root.style.setProperty('--color-green-highlight', `color-mix(in srgb, ${colors.brand} 22%, transparent)`)
	root.style.setProperty('--color-green-bg', `color-mix(in srgb, ${colors.brand} 12%, transparent)`)
	root.style.setProperty('--color-brand-highlight', `color-mix(in srgb, ${colors.brand} 22%, transparent)`)
	root.style.setProperty('--color-brand-shadow', colors.shadow)
	root.style.setProperty('--loading-bar-gradient', `linear-gradient(90deg, ${colors.brand}, ${colors.bright})`)
	try {
		window.localStorage.setItem('bread-accent', accent)
	} catch {
		// storage blocked or full
	}
}

function setAccent(accent: BreadAccent): void {
	selectedAccent.value = accent
}

function restoreStandard(): void {
	setTheme('bread')
	setAccent('orange')
}

function setShowOriginalThemes(enabled: boolean): void {
	showOriginalThemes.value = enabled
	try {
		window.localStorage.setItem('bread-show-original-themes', String(enabled))
	} catch {
		// storage blocked or full
	}
}

function setClassicLayout(enabled: boolean): void {
	classicLayout.value = enabled
	try {
		window.localStorage.setItem('bread-legacy-ui', String(enabled))
		window.dispatchEvent(new CustomEvent('bread-ui-mode-changed'))
	} catch {
		// storage blocked or full
	}
}

watch(selectedAccent, (accent) => applyAccent(accent), { immediate: true })
onMounted(applyCustomBackground)

type AppearanceSettingsState = {
	theme: ColorTheme
	syncAcrossDevices: boolean
	advancedRendering: boolean
	nativeDecorations: boolean
}

function getAppearanceSettingsState(settings: AppSettings): AppearanceSettingsState {
	return {
		theme: settings.theme,
		syncAcrossDevices: settings.sync_theme_across_devices,
		advancedRendering: settings.advanced_rendering,
		nativeDecorations: settings.native_decorations,
	}
}

const { saved, current, changes, saving, hasChanges, reset, save } = useSavable(
	() => getAppearanceSettingsState(settings.value),
	async (appearanceChanges) => {
		const value = current.value
		const canSyncTheme =
			value.theme === 'system' ||
			value.theme === 'light' ||
			value.theme === 'dark' ||
			value.theme === 'oled' ||
			value.theme === 'retro'
		if (
			value.syncAcrossDevices &&
			auth.user.value &&
			canSyncTheme &&
			(appearanceChanges.theme !== undefined || appearanceChanges.syncAcrossDevices !== undefined)
		) {
			await updatePreferences({
				appearance: value.theme === 'system' ? { auto: true } : { auto: false, theme: value.theme },
			})
		}

		const nextSettings: AppSettings = {
			...settings.value,
			theme: value.theme,
			sync_theme_across_devices: value.syncAcrossDevices,
			advanced_rendering: value.advancedRendering,
			native_decorations: value.nativeDecorations,
		}

		await set(nextSettings)
		settings.value = nextSettings
		if (isDarkTheme(value.theme)) {
			theme.preferredDark = value.theme
		}
		theme.preferred = value.theme
		theme.syncAcrossDevices = value.syncAcrossDevices
		theme.advancedRendering = value.advancedRendering
	},
)

const themeOptions = computed(() => {
	const breadThemes = new Set(['system', 'standard', 'bread', 'purple', 'purple-flame', 'amber'])
	return theme.options.filter(
		(option) =>
			(showOriginalThemes.value || breadThemes.has(option)) &&
			(option !== 'retro' || settings.value.developer_mode || current.value.theme === 'retro'),
	)
})

const preferredDarkTheme = computed(() =>
	isDarkTheme(current.value.theme) ? current.value.theme : theme.preferredDark,
)

function setTheme(value: ColorTheme): void {
	current.value.theme = value
}

function setSyncAcrossDevices(enabled: boolean): void {
	current.value.syncAcrossDevices = enabled
}

function setAdvancedRendering(enabled: boolean): void {
	current.value.advancedRendering = enabled
}

function setNativeDecorations(enabled: boolean): void {
	current.value.nativeDecorations = enabled
}

watch(
	[() => current.value.theme, () => saved.value.theme],
	([selectedTheme, savedTheme]) => {
		theme.preview = selectedTheme === savedTheme ? null : selectedTheme
	},
	{ immediate: true },
)

async function saveAppearanceSettings(): Promise<void> {
	try {
		await save()
	} catch {
		return
	}
}

onMounted(() => {
	settingsModal?.registerUnsavedChangesController({
		hasChanges: () => hasChanges.value,
		getOriginal: () => saved.value,
		getModified: () => changes.value,
		isSaving: () => saving.value,
		reset,
		save: saveAppearanceSettings,
	})
})

onBeforeUnmount(() => {
	theme.preview = null
	settingsModal?.registerUnsavedChangesController(null)
})

provideAppearanceSettings({
	deferPersistence: true,
	theme: {
		current: computed(() => current.value.theme),
		options: themeOptions,
		system: computed(() => (theme.native === 'light' ? 'light' : preferredDarkTheme.value)),
		preferredDark: preferredDarkTheme,
		set: setTheme,
		syncAcrossDevices: {
			value: computed(() => current.value.syncAcrossDevices),
			set: setSyncAcrossDevices,
		},
		syncDisabled: computed(() => !auth.user.value),
	},
	advancedRendering: {
		value: computed(() => current.value.advancedRendering),
		set: setAdvancedRendering,
	},
	nativeDecorations:
		os !== 'MacOS'
			? {
					value: computed(() => current.value.nativeDecorations),
					set: setNativeDecorations,
				}
			: undefined,
	updatePreferences,
})
</script>

<template>
	<div class="bread-settings-page">
		<header class="bread-settings-hero">
			<p class="bread-settings-eyebrow">{{ formatMessage(messages.breadEyebrow) }}</p>
			<h1>
				{{ formatMessage(messages.breadHeading) }}
				<span>{{ formatMessage(messages.breadHeadingAccent) }}</span>
			</h1>
			<p>{{ formatMessage(messages.breadDescription) }}</p>
		</header>

		<section class="bread-settings-section bread-classic-layout-section">
			<div>
				<h2>{{ formatMessage(messages.classicLayout) }}</h2>
				<p>{{ formatMessage(messages.classicLayoutDescription) }}</p>
			</div>
			<label class="bread-settings-toggle">
				<input
					type="checkbox"
					:checked="classicLayout"
					@change="setClassicLayout($event.target.checked)"
				/>
				<span aria-hidden="true" />
			</label>
		</section>

		<section class="bread-settings-section bread-original-themes-section">
			<div>
				<h2>{{ formatMessage(messages.originalThemes) }}</h2>
				<p>{{ formatMessage(messages.originalThemesDescription) }}</p>
			</div>
			<label class="bread-settings-toggle">
				<input
					type="checkbox"
					:checked="showOriginalThemes"
					@change="setShowOriginalThemes($event.target.checked)"
				/>
				<span aria-hidden="true" />
			</label>
		</section>

		<section class="bread-settings-section bread-custom-theme-section">
			<div>
				<h2>Custom theme</h2>
				<p>Import a local background image or a JSON palette. Customizations stay on this device.</p>
			</div>
			<div class="bread-custom-theme-actions">
				<Button type="outlined" @click="importBackground">Import background</Button>
				<Button type="outlined" @click="importPalette">Import palette</Button>
			</div>
		</section>

		<AppearanceSettingsLayout class="bread-native-appearance-settings" />

		<section class="bread-settings-section bread-accent-section">
			<div>
				<h2>{{ formatMessage(messages.accentTitle) }}</h2>
				<p>{{ formatMessage(messages.accentDescription) }}</p>
			</div>
			<div class="bread-accent-swatches" role="group" :aria-label="formatMessage(messages.accentTitle)">
				<button
					v-for="accent in accentOptions"
					:key="accent.id"
					type="button"
					class="bread-accent-swatch"
					:class="{ selected: selectedAccent === accent.id }"
					:aria-label="formatMessage(accent.label)"
					:aria-pressed="selectedAccent === accent.id"
					@click="setAccent(accent.id)"
				>
					<span :style="{ backgroundColor: accent.color }" aria-hidden="true" />
				</button>
			</div>
		</section>

		<section class="bread-settings-section bread-restore-section">
			<div>
				<h2>{{ formatMessage(messages.restoreTitle) }}</h2>
				<p>{{ formatMessage(messages.restoreDescription) }}</p>
			</div>
			<Button type="outlined" @click="restoreStandard">
				{{ formatMessage(messages.restoreButton) }}
			</Button>
		</section>
	</div>
</template>

<style scoped lang="scss">
.bread-settings-page {
	display: flex;
	flex-direction: column;
	gap: var(--bread-space-6);
	padding: var(--bread-space-2) 0 var(--bread-space-8);
	color: var(--bread-color-text);
}

.bread-settings-hero {
	padding-bottom: var(--bread-space-5);
	border-bottom: 1px solid var(--bread-color-border-subtle);

	.bread-settings-eyebrow {
		margin: 0 0 var(--bread-space-2);
		color: var(--bread-color-brand);
		font-size: 0.6875rem;
		font-weight: var(--bread-font-weight-bold);
		letter-spacing: 0.14em;
	}

	h1 {
		margin: 0;
		font-family: var(--bread-font-display);
		font-size: clamp(2rem, 5vw, 2.75rem);
		font-weight: var(--bread-font-weight-bold);
		line-height: 0.98;
		letter-spacing: -0.045em;
		color: var(--bread-color-text);

		span {
			display: block;
			color: var(--bread-color-brand);
		}
	}

	> p:last-child {
		margin: var(--bread-space-3) 0 0;
		color: var(--bread-color-text-muted);
		font-size: 0.875rem;
	}
}

.bread-native-appearance-settings {
	:deep(section:first-child > div:first-child) {
		display: none;
	}

	:deep(section:first-child > .mt-6) {
		display: none;
	}

	:deep(section:not(:first-child)),
	:deep(div.mt-8) {
		display: none;
	}

	:deep(.theme-options) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--bread-space-3);
	}

	:deep(.preview-radio) {
		min-width: 0;
		padding: 0;
		overflow: hidden;
		border: 1px solid var(--bread-color-border-subtle);
		border-radius: var(--bread-radius-lg);
		background: var(--bread-color-surface-muted);
		text-align: left;
		transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;

		&:hover {
			border-color: var(--bread-color-border-strong);
			transform: translateY(-1px);
		}

		&.selected {
			border-color: var(--bread-color-brand);
			box-shadow: 0 0 0 1px var(--bread-color-brand), 0 0 0 0.2rem var(--bread-color-brand-shadow);
		}
	}

	:deep(.preview) {
		min-height: 5.25rem;
		padding: var(--bread-space-4);
		background: var(--surface-1);

		.example-card {
			padding: 0;
			background: transparent;
			border: 0;

			.example-icon {
				width: 2rem;
				height: 2rem;
				background: var(--color-button-bg);
			}
		}
	}

	:deep(.label) {
		min-height: 2.75rem;
		padding: var(--bread-space-3) var(--bread-space-4);
		border-top: 1px solid var(--bread-color-border-subtle);
		color: var(--bread-color-text);
		font-size: 0.8125rem;
		font-weight: var(--bread-font-weight-semibold);

		.radio {
			display: none;
		}

		.theme-icon {
			display: none;
		}
	}
}

.bread-settings-section {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--bread-space-6);
	padding: var(--bread-space-5) 0;
	border-bottom: 1px solid var(--bread-color-border-subtle);

	h2 {
		margin: 0;
		font-size: 1rem;
	}

	p {
		max-width: 34rem;
		margin: var(--bread-space-1) 0 0;
		color: var(--bread-color-text-muted);
		font-size: 0.8125rem;
	}
}

.bread-settings-toggle {
	position: relative;
	flex: 0 0 auto;
	width: 2.75rem;
	height: 1.5rem;
	cursor: pointer;

	input {
		position: absolute;
		opacity: 0;
	}

	span {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: var(--bread-radius-pill);
		background: var(--bread-color-surface-raised);
		box-shadow: inset 0 0 0 1px var(--bread-color-border-subtle);
		transition: background-color 120ms ease;

		&::after {
			content: '';
			display: block;
			width: 1.1rem;
			height: 1.1rem;
			margin: 0.2rem;
			border-radius: 50%;
			background: var(--bread-color-text-muted);
			transition: transform 120ms ease, background-color 120ms ease;
		}
	}

	input:checked + span {
		background: var(--bread-color-brand);
		box-shadow: none;

		&::after {
			background: var(--bread-color-brand-contrast);
			transform: translateX(1.25rem);
		}
	}

	input:focus-visible + span {
		outline: 2px solid var(--bread-color-brand-bright);
		outline-offset: 2px;
	}
}

.bread-custom-theme-actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--bread-space-2);
}

.bread-settings-section {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--bread-space-6);
	padding-top: var(--bread-space-5);
	border-top: 1px solid var(--bread-color-border-subtle);

	h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: var(--bread-font-weight-bold);
		color: var(--bread-color-text);
	}

	p {
		max-width: 15rem;
		margin: var(--bread-space-1) 0 0;
		color: var(--bread-color-text-muted);
		font-size: 0.75rem;
		line-height: 1.35;
	}

	:deep([data-button]) {
		flex-shrink: 0;
	}
}

.bread-accent-swatches {
	display: flex;
	align-items: center;
	gap: var(--bread-space-4);
	padding-right: var(--bread-space-2);
}

.bread-accent-swatch {
	width: 2rem;
	height: 2rem;
	padding: 0.25rem;
	border: 2px solid transparent;
	border-radius: 50%;
	background: transparent;
	cursor: pointer;
	transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;

	span {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	&:hover {
		transform: scale(1.08);
	}

	&.selected {
		border-color: var(--bread-color-text);
		box-shadow: 0 0 0 2px var(--bread-color-bg), 0 0 0 4px var(--bread-color-brand);
	}
}

@media (max-width: 38rem) {
	.bread-native-appearance-settings :deep(.theme-options) {
		grid-template-columns: 1fr;
	}

	.bread-settings-section {
		align-items: flex-start;
		flex-direction: column;
	}

	.bread-accent-swatches {
		padding-right: 0;
	}
}
</style>
