<script setup lang="ts">
import { NewspaperIcon, RightArrowIcon } from '@modrinth/assets'
import { Button } from '@modrinth/ui'
import { useRouter } from 'vue-router'

import { BREAD_CHANGELOG } from '@/data/changelog'
import { useRootBreadcrumb } from '@/providers/breadcrumbs'

const router = useRouter()

useRootBreadcrumb({
	slot: 'root',
	id: 'whats-new',
	label: "What's new",
	visual: { type: 'icon', component: NewspaperIcon },
})
</script>

<template>
	<main class="bread-whats-new-page">
		<header class="bread-whats-new-header">
			<div class="bread-whats-new-header__icon"><NewspaperIcon /></div>
			<div>
				<p class="bread-eyebrow">Bread Client</p>
				<h1>What’s new</h1>
				<p>Fresh improvements and fixes in your launcher.</p>
			</div>
		</header>
		<div class="bread-whats-new-list">
			<article v-for="entry in BREAD_CHANGELOG" :key="`${entry.date}-${entry.title ?? ''}`" class="bread-whats-new-entry">
				<div class="bread-whats-new-entry__heading">
					<time>{{ entry.date }}</time>
					<span v-if="entry.title">{{ entry.title }}</span>
				</div>
				<ul>
					<li v-for="item in entry.items" :key="item">{{ item }}</li>
				</ul>
			</article>
		</div>
		<Button type="quiet" @click="router.push('/')">
			<RightArrowIcon class="rotate-180" />
			Back to library
		</Button>
	</main>
</template>

<style scoped>
.bread-whats-new-page {
	display: flex;
	max-width: 54rem;
	margin: 0 auto;
	padding: clamp(1.25rem, 4vw, 3rem);
	flex-direction: column;
	gap: 1.5rem;
	color: var(--bread-color-text-primary);
}

.bread-whats-new-header {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding-bottom: 1.5rem;
	border-bottom: 1px solid var(--bread-color-border-subtle);
}

.bread-whats-new-header__icon {
	display: grid;
	width: 3.5rem;
	height: 3.5rem;
	flex: 0 0 auto;
	place-items: center;
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-brand);
	color: var(--bread-color-brand-contrast);
}

.bread-whats-new-header__icon svg {
	width: 1.75rem;
	height: 1.75rem;
}

.bread-whats-new-header h1 {
	margin: 0;
	font-size: clamp(1.75rem, 4vw, 2.5rem);
	letter-spacing: -0.03em;
}

.bread-whats-new-header p:last-child {
	margin: 0.35rem 0 0;
	color: var(--bread-color-text-muted);
}

.bread-eyebrow {
	margin: 0 0 0.25rem;
	color: var(--bread-color-brand);
	font-size: 0.75rem;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.bread-whats-new-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.bread-whats-new-entry {
	padding: 1.25rem 1.5rem;
	border: 1px solid var(--bread-color-border-subtle);
	border-radius: var(--bread-radius-lg);
	background: var(--bread-color-surface-panel);
}

.bread-whats-new-entry__heading {
	display: flex;
	align-items: baseline;
	gap: 0.75rem;
	margin-bottom: 0.75rem;
	color: var(--bread-color-text-primary);
	font-weight: 700;
}

.bread-whats-new-entry__heading time {
	color: var(--bread-color-brand);
	font-size: 0.8rem;
	font-weight: 800;
	letter-spacing: 0.05em;
	text-transform: uppercase;
}

.bread-whats-new-entry ul {
	display: grid;
	gap: 0.5rem;
	margin: 0;
	padding-left: 1.25rem;
	color: var(--bread-color-text-muted);
	line-height: 1.5;
}
</style>
