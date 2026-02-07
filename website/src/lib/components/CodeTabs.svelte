<script lang="ts">
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	let { children } = $props();

	// Store for the active tab index
	const activeTab = writable(0);
	setContext('codeTabs', { activeTab });

	// Collect tab labels from children
	let tabs: { label: string; index: number }[] = $state([]);

	export function registerTab(label: string): number {
		const index = tabs.length;
		tabs = [...tabs, { label, index }];
		return index;
	}

	setContext('registerTab', registerTab);
</script>

<div class="card ground code-tabs">
	<div class="code-tabs-header">
		{#each tabs as tab}
			<button
				class="code-tab-button"
				class:active={$activeTab === tab.index}
				onclick={() => ($activeTab = tab.index)}
			>
				{tab.label}
			</button>
		{/each}
	</div>
	<div class="code-tabs-content">
		{@render children()}
	</div>
</div>

<style lang="scss">
	
</style>
