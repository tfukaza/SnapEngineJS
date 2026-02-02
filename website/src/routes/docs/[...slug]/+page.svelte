
<script lang="ts">
	import "@demo-root/app.scss";
	import "./doc.scss";
	let { data } = $props();

	// Import the grouped entries function from +page.ts for sidebar
	import { _getGroupedEntries, entries } from './+page.js';
	const docSections = _getGroupedEntries();
	const allEntries = entries();

	// Compute breadcrumbs from $page.params.slug
	import { page } from '$app/stores';
	const slugParts = $derived($page.params.slug ? $page.params.slug.split('/') : []);
	// Strip leading two-digit number prefix (e.g., "01_intro" -> "intro")
	const formatBreadcrumb = (part: string) => {
		const stripped = part.replace(/^\d{2}_/, '');
		return stripped.charAt(0).toUpperCase() + stripped.slice(1).replace(/_/g, ' ');
	};
	const breadcrumbs = $derived([
		{ name: 'Docs', href: '/docs' },
		...slugParts.map((part, i) => ({
			name: formatBreadcrumb(part),
			href: '/docs/' + slugParts.slice(0, i + 1).join('/')
		}))
	]);

	// Compute prev/next navigation
	const currentSlug = $derived($page.params.slug || '');
	const currentIndex = $derived(allEntries.findIndex(e => e.slug === currentSlug));
	const prevEntry = $derived(currentIndex > 0 ? allEntries[currentIndex - 1] : null);
	const nextEntry = $derived(currentIndex < allEntries.length - 1 ? allEntries[currentIndex + 1] : null);

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>


<!-- Mobile sub-navbar with hamburger, breadcrumb, and dropdown menu -->
<div class="mobile-navbar">
	<div class="mobile-navbar-bar">
		<button class="mobile-menu-btn" onclick={toggleMobileMenu} aria-label="Toggle menu">
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
		</button>
		<nav class="mobile-breadcrumb">
			{#each breadcrumbs as crumb, i}
				{#if i > 0} <span class="breadcrumb-sep">/</span> {/if}
				<a href={crumb.href}>{crumb.name}</a>
			{/each}
		</nav>
	</div>

	<!-- Mobile dropdown menu -->
	<div class="mobile-menu-dropdown" class:open={mobileMenuOpen}>
		<nav>
			{#each docSections as section}
				<div class="sidebar-section">
					{#if section.name}
						<h3 class="section-title">{section.title}</h3>
					{/if}
					<ul>
						{#each section.entries as entry}
							<li>
								<a href={entry.slug ? `/docs/${entry.slug}` : '/docs'} onclick={closeMobileMenu}>{entry.title}</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</nav>
	</div>
</div>

<!-- Overlay for mobile menu -->
{#if mobileMenuOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="mobile-overlay" onclick={closeMobileMenu}></div>
{/if}

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

		<nav class="doc-pagination">
			{#if prevEntry}
				<a href={prevEntry.slug ? `/docs/${prevEntry.slug}` : '/docs'} class="pagination-link prev">
					<span class="pagination-label">Previous</span>
					<span class="pagination-title">{prevEntry.title}</span>
				</a>
			{:else}
				<div class="pagination-placeholder"></div>
			{/if}
			{#if nextEntry}
				<a href={nextEntry.slug ? `/docs/${nextEntry.slug}` : '/docs'} class="pagination-link next">
					<span class="pagination-label">Next</span>
					<span class="pagination-title">{nextEntry.title}</span>
				</a>
			{:else}
				<div class="pagination-placeholder"></div>
			{/if}
		</nav>
	</main>
</div>

<style lang="scss">

.doc-layout {
	display: flex;
	gap: var(--size-128);
	margin: 100px auto;
	width: clamp(100px, 90%, 1200px);
}

.doc-sidebar {
	min-width: 200px;
	max-width: 250px;
	height: fit-content;
	border-right: 1px solid #eee;
	padding-right: var(--size-32);

	.sidebar-section {
		margin-bottom: var(--size-48);
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		margin-bottom: var(--size-8);
	}

	a {
		color: var(--color-primary, #2a4cff);
		font-weight: 400;
		text-decoration: none;
		font-size: 0.9rem;
		text-wrap:  balance;

		&:hover {
			text-decoration: underline;
		}
	}
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

	a {
		color: var(--color-primary, #2a4cff);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
}

.breadcrumb-sep {
	margin: 0 0.25em;
	color: #bbb;
}

p.description {
	font-size: 1.2rem;
	color: #555;
	margin-top: 0.5rem;
}

.doc-pagination {
	display: flex;
	justify-content: space-between;
	gap: var(--size-16);
	margin-top: var(--size-64);
	padding-top: var(--size-32);
	border-top: 1px solid #eee;
}

.pagination-placeholder {
	flex: 1;
}

.pagination-link {
	display: flex;
	flex-direction: column;
	flex: 1;
	padding: var(--size-16);
	border: 1px solid #eee;
	border-radius: 8px;
	text-decoration: none;
	transition: border-color 0.2s, background-color 0.2s;

	&:hover {
		border-color: var(--color-primary, #2a4cff);
		background-color: #f8f9ff;
	}

	&.prev {
		align-items: flex-start;
	}

	&.next {
		align-items: flex-end;
		text-align: right;
	}
}

.pagination-label {
	font-size: 0.85rem;
	color: #888;
	margin-bottom: 0.25rem;
}

.pagination-title {
	font-size: 1rem;
	font-weight: 500;
	color: var(--color-primary, #2a4cff);
}

// Mobile navbar (hidden on desktop)
.mobile-navbar {
	display: none;
	position: sticky;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	background: white;
	flex-direction: column;
}

.mobile-navbar-bar {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid #eee;
}

// Mobile menu button
.mobile-menu-btn {
	display: flex;
	background: transparent;
	border: none;
	padding: 8px 8px;
	cursor: pointer;
	flex-direction: column;
	gap: 5px;
	flex-shrink: 0;

	.hamburger-line {
		display: block;
		width: 18px;
		height: 2px;
		background: #333;
		border-radius: 1px;
		transition: transform 0.3s, opacity 0.3s;
		margin-bottom: 0px;

		&.open:nth-child(1) {
			transform: translateY(7px) rotate(45deg);
		}
		&.open:nth-child(2) {
			transform: scaleX(0);
		}
		&.open:nth-child(3) {
			transform: translateY(-7px) rotate(-45deg);
		}
	}
}

// Mobile breadcrumb
.mobile-breadcrumb {
	font-size: 0.85rem;
	color: #888;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	a {
		color: var(--color-primary, #2a4cff);
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.breadcrumb-sep {
		margin: 0 0.25em;
		color: #bbb;
	}
}

// Mobile dropdown menu
.mobile-menu-dropdown {
	display: none;
	max-height: 0;
	overflow: hidden;
	background: white;
	transition: max-height 0.3s ease;

	&.open {
		max-height: 70vh;
		overflow-y: auto;
		border-bottom: 1px solid #eee;
	}

	nav {
		padding: 2rem 1rem;
	}

	.sidebar-section {
		margin-bottom: 1.5rem;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
		margin: 0 0 0.5rem 0;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		margin-bottom: 0.5rem;
	}

	a {
		color: var(--color-primary, #2a4cff);
		text-decoration: none;
		font-size: 0.9rem;

		&:hover {
			text-decoration: underline;
		}
	}
}

// Mobile overlay
.mobile-overlay {
	display: none;
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.3);
	z-index: 99;
}

// Responsive styles
@media (max-width: 768px) {
	.mobile-navbar {
		display: flex;
	}

	.mobile-menu-dropdown {
		display: block;
	}

	.doc-layout {
		margin: 1rem auto;
		padding: 0 1rem;
	}

	// Hide desktop sidebar and breadcrumb on mobile
	.doc-sidebar {
		display: none;
	}

	.doc-breadcrumb {
		display: none;
	}

	.mobile-overlay {
		display: block;
	}

	.doc-header {
		margin-bottom: 2rem;
	}

	.doc-pagination {
		flex-direction: column;
	}

	.pagination-link {
		&.prev, &.next {
			align-items: flex-start;
			text-align: left;
		}
	}
}

</style>

