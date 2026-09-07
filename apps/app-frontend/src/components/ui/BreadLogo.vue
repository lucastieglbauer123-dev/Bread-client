<template>
	<div class="bread-logo" :class="`bread-logo--${variant}`" role="img" aria-label="Bread Client">
		<span class="bread-logo__mark" aria-hidden="true">
			<i></i>
			<i></i>
			<i></i>
		</span>
		<span class="bread-logo__wordmark">Bread Client</span>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		variant?: 'header' | 'splash'
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
	position: relative;
	display: inline-block;
	width: 1.75rem;
	height: 1.6rem;
	flex: 0 0 auto;
	transform: rotate(-3deg);
	border-radius: 0.56rem 0.56rem 0.44rem 0.44rem;
	background: var(--bread-color-brand-bright, #d9fc58);
	box-shadow: inset 0 -0.25rem var(--bread-color-brand, #cbed57);
}

.bread-logo__mark i {
	position: absolute;
	top: 0.32rem;
	width: 0.2rem;
	height: 0.5rem;
	border-radius: 9999px;
	background: #6d8d21;
	transform: rotate(34deg);
}

.bread-logo__mark i:nth-child(1) {
	left: 0.45rem;
}

.bread-logo__mark i:nth-child(2) {
	left: 0.81rem;
}

.bread-logo__mark i:nth-child(3) {
	left: 1.17rem;
}

.bread-logo--splash {
	gap: 0.75rem;
	font-size: 2rem;
}

.bread-logo--splash .bread-logo__mark {
	width: 3rem;
	height: 2.75rem;
	border-radius: 0.95rem 0.95rem 0.75rem 0.75rem;
	box-shadow: inset 0 -0.42rem var(--bread-color-brand, #cbed57);
}

.bread-logo--splash .bread-logo__mark i {
	top: 0.56rem;
	width: 0.32rem;
	height: 0.86rem;
}

.bread-logo--splash .bread-logo__mark i:nth-child(1) {
	left: 0.78rem;
}

.bread-logo--splash .bread-logo__mark i:nth-child(2) {
	left: 1.39rem;
}

.bread-logo--splash .bread-logo__mark i:nth-child(3) {
	left: 2rem;
}
</style>
