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
import BreadLogo from '@/components/ui/BreadLogo.vue'

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
			<div class="bread-settings-hero__heading">
				<BreadLogo variant="header" class="bread-settings-hero__logo" aria-hidden="true" />
				<div>
					<p class="bread-settings-eyebrow">{{ formatMessage(messages.breadEyebrow) }}</p>
					<h1>
						{{ formatMessage(messages.breadHeading) }}
						<span>{{ formatMessage(messages.breadHeadingAccent) }}</span>
					</h1>
					<p>{{ formatMessage(messages.breadDescription) }}</p>
				</div>
			</div>
			<div class="bread-settings-hero__status">
				<span class="bread-settings-status-dot" />
				<div>
					<strong>LOCAL PROFILE</strong>
					<span>Saved on this device</span>
				</div>
			</div>
		</header>

		<div class="bread-settings-dashboard">
			<aside class="bread-settings-overview">
				<section class="bread-preview-card">
					<div class="bread-preview-card__topline">
						<span>WORKSPACE PREVIEW</span>
						<span class="bread-preview-card__signal" />
					</div>
					<div class="bread-preview-card__window">
						<div class="bread-preview-card__window-bar">
							<BreadLogo variant="header" aria-hidden="true" />
							<span />
							<span />
						</div>
						<div class="bread-preview-card__window-body">
							<div class="bread-preview-card__rail" />
							<div class="bread-preview-card__content">
								<span />
								<span />
								<span />
							</div>
						</div>
					</div>
					<div class="bread-preview-card__footer">
						<div>
							<span class="bread-preview-card__label">CURRENT MODE</span>
							<strong>{{ classicLayout ? 'Classic layout' : 'Bread workspace' }}</strong>
						</div>
						<span class="bread-preview-card__accent" :style="{ backgroundColor: accentPalette[selectedAccent].brand }" />
					</div>
				</section>

				<section class="bread-settings-summary-card">
					<div class="bread-settings-card-kicker">CURRENT SETUP</div>
					<div class="bread-settings-summary-row">
						<span>Theme</span>
						<strong>{{ current.theme }}</strong>
					</div>
					<div class="bread-settings-summary-row">
						<span>Accent</span>
						<strong>{{ formatMessage(accentOptions.find((accent) => accent.id === selectedAccent)?.label ?? messages.accentOrange) }}</strong>
					</div>
					<div class="bread-settings-summary-row">
						<span>Original themes</span>
						<strong>{{ showOriginalThemes ? 'Shown' : 'Hidden' }}</strong>
					</div>
				</section>
			</aside>

			<main class="bread-settings-controls">
				<section class="bread-settings-control-card bread-layout-card">
					<div class="bread-settings-card-heading">
						<div>
							<span class="bread-settings-card-kicker">01 / LAYOUT</span>
							<h2>Choose your workspace</h2>
							<p>Decide how much of Bread Client you want in view while you play.</p>
						</div>
						<span class="bread-settings-card-status">{{ classicLayout ? 'CLASSIC' : 'BREAD' }}</span>
					</div>
					<div class="bread-layout-options" role="group" aria-label="Workspace layout">
						<button
							type="button"
							class="bread-layout-option"
							:class="{ selected: !classicLayout }"
							:aria-pressed="!classicLayout"
							@click="setClassicLayout(false)"
						>
							<span class="bread-layout-option__visual bread-layout-option__visual--workspace"><i /><i /><i /></span>
							<strong>Bread workspace</strong>
							<small>Focused navigation and richer home views.</small>
						</button>
						<button
							type="button"
							class="bread-layout-option"
							:class="{ selected: classicLayout }"
							:aria-pressed="classicLayout"
							@click="setClassicLayout(true)"
						>
							<span class="bread-layout-option__visual bread-layout-option__visual--classic"><i /><i /><i /></span>
							<strong>Classic layout</strong>
							<small>{{ formatMessage(messages.classicLayoutDescription) }}</small>
						</button>
					</div>
				</section>

				<section class="bread-settings-control-card bread-theme-card">
					<div class="bread-settings-card-heading">
						<div>
							<span class="bread-settings-card-kicker">02 / THEME</span>
							<h2>Set the atmosphere</h2>
							<p>Preview a theme before saving it across the rest of your client.</p>
						</div>
						<span class="bread-settings-card-status">{{ current.theme }}</span>
					</div>
					<AppearanceSettingsLayout class="bread-native-appearance-settings" />
				</section>

				<section class="bread-settings-control-card bread-accent-card">
					<div class="bread-settings-card-heading">
						<div>
							<span class="bread-settings-card-kicker">03 / ACCENT</span>
							<h2>{{ formatMessage(messages.accentTitle) }}</h2>
							<p>{{ formatMessage(messages.accentDescription) }}</p>
						</div>
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
							<strong>{{ formatMessage(accent.label) }}</strong>
						</button>
					</div>
				</section>

				<section class="bread-settings-control-card bread-preferences-card">
					<div class="bread-settings-card-heading">
						<div>
							<span class="bread-settings-card-kicker">04 / PREFERENCES</span>
							<h2>Fine tune the client</h2>
						</div>
					</div>
					<div class="bread-preference-row">
						<div>
							<strong>{{ formatMessage(messages.originalThemes) }}</strong>
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
					</div>
					<div class="bread-preference-row bread-preference-row--tools">
						<div>
							<strong>Custom theme kit</strong>
							<p>Bring in a local background or JSON palette for this device.</p>
						</div>
						<div class="bread-custom-theme-actions">
							<Button type="outlined" @click="importBackground">Import background</Button>
							<Button type="outlined" @click="importPalette">Import palette</Button>
						</div>
					</div>
				</section>

				<section class="bread-settings-control-card bread-restore-card">
					<div>
						<span class="bread-settings-card-kicker">RESET</span>
						<h2>{{ formatMessage(messages.restoreTitle) }}</h2>
						<p>{{ formatMessage(messages.restoreDescription) }}</p>
					</div>
					<Button type="outlined" @click="restoreStandard">
						{{ formatMessage(messages.restoreButton) }}
					</Button>
				</section>
			</main>
		</div>
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

.bread-settings-page {
	gap: 1rem;
	padding: 0 0 2rem;
}

.bread-settings-hero {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background:
		radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--bread-color-brand) 18%, transparent), transparent 15rem),
		var(--bread-color-surface-panel);
}

.bread-settings-hero__heading {
	display: flex;
	align-items: center;
	gap: 0.8rem;
}

.bread-settings-hero__logo {
	width: 3.25rem;
	height: 3.25rem;
	justify-content: center;
	border-radius: var(--bread-radius-md);
	background: var(--bread-color-brand);
	color: var(--bread-color-brand-contrast);
}

.bread-settings-hero__logo :deep(.bread-logo__mark) {
	width: 2.25rem;
	height: 2.25rem;
}

.bread-settings-hero__logo :deep(.bread-logo__wordmark) {
	display: none;
}

.bread-settings-hero__status {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	padding: 0.55rem 0.7rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-md);
	background: color-mix(in srgb, var(--bread-color-surface-raised) 66%, transparent);
}

.bread-settings-hero__status div {
	display: flex;
	flex-direction: column;
	gap: 0.2rem;
}

.bread-settings-hero__status strong,
.bread-settings-hero__status span:last-child {
	font-size: 0.62rem;
	letter-spacing: 0.08em;
	line-height: 1.2;
	text-transform: uppercase;
}

.bread-settings-hero__status strong {
	color: var(--bread-color-text);
}

.bread-settings-hero__status span:last-child {
	color: var(--bread-color-text-subtle);
	letter-spacing: 0;
	text-transform: none;
}

.bread-settings-status-dot {
	width: 0.55rem;
	height: 0.55rem;
	border-radius: 50%;
	background: var(--bread-color-brand);
	box-shadow: 0 0 0 0.25rem color-mix(in srgb, var(--bread-color-brand) 16%, transparent);
}

.bread-settings-dashboard {
	display: grid;
	grid-template-columns: minmax(12rem, 0.62fr) minmax(0, 1.38fr);
	align-items: start;
	gap: 1rem;
}

.bread-settings-overview,
.bread-settings-controls {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.bread-settings-overview {
	position: sticky;
	top: 0;
}

.bread-preview-card,
.bread-settings-summary-card,
.bread-settings-control-card {
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-surface-panel);
}

.bread-preview-card {
	overflow: hidden;
	background:
		linear-gradient(145deg, color-mix(in srgb, var(--bread-color-brand) 17%, transparent), transparent 60%),
		var(--bread-color-surface-panel);
}

.bread-preview-card__topline,
.bread-preview-card__footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.6rem;
}

.bread-preview-card__topline {
	padding: 0.75rem 0.8rem;
	color: var(--bread-color-text-subtle);
	font-size: 0.58rem;
	font-weight: 800;
	letter-spacing: 0.12em;
}

.bread-preview-card__signal {
	width: 0.45rem;
	height: 0.45rem;
	border-radius: 50%;
	background: var(--bread-color-brand);
}

.bread-preview-card__window {
	margin: 0 0.8rem;
	border: 1px solid var(--bread-color-border);
	border-radius: var(--bread-radius-md);
	background: var(--bread-color-bg);
	box-shadow: 0 0.8rem 1.3rem rgb(0 0 0 / 17%);
}

.bread-preview-card__window-bar {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.45rem;
	border-bottom: 1px solid var(--bread-color-border-subtle);
}

.bread-preview-card__window-bar :deep(.bread-logo) {
	margin-right: auto;
	font-size: 0.55rem;
}

.bread-preview-card__window-bar :deep(.bread-logo__mark) {
	width: 0.8rem;
	height: 0.8rem;
}

.bread-preview-card__window-bar span {
	width: 0.35rem;
	height: 0.35rem;
	border-radius: 50%;
	background: var(--bread-color-border-strong);
}

.bread-preview-card__window-body {
	display: flex;
	gap: 0.45rem;
	min-height: 6.2rem;
	padding: 0.5rem;
}

.bread-preview-card__rail {
	width: 1.5rem;
	border-radius: var(--bread-radius-sm);
	background: linear-gradient(180deg, var(--bread-color-brand), var(--bread-color-surface-raised) 45%);
	opacity: 0.85;
}

.bread-preview-card__content {
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: center;
	gap: 0.45rem;
}

.bread-preview-card__content span {
	display: block;
	height: 0.55rem;
	border-radius: var(--bread-radius-pill);
	background: var(--bread-color-surface-raised);
}

.bread-preview-card__content span:first-child {
	width: 70%;
	background: var(--bread-color-brand);
}

.bread-preview-card__content span:last-child {
	width: 45%;
}

.bread-preview-card__footer {
	padding: 0.8rem;
}

.bread-preview-card__footer div {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.bread-preview-card__label,
.bread-settings-card-kicker {
	color: var(--bread-color-brand);
	font-size: 0.58rem;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.bread-preview-card__footer strong {
	font-size: 0.82rem;
}

.bread-preview-card__accent {
	width: 1.35rem;
	height: 1.35rem;
	border: 3px solid var(--bread-color-surface-panel);
	border-radius: 50%;
	box-shadow: 0 0 0 1px var(--bread-color-border-strong);
}

.bread-settings-summary-card {
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
	padding: 0.85rem;
}

.bread-settings-summary-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	padding-top: 0.6rem;
	border-top: 1px solid var(--bread-color-border-subtle);
	color: var(--bread-color-text-muted);
	font-size: 0.75rem;
}

.bread-settings-summary-row strong {
	max-width: 8rem;
	overflow: hidden;
	color: var(--bread-color-text);
	font-size: 0.72rem;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.bread-settings-control-card {
	padding: 1rem;
}

.bread-settings-card-heading {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 0.85rem;
}

.bread-settings-card-heading h2,
.bread-restore-card h2 {
	margin: 0.25rem 0 0;
	color: var(--bread-color-text);
	font-size: 1.05rem;
	font-weight: var(--bread-font-weight-bold);
}

.bread-settings-card-heading p,
.bread-restore-card p,
.bread-preference-row p {
	max-width: 32rem;
	margin: 0.35rem 0 0;
	color: var(--bread-color-text-muted);
	font-size: 0.75rem;
	line-height: 1.4;
}

.bread-settings-card-status {
	flex: 0 0 auto;
	padding: 0.35rem 0.45rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-sm);
	color: var(--bread-color-brand-bright);
	font-size: 0.58rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.bread-layout-options {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.65rem;
}

.bread-layout-option {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.45rem;
	min-width: 0;
	padding: 0.65rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-md);
	background: var(--bread-color-surface-muted);
	color: var(--bread-color-text);
	text-align: left;
	cursor: pointer;
	transition: border-color 120ms ease, transform 120ms ease, background-color 120ms ease;
}

.bread-layout-option:hover {
	transform: translateY(-1px);
	border-color: var(--bread-color-border-strong);
}

.bread-layout-option.selected {
	border-color: var(--bread-color-brand);
	background: color-mix(in srgb, var(--bread-color-brand) 12%, var(--bread-color-surface-muted));
	box-shadow: 0 0 0 1px var(--bread-color-brand);
}

.bread-layout-option strong {
	font-size: 0.78rem;
}

.bread-layout-option small {
	color: var(--bread-color-text-muted);
	font-size: 0.68rem;
	line-height: 1.35;
}

.bread-layout-option__visual {
	display: flex;
	align-items: flex-end;
	gap: 0.2rem;
	width: 100%;
	height: 3rem;
	padding: 0.35rem;
	border: 1px solid var(--bread-color-border);
	border-radius: var(--bread-radius-sm);
	background: var(--bread-color-bg);
}

.bread-layout-option__visual i {
	display: block;
	width: 0.4rem;
	height: 50%;
	border-radius: 0.15rem 0.15rem 0 0;
	background: var(--bread-color-surface-raised);
}

.bread-layout-option__visual i:first-child {
	width: 28%;
	height: 100%;
	background: var(--bread-color-brand);
}

.bread-layout-option__visual i:nth-child(2) {
	width: 42%;
	height: 75%;
}

.bread-layout-option__visual i:last-child {
	width: 22%;
	height: 62%;
}

.bread-layout-option__visual--classic i:first-child {
	width: 18%;
	height: 74%;
	background: var(--bread-color-surface-raised);
}

.bread-layout-option__visual--classic i:nth-child(2) {
	width: 62%;
	height: 100%;
	background: var(--bread-color-brand);
}

.bread-layout-option__visual--classic i:last-child {
	width: 16%;
	height: 60%;
}

.bread-native-appearance-settings {
	margin-top: 0.25rem;
	padding-top: 0.85rem;
	border-top: 1px solid var(--bread-color-border-subtle);
}

.bread-native-appearance-settings :deep(.theme-options) {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.55rem;
}

.bread-native-appearance-settings :deep(.preview-radio) {
	min-height: 6rem;
}

.bread-accent-swatches {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.5rem;
	padding: 0;
}

.bread-accent-swatch {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	min-width: 0;
	padding: 0.5rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-md);
	background: var(--bread-color-surface-muted);
	color: var(--bread-color-text-muted);
	text-align: left;
	cursor: pointer;
	transition: border-color 120ms ease, background-color 120ms ease, transform 120ms ease;
}

.bread-accent-swatch:hover {
	transform: translateY(-1px);
	border-color: var(--bread-color-border-strong);
}

.bread-accent-swatch span {
	width: 1rem;
	height: 1rem;
	flex: 0 0 auto;
	border-radius: 50%;
}

.bread-accent-swatch strong {
	overflow: hidden;
	font-size: 0.63rem;
	font-weight: 700;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.bread-accent-swatch.selected {
	border-color: var(--bread-color-brand);
	background: color-mix(in srgb, var(--bread-color-brand) 12%, var(--bread-color-surface-muted));
	box-shadow: 0 0 0 1px var(--bread-color-brand);
	color: var(--bread-color-text);
}

.bread-preferences-card {
	display: flex;
	flex-direction: column;
	gap: 0.8rem;
}

.bread-preference-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding-top: 0.8rem;
	border-top: 1px solid var(--bread-color-border-subtle);
}

.bread-preference-row strong {
	font-size: 0.82rem;
}

.bread-preference-row--tools {
	align-items: flex-start;
}

.bread-custom-theme-actions {
	flex: 0 0 auto;
	justify-content: flex-end;
}

.bread-restore-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	background: color-mix(in srgb, var(--bread-color-surface-panel) 75%, var(--bread-color-surface-muted));
}

@media (max-width: 58rem) {
	.bread-settings-dashboard {
		grid-template-columns: 1fr;
	}

	.bread-settings-overview {
		position: static;
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(12rem, 0.8fr);
	}
}

@media (max-width: 38rem) {
	.bread-settings-hero,
	.bread-preference-row,
	.bread-restore-card {
		align-items: flex-start;
		flex-direction: column;
	}

	.bread-settings-hero__status {
		width: 100%;
	}

	.bread-settings-overview,
	.bread-layout-options,
	.bread-native-appearance-settings :deep(.theme-options),
	.bread-accent-swatches {
		grid-template-columns: 1fr;
	}

	.bread-preference-row--tools .bread-custom-theme-actions {
		justify-content: flex-start;
	}
}
</style>
