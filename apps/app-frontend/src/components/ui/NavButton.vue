<template>
	<RouterLink
		v-if="typeof to === 'string'"
		:to="to"
		v-bind="$attrs"
		:active-class="isSubpage ? '' : undefined"
		:class="{
			'router-link-active': isPrimary && isPrimary(route),
			'subpage-active': isSubpage && isSubpage(route),
			disabled: disabled,
		}"
		class="bread-nav-button w-11 h-11 text-primary rounded-[var(--bread-radius-md)] flex items-center justify-center text-2xl transition-all bg-transparent hover:bg-button-bg hover:text-contrast"
	>
		<slot />
		<span v-if="label" class="bread-nav-button__label">{{ label }}</span>
	</RouterLink>
	<button
		v-else
		v-bind="$attrs"
		class="bread-nav-button button-animation border-none text-primary cursor-pointer w-11 h-11 rounded-[var(--bread-radius-md)] flex items-center justify-center text-2xl transition-all bg-transparent hover:bg-button-bg hover:text-contrast"
		:disabled="disabled"
		@click="to"
	>
		<slot />
		<span v-if="label" class="bread-nav-button__label">{{ label }}</span>
	</button>
</template>

<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

type RouteFunction = (route: RouteLocationNormalizedLoaded) => boolean

withDefaults(
	defineProps<{
		to: (() => void) | string
		isPrimary?: RouteFunction
		isSubpage?: RouteFunction
		highlightOverride?: boolean
		disabled?: boolean
		label?: string
	}>(),
	{
		disabled: false,
		label: undefined,
	},
)

defineOptions({
	inheritAttrs: false,
})
</script>

<style lang="scss" scoped>
.router-link-active,
.subpage-active {
	svg {
		filter: drop-shadow(0 0 0.5rem black);
	}
}

.router-link-active {
	color: var(--bread-color-brand) !important;
	background-color: var(--bread-color-brand-highlight) !important;
	box-shadow: inset 0 0 0 1px rgb(243 169 54 / 26%);
}

.subpage-active {
	color: var(--bread-color-brand) !important;
	background-color: var(--bread-color-surface-panel) !important;
}

.bread-nav-button:has(.bread-nav-button__label) {
	width: 100%;
	justify-content: flex-start;
	gap: 0.75rem;
	padding: 0 0.75rem;
	font-size: 1rem;
	font-weight: 600;
	text-align: left;
}

.bread-nav-button__label {
	font-size: 0.9375rem;
	letter-spacing: 0;
}
</style>
