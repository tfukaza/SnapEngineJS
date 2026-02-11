// @ts-nocheck
/**
 * Remark plugin that transforms GitHub-flavored alert blockquotes into styled alert boxes.
 *
 * Usage in MDX:
 * > [!NOTE]
 * > The engine is still in alpha.
 *
 * Supported types: NOTE, TIP, INFO, WARNING, CAUTION
 */

import { visit } from 'unist-util-visit';

const ALERT_TYPES = {
	NOTE: { label: 'Note', icon: 'ℹ️' },
	TIP: { label: 'Tip', icon: '💡' },
	INFO: { label: 'Info', icon: 'ℹ️' },
	WARNING: { label: 'Warning', icon: '⚠️' },
	CAUTION: { label: 'Caution', icon: '🚨' }
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

export function remarkAlerts() {
	return (tree) => {
		visit(tree, 'blockquote', (node, index, parent) => {
			const alertType = extractAlertType(node);
			if (!alertType) return;

			const alertInfo = ALERT_TYPES[alertType];
			const typeLower = alertType.toLowerCase();

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

			// Build replacement nodes
			const openingHtml = {
				type: 'html',
				value: `<div class="doc-alert doc-alert-${typeLower}"><div class="doc-alert-header"><span class="doc-alert-icon">${alertInfo.icon}</span><span class="doc-alert-label">${alertInfo.label}</span></div><div class="doc-alert-body">`
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
