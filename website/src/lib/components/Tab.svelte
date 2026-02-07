<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	let { label, children } = $props();

	const { activeTab } = getContext<{ activeTab: Writable<number> }>('codeTabs');
	const registerTab = getContext<(label: string) => number>('registerTab');

	let tabIndex = $state(-1);

	onMount(() => {
		tabIndex = registerTab(label);
	});
</script>

{#if tabIndex >= 0 && $activeTab === tabIndex}
	<div class="code-tab-panel">
		{@render children()}
	</div>
{/if}

<style>
	.code-tab-panel {
		display: block;
	}
</style>
