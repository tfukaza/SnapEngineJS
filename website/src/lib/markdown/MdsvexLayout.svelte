<script context="module">
	import CodeBlockPre from './CodeBlockPre.svelte';
	export const pre = CodeBlockPre;
</script>

<script lang="ts">
	import './code.scss';
	import { onMount } from 'svelte';
	import { getSelectedFramework, setSelectedFramework } from '$lib/stores/codeTabState.svelte';
	
	// Handle code tabs click events and sync with global state
	onMount(() => {
		// Apply the stored framework preference to all tabs on page load
		const applyStoredPreference = () => {
			const preferred = getSelectedFramework();
			if (!preferred) return;
			
			document.querySelectorAll('.code-tabs').forEach((tabs) => {
				const buttons = tabs.querySelectorAll('.code-tab-btn');
				const panels = tabs.querySelectorAll<HTMLElement>('.code-tab-panel');
				
				// Find a button that matches the preferred framework
				let matchIndex = -1;
				buttons.forEach((btn, i) => {
					if (btn.textContent?.trim() === preferred) {
						matchIndex = i;
					}
				});
				
				// If found, activate that tab
				if (matchIndex >= 0) {
					buttons.forEach((b, i) => b.classList.toggle('active', i === matchIndex));
					panels.forEach((p, i) => p.style.display = i === matchIndex ? 'block' : 'none');
				}
			});
		};
		
		// Apply on initial load
		applyStoredPreference();
		
		const handleTabClick = (e: MouseEvent) => {
			const btn = (e.target as HTMLElement)?.closest('.code-tab-btn') as HTMLElement | null;
			if (!btn) return;
			const tabs = btn.closest('.code-tabs');
			if (!tabs) return;
			const index = parseInt(btn.dataset.tabIndex || '0', 10);
			const frameworkLabel = btn.textContent?.trim() || '';
			
			// Update local tabs
			tabs.querySelectorAll('.code-tab-btn').forEach((b, i) => b.classList.toggle('active', i === index));
			tabs.querySelectorAll<HTMLElement>('.code-tab-panel').forEach((p, i) => p.style.display = i === index ? 'block' : 'none');
			
			// Store the selected framework globally
			setSelectedFramework(frameworkLabel);
			
			// Update all other code-tabs on the page to match
			document.querySelectorAll('.code-tabs').forEach((otherTabs) => {
				if (otherTabs === tabs) return; // Skip the one we just clicked
				
				const otherButtons = otherTabs.querySelectorAll('.code-tab-btn');
				const otherPanels = otherTabs.querySelectorAll<HTMLElement>('.code-tab-panel');
				
				// Find a button with the same label
				let matchIndex = -1;
				otherButtons.forEach((otherBtn, i) => {
					if (otherBtn.textContent?.trim() === frameworkLabel) {
						matchIndex = i;
					}
				});
				
				// If found, activate that tab
				if (matchIndex >= 0) {
					otherButtons.forEach((b, i) => b.classList.toggle('active', i === matchIndex));
					otherPanels.forEach((p, i) => p.style.display = i === matchIndex ? 'block' : 'none');
				}
			});
		};
		
		document.addEventListener('click', handleTabClick);
		return () => document.removeEventListener('click', handleTabClick);
	});
</script>

<slot />
