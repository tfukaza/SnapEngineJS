<script lang="ts">
	import { onMount } from 'svelte';
	import CodeBlock from '@components/CodeBlock.svelte';
	import './code.scss';

	let { class: className = '', children = () => null } = $props();
	let code = $state('');
	let language = $state('plaintext');
	let hydrated = $state(false);
	let preElement = $state<HTMLPreElement | null>(null);
	const wrapperClass = 'doc-code-block';

	const parseLanguage = (value: string) => {
		const match = value.match(/language-([\w-]+)/i);
		return match?.[1] ?? 'plaintext';
	};

	onMount(() => {
		if (!preElement) {
			return;
		}

		const codeElement = preElement.querySelector('code');
		const rawCode = codeElement?.textContent ?? preElement.textContent ?? '';
		const classSource = `${className} ${codeElement?.className ?? ''}`;

		code = rawCode.trimEnd();
		language = parseLanguage(classSource);
		hydrated = true;
	});
</script>

{#if hydrated}
	<div class={wrapperClass}>
		<CodeBlock {code} {language} />
	</div>
{:else}
	<pre bind:this={preElement} class={`${className} ${wrapperClass}`.trim()}>
		{@render children()}
	</pre>
{/if}
