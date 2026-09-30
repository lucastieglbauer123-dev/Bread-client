import { ref } from 'vue'

const CLIENT_MODE_KEY = 'bread-client-mode'

function loadOfflineMode(): boolean {
	try {
		return window.localStorage.getItem(CLIENT_MODE_KEY) === 'offline'
	} catch {
		return false
	}
}

const offlineMode = ref(loadOfflineMode())

function setOfflineMode(enabled: boolean): void {
	offlineMode.value = enabled
	try {
		window.localStorage.setItem(CLIENT_MODE_KEY, enabled ? 'offline' : 'online')
	} catch {
		// The mode still applies for this session when storage is unavailable.
	}
	window.dispatchEvent(new CustomEvent('bread-client-mode-changed'))
}

export function useClientMode() {
	return { offlineMode, setOfflineMode }
}
