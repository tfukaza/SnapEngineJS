<script lang="ts">
	import {
		frameworkLabels,
		frameworks,
		type Framework
	} from '$lib/stores/frameworkState.svelte';

	let {
		id,
		value,
		onFrameworkChange
	}: {
		id: string;
		value: Framework;
		onFrameworkChange: (framework: Framework) => void;
	} = $props();

	function handleChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		onFrameworkChange(select.value as Framework);
	}
</script>

<div class="framework-select">
	<label class="framework-label" for={id}>Framework</label>
	<select {id} class="framework-dropdown" {value} onchange={handleChange}>
		{#each frameworks as framework}
			<option value={framework}>{frameworkLabels[framework]}</option>
		{/each}
	</select>
</div>

<style lang="scss">
	.framework-select {
		position: relative;
		margin-bottom: var(--size-24);
	}

	.framework-label {
		display: block;
		margin-bottom: var(--size-8);
		color: var(--color-background-dark);
		font-family: "Bitcount Grid Single", monospace;
		font-size: 0.82rem;
		font-weight: 300;
		line-height: 1;
	}

	.framework-dropdown {
		width: 100%;
		box-shadow: none;
		color: var(--color-text);
		font-family: "Geist", sans-serif;
		font-size: 0.9rem;
		font-weight: 400;
		line-height: 1.3;

		&:focus {
			box-shadow: none;
		}

		option {
			color: var(--color-text) !important;
			-webkit-text-fill-color: var(--color-text);
			font-family: "Geist", sans-serif;
			font-weight: 400;
			text-decoration: none;
			font-size: 0.9rem;
			line-height: 1.3;
		}
	}
</style>
