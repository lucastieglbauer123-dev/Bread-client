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
		class="w-11 h-11 text-primary rounded-[var(--bread-radius-md)] flex items-center justify-center text-2xl transition-all bg-transparent hover:bg-button-bg hover:text-contrast"
	>
		<slot />
	</RouterLink>
	<button
		v-else
		v-bind="$attrs"
		class="button-animation border-none text-primary cursor-pointer w-11 h-11 rounded-[var(--bread-radius-md)] flex items-center justify-center text-2xl transition-all bg-transparent hover:bg-button-bg hover:text-contrast"
		:disabled="disabled"
		@click="to"
	>
		<slot />
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
	}>(),
	{
		disabled: false,
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
</style>
