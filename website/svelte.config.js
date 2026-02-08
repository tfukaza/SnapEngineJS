import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex, escapeSvelte } from 'mdsvex';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHighlighter } from 'shiki';
import { remarkCodeTabs } from './src/lib/markdown/remarkCodeTabs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mdsvexLayout = join(__dirname, 'src/lib/markdown/MdsvexLayout.svelte');

// Custom shiki theme - edit colors here
const customTheme = {
	name: 'custom-theme',
	type: 'dark',
	colors: {
		'editor.background': '#1f1f22ff',
		'editor.foreground': '#e1e4e8'
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#6e7681', fontStyle: 'italic' }
		},
		{
			scope: ['string', 'string.quoted'],
			settings: { foreground: '#7af16aff' }
		},
		{
			scope: ['constant.numeric', 'constant.language'],
			settings: { foreground: '#79c0ff' }
		},
		{
			scope: ['keyword', 'storage.type', 'storage.modifier'],
			settings: { foreground: '#ff7b72' }
		},
		{
			scope: ['entity.name.function', 'support.function'],
			settings: { foreground: '#f4a85cff' }
		},
		{
			scope: ['variable', 'variable.other'],
			settings: { foreground: '#e1e4e8' }
		},
		{
			scope: ['entity.name.type', 'entity.name.class', 'support.type'],
			settings: { foreground: '#ffa657' }
		},
		{
			scope: ['punctuation', 'meta.brace'],
			settings: { foreground: '#e1e4e8' }
		},
		{
			scope: ['entity.name.tag'],
			settings: { foreground: '#7ee787' }
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: '#79c0ff' }
		},
		{
			scope: ['keyword.operator'],
			settings: { foreground: '#ff7b72' }
		},
		{
			scope: ['constant.other'],
			settings: { foreground: '#79c0ff' }
		}
	]
};

// Create shiki highlighter with custom theme
const highlighter = await createHighlighter({
	themes: [customTheme],
	langs: ['javascript', 'typescript', 'svelte', 'jsx', 'tsx', 'html', 'css', 'json', 'bash', 'shell', 'markdown', 'plaintext']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md', '.mdx'],
			layout: mdsvexLayout,
			remarkPlugins: [remarkCodeTabs],
			highlight: {
				highlighter: (code, lang = 'plaintext') => {
					const html = escapeSvelte(
						highlighter.codeToHtml(code, { lang, theme: 'custom-theme' })
					);
					return `<div class="card ground doc-code-block">{@html \`${html}\`}</div>`;
				}
			}
		})
	],

	extensions: ['.svelte', '.md', '.mdx'],

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		alias: {
			'@snapline/svelte': '../assets/snapline/svelte/src/index.ts',
			'@snapline/core': '../assets/snapline/core/src/index.ts',
			'@snapline': '../src',
			'@svelte-demo': '../demo/svelte/src',
			'@demo-root': '../demo',
			'@docs': '../docs',
			'@components': './src/lib/components',
			'@snapengine-asset-base/svelte': '../assets/snapengine-asset-base/svelte/src/index.ts',
			'@snapengine-asset-base/core': '../assets/snapengine-asset-base/core/src/index.ts',
			'@drop-and-snap/svelte': '../assets/drop-and-snap/svelte/src/index.ts',
			'@drop-and-snap/core': '../assets/drop-and-snap/core/src/index.ts',
			'snap-engine/animation': '../src/animation.ts',
			'snap-engine/debug': '../src/debug.ts',
			'snap-engine/collision': '../src/collision.ts',
			'snap-engine': '../src/index.ts'
		}
	}
};

export default config;
