<template>
	<div class="bread-logo" :class="`bread-logo--${variant}`" role="img" aria-label="Bread Client">
		<img :src="breadLogoMark" class="bread-logo__mark" alt="" aria-hidden="true" />
		<span class="bread-logo__wordmark">Bread Client</span>
	</div>
</template>

<script setup lang="ts">
import breadLogoMark from '@/assets/bread-logo-mark.svg?url'

withDefaults(
	defineProps<{
		variant?: 'header' | 'sidebar' | 'splash'
	}>(),
	{
		variant: 'header',
	},
)
</script>

<style scoped lang="scss">
.bread-logo {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--bread-color-text, currentColor);
	font-family: var(--bread-font-display, 'Space Grotesk', sans-serif);
	font-size: 1.125rem;
	font-weight: var(--bread-font-weight-bold, 700);
	letter-spacing: -0.04em;
	line-height: 1;
	white-space: nowrap;
}

.bread-logo__mark {
	display: block;
	width: 1.75rem;
	height: 1.75rem;
	flex: 0 0 auto;
	object-fit: contain;
}

.bread-logo--splash {
	gap: 0.75rem;
	font-size: 2rem;
}

.bread-logo--sidebar {
	align-self: flex-start;
	margin: 1.25rem 0.5rem 1.5rem;
	font-size: 1.35rem;
}

.bread-logo--sidebar .bread-logo__wordmark {
	font-size: 0;
}

.bread-logo--sidebar .bread-logo__wordmark::after {
	content: 'bread';
	font-size: 1.35rem;
}

.bread-logo--splash .bread-logo__mark {
	width: 3rem;
	height: 3rem;
}
</style>
