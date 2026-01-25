import { error } from '@sveltejs/kit';

type DocEntry = {
	slug: string;
	title: string;
	order: number;
	section: string;
	sectionTitle: string;
	sectionOrder: number;
};

type DocSection = {
	name: string;
	title: string;
	order: number;
	entries: DocEntry[];
};

export const entries = (): DocEntry[] => {
	// Use the alias to find files (eager: true to access metadata)
	const modules = import.meta.glob('@docs/**/*.{md,mdx}', { eager: true }) as Record<string, { metadata?: { title?: string; order?: number; section?: string; sectionTitle?: string; sectionOrder?: number } }>;
	const entries: DocEntry[] = [];
	for (const [path, module] of Object.entries(modules)) {
		// Revised regex to match docs/ root structure
		const match = path.match(/docs\/(.*)\.(md|mdx)$/);
		if (match) {
			let slug = match[1];
			// Derive section from original path BEFORE modifying slug
			// e.g., "snapengine/index" -> "snapengine", "snapengine/about" -> "snapengine"
			const originalParts = slug.split('/');
			const derivedSection = originalParts.length > 1 ? originalParts[0] : '';
			
			// Now modify slug for routing
			if (slug.endsWith('/index')) {
				slug = slug.replace(/\/index$/, '');
			} else if (slug === 'index') {
				slug = '';
			}
			const metadata = module.metadata || {};
			
			entries.push({
				slug,
				title: metadata.title || slug || 'Home',
				order: metadata.order ?? 999,
				section: metadata.section ?? derivedSection,
				sectionTitle: metadata.sectionTitle ?? (derivedSection ? derivedSection.charAt(0).toUpperCase() + derivedSection.slice(1).replace(/_/g, ' ') : 'Getting Started'),
				sectionOrder: metadata.sectionOrder ?? (derivedSection ? 999 : 0)
			});
		}
	}
	// Sort by sectionOrder, then section name, then order, then title
	return entries.sort((a, b) => 
		a.sectionOrder - b.sectionOrder || 
		a.section.localeCompare(b.section) || 
		a.order - b.order || 
		a.title.localeCompare(b.title)
	);
};

export const _getGroupedEntries = (): DocSection[] => {
	const allEntries = entries();
	const sections: Map<string, DocSection> = new Map();
	
	for (const entry of allEntries) {
		if (!sections.has(entry.section)) {
			sections.set(entry.section, {
				name: entry.section,
				title: entry.sectionTitle,
				order: entry.sectionOrder,
				entries: []
			});
		}
		sections.get(entry.section)!.entries.push(entry);
	}
	
	return Array.from(sections.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
};

export async function load({ params }) {
	const modules = import.meta.glob('@docs/**/*.{md,mdx}');
	
	let slug = params.slug || '';
	if (slug === '') slug = 'index';
	
	for (const [path, resolver] of Object.entries(modules)) {
		// Parse based on docs root
		const relMatch = path.match(/docs\/(.*)\.(md|mdx)$/);
		if (relMatch) {
			let pathSlug = relMatch[1];
			if (pathSlug === 'index') {
				if (slug === 'index') {
					const mdx: any = await resolver();
					return {
						component: mdx.default,
						metadata: mdx.metadata
					};
				}
			} else {
				// For non-root files
				if (pathSlug.endsWith('/index')) {
					pathSlug = pathSlug.slice(0, -6); // remove '/index'
				}
				
				if (pathSlug === slug && slug !== 'index') {
					const mdx: any = await resolver();
					return {
						component: mdx.default,
						metadata: mdx.metadata
					};
				}
			}
		}
	}

	throw error(404, `Docs page not found: ${slug}`);
}
