
<script>
	import "@demo-root/app.scss";
	import "./doc.scss";
	let { data } = $props();

	// Import the grouped entries function from +page.ts for sidebar
	import { _getGroupedEntries } from './+page.ts';
	const docSections = _getGroupedEntries();

	// Compute breadcrumbs from $page.params.slug
	import { page } from '$app/stores';
	const slugParts = $derived($page.params.slug ? $page.params.slug.split('/') : []);
	const breadcrumbs = $derived([
		{ name: 'Docs', href: '/docs' },
		...slugParts.map((part, i) => ({
			name: part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, ' '),
			href: '/docs/' + slugParts.slice(0, i + 1).join('/')
		}))
	]);
</script>


<div class="doc-layout">
	<aside class="doc-sidebar">
		<nav>
			{#each docSections as section}
				<div class="sidebar-section">
					{#if section.name}
						<h3 class="section-title">{section.title}</h3>
					{/if}
					<ul>
						{#each section.entries as entry}
							<li>
								<a href={entry.slug ? `/docs/${entry.slug}` : '/docs'}>{entry.title}</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>
	</aside>
	<main class="doc-content">
		<nav class="doc-breadcrumb">
			{#each breadcrumbs as crumb, i}
				{#if i > 0} <span class="breadcrumb-sep">/</span> {/if}
				<a href={crumb.href}>{crumb.name}</a>
			{/each}
		</nav>
		<div class="doc-header">
			{#if data.metadata}
				{#if data.metadata.title}
					<h1>{data.metadata.title}</h1>
				{/if}
				{#if data.metadata.description}
					<p class="description">{data.metadata.description}</p>
				{/if}
			{/if}
		</div>
		<data.component />
	</main>
</div>

<style>

.doc-layout {
	display: flex;
	gap: var(--size-48);
	margin: 100px auto;
	width: clamp(100px, 90%, 1200px);
}

.doc-sidebar {
	min-width: 200px;
	max-width: 250px;
	/* background: var(--color-background-tint, #f7f7fa);
	border-radius: 12px;
	padding: 2rem 1rem;
	box-shadow: 0 2px 8px rgba(0,0,0,0.03); */
	height: fit-content;
}
.doc-sidebar nav h2 {
	font-size: 1.1rem;
	margin-bottom: 1rem;
}
.doc-sidebar ul {
	list-style: none;
	padding: 0;
	margin: 0;
}
.doc-sidebar li {
	margin-bottom: 0.5rem;
}
.doc-sidebar a {
	color: var(--color-primary, #2a4cff);
	text-decoration: none;
	font-size: 1rem;
}
.doc-sidebar a:hover {
	text-decoration: underline;
}

.doc-content {
	flex: 1 1 0%;
	min-width: 0;
}

.doc-header {
	margin-bottom: 100px;
}

.doc-breadcrumb {
	margin-bottom: 2rem;
	font-size: 0.95rem;
	color: #888;
}
.doc-breadcrumb a {
	color: var(--color-primary, #2a4cff);
	text-decoration: none;
}
.doc-breadcrumb a:hover {
	text-decoration: underline;
}
.breadcrumb-sep {
	margin: 0 0.25em;
	color: #bbb;
}

</style>

