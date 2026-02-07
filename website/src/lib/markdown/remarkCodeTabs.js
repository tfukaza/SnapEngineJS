// @ts-nocheck
/**
 * Remark plugin that groups consecutive code blocks and wraps them for tab display.
 * This runs at the markdown level, before code blocks are highlighted.
 * 
 * Usage in MDX - consecutive code blocks will be grouped:
 * ```javascript
 * const x = 1;
 * ```
 * ```jsx
 * const x = <div>1</div>;
 * ```
 * ```svelte
 * <script>const x = 1;</script>
 * ```
 */

import { visit } from 'unist-util-visit';

// Map of language codes to display labels
const langLabels = {
	'js': 'JavaScript',
	'javascript': 'JavaScript',
	'ts': 'TypeScript',
	'typescript': 'TypeScript',
	'jsx': 'React',
	'tsx': 'React',
	'svelte': 'Svelte',
	'vue': 'Vue',
	'html': 'HTML',
	'css': 'CSS',
	'scss': 'SCSS',
	'json': 'JSON',
	'bash': 'Bash',
	'shell': 'Shell',
	'sh': 'Shell',
	'python': 'Python',
	'py': 'Python',
	'plaintext': 'Text',
	'text': 'Text'
};

export function remarkCodeTabs() {
	return (tree) => {
		// Find groups of consecutive code blocks
		const groups = [];
		let currentGroup = [];
		let lastCodeBlockIndex = -100;

		if (tree.children) {
			for (let i = 0; i < tree.children.length; i++) {
				const node = tree.children[i];
				
				if (node.type === 'code') {
					// Check if there are only empty elements between this and the last code block
					let isConsecutive = false;
					if (currentGroup.length > 0) {
						isConsecutive = true;
						for (let j = lastCodeBlockIndex + 1; j < i; j++) {
							const between = tree.children[j];
							// Allow only empty paragraphs or whitespace text
							const isEmpty = 
								(between.type === 'paragraph' && (!between.children || between.children.length === 0)) ||
								(between.type === 'text' && (!between.value || between.value.trim() === ''));
							if (!isEmpty) {
								isConsecutive = false;
								break;
							}
						}
					}

					if (isConsecutive) {
						currentGroup.push({ node, index: i });
					} else {
						if (currentGroup.length > 1) {
							groups.push([...currentGroup]);
						}
						currentGroup = [{ node, index: i }];
					}
					lastCodeBlockIndex = i;
				}
			}
		}

		if (currentGroup.length > 1) {
			groups.push([...currentGroup]);
		}

		// Process groups in reverse order
		for (const group of groups.reverse()) {
			const startIndex = group[0].index;
			const endIndex = group[group.length - 1].index;
			
			// Build the tab labels
			const tabLabels = group.map(({ node }) => {
				const lang = node.lang || 'text';
				return langLabels[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
			});

			// Create wrapper HTML - use vanilla JS for event handling since this is rendered HTML
			const tabButtonsHtml = tabLabels.map((label, i) => 
				`<button class="code-tab-btn${i === 0 ? ' active' : ''}" data-tab-index="${i}">${label}</button>`
			).join('');

			// Create opening HTML node
			const openingHtml = {
				type: 'html',
				value: `<div class="card ground code-tabs"><div class="code-tabs-header">${tabButtonsHtml}</div><div class="code-tabs-content">`
			};

			// Wrap each code block in a panel
			const wrappedBlocks = group.map(({ node }, i) => [
				{
					type: 'html',
					value: `<div class="code-tab-panel" style="display: ${i === 0 ? 'block' : 'none'};">`
				},
				node,
				{
					type: 'html',
					value: `</div>`
				}
			]).flat();

			// Create closing HTML node
			const closingHtml = {
				type: 'html',
				value: `</div></div>`
			};

			// Replace the code blocks with our wrapped version
			const numToRemove = endIndex - startIndex + 1;
			tree.children.splice(startIndex, numToRemove, openingHtml, ...wrappedBlocks, closingHtml);
		}
	};
}
