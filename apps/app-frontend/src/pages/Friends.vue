<script setup lang="ts">
import { UserPlusIcon, UsersIcon } from '@modrinth/assets'
import { Button } from '@modrinth/ui'
import { computed, inject, ref, type Ref } from 'vue'

import FriendsList from '@/components/ui/friends/FriendsList.vue'
import type { ModrinthCredentials } from '@/helpers/mr_auth'
import { useRootBreadcrumb } from '@/providers/breadcrumbs'

const credentials = inject<Ref<ModrinthCredentials | null | undefined>>(
	'breadCredentials',
	ref<ModrinthCredentials | null>(null),
)
const signIn = inject<() => void>('showBreadSignIn', () => {})
const friendsList = ref<InstanceType<typeof FriendsList> | null>(null)
const accountsCard = inject<Ref<{ hasAccounts?: boolean } | null>>('accountsCard', ref(null))

// Friends sync uses the existing Bread account session, while the sidebar
// account card represents the linked Minecraft account. Keep both states
// visible so a Minecraft login is not mistaken for a second login requirement.
const breadSignedIn = computed(() => !!credentials.value?.user_id)
const minecraftSignedIn = computed(() => !!accountsCard.value?.hasAccounts)

useRootBreadcrumb({
	slot: 'root',
	id: 'friends',
	label: 'Friends',
	visual: { type: 'icon', component: UsersIcon },
})

function openAddFriend() {
	if (breadSignedIn.value) {
		friendsList.value?.showAddFriendModal()
	} else {
		signIn()
	}
}
</script>

<template>
	<main class="bread-friends-page">
		<header class="bread-friends-hero">
			<div class="bread-friends-hero__identity">
				<div class="bread-friends-hero__icon" aria-hidden="true"><UsersIcon /></div>
				<div>
					<p class="bread-eyebrow">Bread Client</p>
					<h1>Friends</h1>
					<p>Play together, share what you’re building, and keep requests in one place.</p>
				</div>
			</div>
			<div class="bread-friends-hero__actions">
				<span v-if="breadSignedIn" class="bread-friends-status">Friends sync connected</span>
				<span v-else-if="minecraftSignedIn" class="bread-friends-status">Minecraft account connected · link friend sync once</span>
				<span v-else class="bread-friends-status">Sign in to manage friends</span>
				<Button type="colored" color="brand" @click="openAddFriend">
					<UserPlusIcon />
					{{ breadSignedIn ? 'Add friend' : minecraftSignedIn ? 'Connect friends' : 'Sign in' }}
				</Button>
			</div>
		</header>

		<section class="bread-friends-panel" aria-labelledby="friends-panel-heading">
			<div class="bread-friends-panel__heading">
				<div>
					<h2 id="friends-panel-heading">Your circle</h2>
					<p>Requests are delivered when the recipient next signs in, and accepted friends stay synced.</p>
				</div>
				<div class="bread-friends-panel__hint">Minecraft usernames</div>
			</div>
			<FriendsList
				ref="friendsList"
				:credentials="credentials ?? null"
				:sign-in="signIn"
			/>
		</section>
	</main>
</template>

<style scoped>
.bread-friends-page {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	padding: clamp(1.25rem, 4vw, 3rem);
	color: var(--bread-color-text-primary);
}

.bread-friends-hero {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 2rem;
	padding: clamp(1.25rem, 3vw, 2rem);
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-xl);
	background: linear-gradient(135deg, var(--bread-color-surface-panel), var(--bread-color-surface-subtle));
	box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 12%);
}

.bread-friends-hero__identity {
	display: flex;
	align-items: center;
	gap: 1rem;
}

.bread-friends-hero__icon {
	display: grid;
	width: 3.5rem;
	height: 3.5rem;
	flex: 0 0 auto;
	place-items: center;
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-brand-highlight);
	color: var(--bread-color-brand);
}

.bread-friends-hero__icon svg { width: 1.8rem; height: 1.8rem; }
.bread-eyebrow { margin: 0 0 .3rem; color: var(--bread-color-brand); font-size: .72rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.bread-friends-hero h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.5rem); letter-spacing: -.03em; }
.bread-friends-hero p:not(.bread-eyebrow) { margin: .35rem 0 0; color: var(--bread-color-text-muted); }

.bread-friends-hero__actions { display: flex; align-items: flex-end; flex-direction: column; gap: .65rem; flex: 0 0 auto; }
.bread-friends-status { color: var(--bread-color-text-muted); font-size: .75rem; font-weight: 700; }

.bread-friends-panel {
	padding: clamp(1rem, 3vw, 1.5rem);
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-surface-panel);
}

.bread-friends-panel__heading {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1.25rem;
	padding-bottom: 1rem;
	border-bottom: 1px solid var(--bread-color-border-subtle);
}

.bread-friends-panel h2 { margin: 0; font-size: 1.25rem; }
.bread-friends-panel p { margin: .3rem 0 0; color: var(--bread-color-text-muted); font-size: .9rem; }
.bread-friends-panel__hint { color: var(--bread-color-brand); font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }

@media (max-width: 42rem) {
	.bread-friends-hero { flex-direction: column; gap: 1.25rem; }
	.bread-friends-hero__actions { align-items: flex-start; }
	.bread-friends-panel__heading { flex-direction: column; }
}
</style>
