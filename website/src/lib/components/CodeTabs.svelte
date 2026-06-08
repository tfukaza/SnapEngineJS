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

<div class="code-tabs">
	<div class="code-tabs-header">
		{#each tabs as tab}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<h3
				class="code-tab-button"
				class:active={$activeTab === tab.index}
				onclick={() => ($activeTab = tab.index)}
			>
				{tab.label}
			</h3>
		{/each}
	</div>
	<div class="code-tabs-content">
		{@render children()}
	</div>
</div>

<style lang="scss">
	.code-tabs-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		margin-bottom: 8px;
		padding-top: 2px;
	}

	.code-tab-button {
		appearance: none;
		background: transparent;
		border: 0;
		border-radius: 0;
		box-shadow: none;
		color: var(--color-background-dark);
		cursor: pointer;
		font-family: "Bitcount Grid Single", monospace;
		font-size: 0.86rem;
		font-weight: 300;
		line-height: 1;
		margin: 0;
		padding: 0;
		text-shadow: none;
		transition:
			color 0.15s ease,
			text-shadow 0.15s ease;
	}

	.code-tab-button:not(:last-child)::after {
		content: "•";
		color: color-mix(in srgb, var(--color-background-dark) 62%, transparent);
		display: inline-block;
		margin: 0 12px;
		text-shadow: none;
	}

	.code-tab-button:hover,
	.code-tab-button:focus-visible,
	.code-tab-button.active {
		background: transparent;
		box-shadow: none;
		color: var(--color-primary);
		text-shadow:
			0 0 1px var(--color-primary),
			0 0 6px rgba(255, 117, 58, 0.52);
	}
</style>
