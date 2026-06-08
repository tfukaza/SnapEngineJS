
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
<div class="mobile-navbar card">
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
								<a
									href={entry.slug ? `/docs/${entry.slug}` : '/docs'}
									class:active={(entry.slug || '') === currentSlug}
									onclick={closeMobileMenu}
								>
									{entry.title}
								</a>
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
								<a
									href={entry.slug ? `/docs/${entry.slug}` : '/docs'}
									class:active={(entry.slug || '') === currentSlug}
								>
									{entry.title}
								</a>
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
	display: grid;
	grid-template-columns: minmax(210px, 260px) minmax(0, 1fr);
	gap: clamp(var(--size-32), 5vw, var(--size-80));
	margin: clamp(var(--size-48), 6vw, var(--size-96)) auto;
	width: clamp(100px, 90%, 1200px);
	align-items: start;
}

.doc-sidebar {
	position: sticky;
	top: var(--size-32);
	min-width: 0;
	max-height: calc(100vh - var(--size-64));
	overflow-y: auto;
	padding: var(--size-24);
	scrollbar-width: thin;

	.sidebar-section {
		margin-bottom: var(--size-24);

		&:last-child {
			margin-bottom: 0;
		}
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	li {
		margin-bottom: var(--size-2);
	}

	a {
		display: block;
		padding: var(--size-8) var(--size-12);
		border-radius: calc(var(--ui-radius) - 2px);
		color: var(--color-text);
		font-weight: 400;
		text-decoration: none;
		font-size: 0.9rem;
		line-height: 1.3;
		text-wrap: balance;
		transition:
			color 0.15s ease,
			text-shadow 0.15s ease;

		&:hover,
		&:focus-visible {
			color: var(--color-primary);
			text-decoration: none;
			text-shadow: 0 0 6px rgba(255, 117, 58, 0.5);
		}

		&.active {
			color: var(--color-secondary-1);
			font-weight: 500;
			text-shadow: 0 0 7px rgba(243, 67, 54, 0.52);
		}
	}
}

.section-title {
	margin: 0 0 var(--size-12);
	color: var(--color-background-dark);
	font-family: "Bitcount Grid Single", monospace;
	font-size: 1rem;
	font-weight: 300;
	letter-spacing: 0;
	line-height: 1;
}

.doc-content {
	min-width: 0;
	max-width: 840px;
}

.doc-header {
	margin-bottom: clamp(var(--size-48), 6vw, var(--size-80));

	h1 {
		margin: 0;
		font-family: "Geist Pixel Circle", sans-serif;
		font-size: clamp(2.25rem, 4.5vw, 4rem);
		font-weight: 500;
		line-height: 0.9;
		text-wrap: balance;
	}
}

.doc-breadcrumb {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.25rem;
	margin-bottom: var(--size-16);
	color: var(--color-background-dark);
	font-family: "Bitcount Grid Single", monospace;
	font-size: 0.84rem;
	font-weight: 300;
	line-height: 1.25;

	a {
		color: inherit;
		font-family: inherit;
		font-size: inherit;
		font-weight: inherit;
		text-decoration: none;

		&:hover {
			color: var(--color-primary);
			text-decoration: none;
		}
	}
}

.breadcrumb-sep {
	margin: 0 0.35em;
	color: color-mix(in srgb, var(--color-background-dark) 55%, transparent);
}

p.description {
	max-width: 680px;
	margin: var(--size-24) 0 0;
	color: var(--color-text);
	font-size: clamp(1rem, 1.6vw, 1.18rem);
	font-weight: 300;
	line-height: 1.6;
}

.doc-pagination {
	display: flex;
	justify-content: space-between;
	gap: var(--size-16);
	margin-top: var(--size-80);
	padding-top: var(--size-32);
	border-top: 1px solid color-mix(in srgb, var(--color-background-dark) 22%, transparent);
}

.pagination-placeholder {
	flex: 1;
}

.pagination-link {
	display: flex;
	flex-direction: column;
	flex: 1;
	padding: var(--size-20);
	border-radius: var(--ui-radius);
	text-decoration: none;
	transition:
		background-color 0.15s ease,
		transform 0.2s;

	&:hover {
		background: var(--color-background-tint);
		transform: translateY(-1px);
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
	color: var(--color-background-dark);
	font-family: "Bitcount Grid Single", monospace;
	font-size: 0.82rem;
	font-weight: 300;
	line-height: 1;
	margin-bottom: var(--size-8);
}

.pagination-title {
	color: var(--color-text);
	font-family: "Geist", sans-serif;
	font-size: 1rem;
	font-weight: 500;
	line-height: 1.3;
}

// Mobile navbar (hidden on desktop)
.mobile-navbar {
	display: none;
	position: sticky;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	--card-color: var(--color-background);
	padding: 0;
	flex-direction: column;
}

.mobile-navbar-bar {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid color-mix(in srgb, var(--color-background-dark) 16%, transparent);
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
	font-family: "Bitcount Grid Single", monospace;

	a {
		color: var(--color-background-dark);
		font-family: inherit;
		font-size: inherit;
		text-decoration: none;

		&:hover {
			color: var(--color-primary);
			text-decoration: none;
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
	background: var(--color-background);
	transition: max-height 0.3s ease;

	&.open {
		max-height: 70vh;
		overflow-y: auto;
		border-bottom: 1px solid color-mix(in srgb, var(--color-background-dark) 16%, transparent);
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
		font-size: 0.92rem;
		font-weight: 300;
		text-transform: none;
		letter-spacing: 0;
		color: var(--color-background-dark);
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
		display: block;
		padding: var(--size-8) var(--size-12);
		border-radius: calc(var(--ui-radius) - 2px);
		color: var(--color-text);
		text-decoration: none;
		font-size: 0.9rem;
		line-height: 1.3;
		transition:
			color 0.15s ease,
			text-shadow 0.15s ease;

		&:hover,
		&:focus-visible {
			color: var(--color-primary);
			text-decoration: none;
			text-shadow: 0 0 6px rgba(255, 117, 58, 0.5);
		}

		&.active {
			color: var(--color-secondary-1);
			font-weight: 500;
			text-shadow: 0 0 7px rgba(243, 67, 54, 0.52);
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
		display: block;
		margin: 1.5rem auto;
		width: clamp(100px, 92%, 720px);
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
