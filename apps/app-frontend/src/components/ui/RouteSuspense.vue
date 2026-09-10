<template>
	<Suspense
		@pending="emit('pending', props.routeKey)"
		@resolve="emit('resolve', props.routeKey)"
	>
		<template #fallback>
			<slot name="fallback" />
		</template>
		<slot />
	</Suspense>
</template>

<script setup lang="ts">
const props = defineProps<{
	routeKey: string
}>()

const emit = defineEmits<{
	pending: [routeKey: string]
	resolve: [routeKey: string]
}>()
</script>
