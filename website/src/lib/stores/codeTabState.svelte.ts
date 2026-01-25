/**
 * Global state for code tab framework selection.
 * When a user selects a framework (e.g., React, Svelte, JavaScript),
 * it persists across all code blocks and pages.
 */

// Map of language codes to canonical framework names
const langToFramework: Record<string, string> = {
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

// Store state in an object so we can export it without reassignment issues
const state = $state<{ selectedFramework: string | null }>({ selectedFramework: null });

// Try to load from localStorage on init (browser only)
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('preferredCodeFramework');
	if (stored) {
		state.selectedFramework = stored;
	}
}

export function getSelectedFramework(): string | null {
	return state.selectedFramework;
}

export function setSelectedFramework(framework: string): void {
	state.selectedFramework = framework;
	if (typeof window !== 'undefined') {
		localStorage.setItem('preferredCodeFramework', framework);
	}
}

export function getLangLabel(lang: string): string {
	return langToFramework[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}
