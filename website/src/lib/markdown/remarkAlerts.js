// @ts-nocheck
/**
 * Remark plugin that transforms GitHub-flavored alert blockquotes into docs callouts.
 *
 * Usage in MDX:
 * > [!NOTE]
 * > The engine is still in alpha.
 *
 * Supported types: NOTE, TIP, INFO, WARNING, CAUTION
 */

import { visit } from 'unist-util-visit';

const ALERT_TYPES = {
	NOTE: { label: 'Note', icon: 'info', tone: 'note' },
	TIP: { label: 'Tip', icon: 'info', tone: 'note' },
	INFO: { label: 'Info', icon: 'info', tone: 'note' },
	WARNING: { label: 'Warning', icon: 'warning', tone: 'warning' },
	CAUTION: { label: 'Caution', icon: 'warning', tone: 'warning' }
};

const VALID_TYPES = new Set(Object.keys(ALERT_TYPES));

function extractAlertType(node) {
	if (!node.children || node.children.length === 0) return null;

	const firstChild = node.children[0];
	if (firstChild.type !== 'paragraph' || !firstChild.children || firstChild.children.length === 0) {
		return null;
	}

	const firstInline = firstChild.children[0];

	// [!NOTE] gets parsed as a linkReference with identifier "!note"
	if (firstInline.type === 'linkReference' && firstInline.referenceType === 'shortcut') {
		const id = firstInline.identifier?.toUpperCase();
		if (id && id.startsWith('!') && VALID_TYPES.has(id.slice(1))) {
			return id.slice(1);
		}
	}

	// Fallback: plain text starting with [!TYPE]
	if (firstInline.type === 'text') {
		const match = firstInline.value.match(/^\[!(NOTE|TIP|INFO|WARNING|CAUTION)\]/);
		if (match) return match[1];
	}

	return null;
}

function isBreakOnlyNode(node) {
	if (node.type === 'break') return true;
	if (node.type === 'html') return /^<br\s*\/?>$/i.test(node.value.trim());
	if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
		return node.name === 'br' && (!node.children || node.children.length === 0);
	}

	return false;
}

export function remarkAlerts() {
	return (tree) => {
		visit(tree, 'blockquote', (node, index, parent) => {
			const alertType = extractAlertType(node);
			if (!alertType) return;

			const alertInfo = ALERT_TYPES[alertType];

			// Strip the [!TYPE] marker from the first paragraph's children
			const firstParagraph = node.children[0];
			const firstInline = firstParagraph.children[0];

			if (firstInline.type === 'linkReference') {
				// Remove the linkReference node
				firstParagraph.children.splice(0, 1);
				// The next node is usually text starting with "\n..."
				if (firstParagraph.children.length > 0 && firstParagraph.children[0].type === 'text') {
					firstParagraph.children[0].value = firstParagraph.children[0].value.replace(/^\n/, '');
				}
			} else {
				// Plain text fallback — strip [!TYPE] prefix
				firstInline.value = firstInline.value.replace(/^\[!(NOTE|TIP|INFO|WARNING|CAUTION)\]\s*/, '');
				if (!firstInline.value) {
					firstParagraph.children.splice(0, 1);
				}
			}

			// Remove empty first paragraph if all children were stripped
			if (firstParagraph.children.length === 0) {
				node.children.splice(0, 1);
			}

			while (node.children.length > 0 && isBreakOnlyNode(node.children[node.children.length - 1])) {
				node.children.pop();
			}

			// Build replacement nodes
			const openingHtml = {
				type: 'html',
				value: `<div class="doc-callout doc-callout-${alertInfo.tone}"><div class="doc-callout-header"><span class="doc-callout-icon material-symbols-outlined" aria-hidden="true">${alertInfo.icon}</span><span class="doc-callout-label">${alertInfo.label}</span></div><div class="doc-callout-body">`
			};

			const closingHtml = {
				type: 'html',
				value: `</div></div>`
			};

			// Replace the blockquote with the alert wrapper + inner content
			parent.children.splice(index, 1, openingHtml, ...node.children, closingHtml);
		});
	};
}
