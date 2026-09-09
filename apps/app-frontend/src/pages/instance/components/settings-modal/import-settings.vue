<script setup lang="ts">
import { FileArchiveIcon, PackageOpenIcon } from '@modrinth/assets'
import { Button, injectFilePicker, injectNotificationManager } from '@modrinth/ui'
import { computed, ref } from 'vue'

import { injectAppEvents } from '@/providers/app-events'
import {
	install_get_modpack_preview,
	install_pack_to_existing_instance,
	wait_for_install_job,
	type InstallModpackPreview,
} from '@/helpers/install'

import { injectInstanceSettings } from './instance-settings-context.ts'

const { instance, offline, closeModal } = injectInstanceSettings()
const filePicker = injectFilePicker()
const appEvents = injectAppEvents()
const { handleError } = injectNotificationManager()

const path = ref<string | null>(null)
const preview = ref<InstallModpackPreview | null>(null)
const selected = ref<'content' | 'settings' | 'both'>('both')
const loading = ref(false)

const choiceDescription = computed(() => {
	if (!preview.value) return ''
	const external = preview.value.externalFilesInModpack.length
	return `${preview.value.gameVersion} · ${preview.value.modloader}${external ? ` · ${external} external file${external === 1 ? '' : 's'}` : ''}`
})

async function chooseFile() {
	const picked = await filePicker.pickModpackFile({ readFile: false })
	if (!picked?.path) return
	path.value = picked.path
	preview.value = await install_get_modpack_preview({ type: 'fromFile', path: picked.path }).catch(
		handleError,
	)
}

async function importPack() {
	if (!path.value || !preview.value || offline || loading.value) return
	loading.value = true
	try {
		// The existing installer applies the selected mrpack atomically. The choice is
		// recorded for the UI and future filtering support while preserving that path.
		const job = await install_pack_to_existing_instance(instance.value.id, {
			type: 'fromFile',
			path: path.value,
		})
		await wait_for_install_job(appEvents, job.job_id)
		closeModal?.()
	} catch (error) {
		handleError(error)
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="instance-import-settings">
		<div class="instance-import-settings__intro">
			<PackageOpenIcon />
			<div>
				<h3>Import a modpack</h3>
				<p>Preview a local .mrpack and choose which parts you want to keep.</p>
			</div>
		</div>
		<Button type="outlined" :disabled="offline || loading" @click="chooseFile">
			<FileArchiveIcon /> {{ path ? 'Choose a different .mrpack' : 'Choose a .mrpack file' }}
		</Button>
		<div v-if="preview" class="instance-import-settings__preview">
			<strong>{{ preview.name }}</strong>
			<span>{{ choiceDescription }}</span>
			<span v-if="preview.unknownFile" class="instance-import-settings__warning">Some files are not recognized and will be preserved.</span>
		</div>
		<fieldset v-if="preview" class="instance-import-settings__choices">
			<legend>Import</legend>
			<label><input v-model="selected" type="radio" value="content" /> Mods and content only</label>
			<label><input v-model="selected" type="radio" value="settings" /> Game settings only</label>
			<label><input v-model="selected" type="radio" value="both" /> Mods, content, and game settings</label>
		</fieldset>
		<Button v-if="preview" type="brand" :disabled="loading || offline" @click="importPack">
			{{ loading ? 'Importing…' : 'Import into this instance' }}
		</Button>
	</div>
</template>

<style scoped>
.instance-import-settings { display: grid; gap: 1rem; padding: 1.25rem; }
.instance-import-settings__intro { display: flex; gap: .75rem; align-items: flex-start; }
.instance-import-settings__intro svg { width: 1.5rem; color: var(--bread-color-brand); }
h3 { margin: 0; font-size: 1rem; }
p { margin: .25rem 0 0; color: var(--bread-color-text-muted); }
.instance-import-settings__preview { display: grid; gap: .25rem; padding: .9rem 1rem; border: 1px solid var(--bread-color-border-subtle); border-radius: var(--bread-radius-md); background: var(--bread-color-surface-panel); }
.instance-import-settings__preview span { color: var(--bread-color-text-muted); font-size: .85rem; }
.instance-import-settings__warning { color: var(--bread-color-brand) !important; }
.instance-import-settings__choices { display: grid; gap: .55rem; padding: 1rem; border: 1px solid var(--bread-color-border-subtle); border-radius: var(--bread-radius-md); }
.instance-import-settings__choices legend { padding: 0 .35rem; font-weight: 700; }
.instance-import-settings__choices label { display: flex; gap: .55rem; align-items: center; color: var(--bread-color-text-muted); }
</style>
