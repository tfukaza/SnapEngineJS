<script lang="ts">
	import { CodeBlock } from 'svhighlight';

	interface Props {
		code: string;
		language?: string;
		highlightLines?: string;
		showHeader?: boolean;
		showLineNumbers?: boolean;
	}

	let {
		code,
		language = 'typescript',
		highlightLines = '',
		showHeader = true,
		showLineNumbers = true
	}: Props = $props();
</script>

<CodeBlock
	{code}
	{language}
	{highlightLines}
	{showHeader}
	{showLineNumbers}
/>
