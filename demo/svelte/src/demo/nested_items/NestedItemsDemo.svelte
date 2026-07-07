<script lang="ts">
    import { Engine } from "@snap-engine/asset-base-svelte";
    import { Container, Item } from "@snap-engine/snapsort-svelte";
    import type { Engine as EngineClass } from "@snap-engine/core";

    let engineComponent: Engine | null = null;
    let engineInstance: EngineClass | null = $state(null);
    let debugMode = $state(true);

    const DEBUG_TAGS = [
        { id: "grid", label: "Grid" },
        { id: "hitboxes", label: "Hitboxes" },
        { id: "dom-read-1", label: "DOM Read 1 (red)" },
        { id: "dom-read-2", label: "DOM Read 2 (green)" },
        { id: "dom-read-3", label: "DOM Read 3 (blue)" },
        { id: "rows", label: "Rows" },
        { id: "item-positions", label: "Item Positions" },
        { id: "containers", label: "Containers" },
        { id: "drop-index", label: "Drop Index" },
        { id: "drop-layout", label: "Drop: Virtual Layout" },
        { id: "drop-snapshot", label: "Drop: Snapshot" },
        { id: "drop-collisions", label: "Drop: Collisions" },
        { id: "drop-candidates", label: "Drop: Candidates" },
        { id: "drop-neighbors", label: "Drop: Neighbors (prev/next)" },
        { id: "drop-tiebreak", label: "Drop: Tie-break (prev vs next)" },
        { id: "drop-zones", label: "Drop: Zones" },
        { id: "collisions", label: "Collisions" },
        { id: "animations", label: "Animations" },
    ] as const;

    let enabledTags = $state<Record<string, boolean>>(
        Object.fromEntries(DEBUG_TAGS.map(t => [t.id, t.id.startsWith("drop-")]))
    );

    function applyTagFilter() {
        const renderer = engineInstance?.debugRenderer;
        if (!renderer) return;
        const allEnabled = DEBUG_TAGS.every(t => enabledTags[t.id]);
        if (allEnabled) {
            renderer.enabledTags = null;
        } else {
            renderer.enabledTags = new Set(
                DEBUG_TAGS.filter(t => enabledTags[t.id]).map(t => t.id)
            );
        }
    }

    function onTagChange(id: string) {
        enabledTags[id] = !enabledTags[id];
        applyTagFilter();
    }

    function toggleAll(on: boolean) {
        for (const tag of DEBUG_TAGS) {
            enabledTags[tag.id] = on;
        }
        applyTagFilter();
    }

    // Apply tag filter once the engine is ready
    $effect(() => {
        if (engineInstance) {
            applyTagFilter();
        }
    });

    export function setDebug(enabled: boolean) {
        debugMode = enabled;
    }

    const flatItems = ["Item A", "Item B", "Item C", "Item D"];

    type NestedGroupEntry = { kind: "item"; label: string } | { kind: "group" };
    const nestedGroupEntries: NestedGroupEntry[] = [
        { kind: "item", label: "Item 1" },
        { kind: "item", label: "Item 1.5" },
        { kind: "group" },
        { kind: "item", label: "Item 2" },
        { kind: "item", label: "Item 3" },
    ];
    const nestedGroupChildren = ["Sub A1", "Sub A2", "Sub A3"];

    type DragNestedEntry = { kind: "group"; id: string; labels: string[] } | { kind: "item"; label: string };
    const dragNestedEntries: DragNestedEntry[] = [
        { kind: "group", id: "group-1", labels: ["Group 1 - A", "Group 1 - B"] },
        { kind: "group", id: "group-2", labels: ["Group 2 - A", "Group 2 - B", "Group 2 - C"] },
        { kind: "item", label: "Loose Item" },
    ];

    const rowItems = ["R1", "R2", "R3", "R4"];

    type NestedRowEntry = { kind: "item"; label: string } | { kind: "group" };
    const nestedRowEntries: NestedRowEntry[] = [
        { kind: "item", label: "R1" },
        { kind: "group" },
        { kind: "item", label: "R2" },
        { kind: "item", label: "R3" },
    ];
    const nestedRowChildren = ["S1", "S2", "S3"];

    const wrapRowItems = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

    type LayerEntry =
        | { kind: "leaf"; id: string; icon: string; name: string }
        | { kind: "group"; id: string; label: string; children: { icon: string; name: string }[] };
    const layerEntries: LayerEntry[] = [
        { kind: "leaf", id: "header", icon: "◻", name: "Header" },
        {
            kind: "group",
            id: "hero-section",
            label: "Hero Section",
            children: [
                { icon: "○", name: "Avatar" },
                { icon: "T", name: "Title" },
                { icon: "T", name: "Subtitle" },
            ],
        },
        { kind: "leaf", id: "card-grid", icon: "◻", name: "Card Grid" },
        { kind: "leaf", id: "footer", icon: "◻", name: "Footer" },
    ];
</script>

<div class="page-layout">
<div class="engine-area">
<Engine id="nested-items-demo-canvas" debug={debugMode} bind:this={engineComponent} bind:engine={engineInstance}>
<div class="demos-layout">

    <!-- Demo 1: Flat list -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Flat List</h3>
            <p class="demo-description">Regular items in a snapsort container.</p>
        </div>
        <div class="demo-body">
            <Container
                config={{ direction: "column", groupID: "flat-group" }}
                locked={true}
                items={flatItems}
                getId={(label) => label}
                getClassName={() => "demo-item"}
            >
                {#snippet item(label)}<p>{label}</p>{/snippet}
            </Container>
        </div>
    </div>

    <!-- Demo 2: Nested containers -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Nested Container</h3>
            <p class="demo-description">A container with nested sub-containers and items.</p>
        </div>
        <div class="demo-body">
            <Container
                config={{ direction: "column", groupID: "nested-group" }}
                locked={true}
                items={nestedGroupEntries}
                getId={(e) => (e.kind === "item" ? e.label : "nested-sub-group")}
            >
                {#snippet entry(e)}
                    {#if e.kind === "item"}
                        <Item className="demo-item"><p>{e.label}</p></Item>
                    {:else}
                        <Container
                            config={{ direction: "column", groupID: "nested-group" }}
                            locked={false}
                            items={nestedGroupChildren}
                            getId={(label) => label}
                            getClassName={() => "demo-item sub-item"}
                        >
                            {#snippet item(label)}<p>{label}</p>{/snippet}
                        </Container>
                    {/if}
                {/snippet}
            </Container>
        </div>
    </div>

    <!-- Demo 3: Draggable sub-containers -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Draggable Sub-Containers</h3>
            <p class="demo-description">Nested containers that can be dragged and reordered.</p>
        </div>
        <div class="demo-body">
            <Container
                config={{ direction: "column", groupID: "drag-nested-group" }}
                locked={true}
                items={dragNestedEntries}
                getId={(e) => (e.kind === "group" ? e.id : e.label)}
            >
                {#snippet entry(e)}
                    {#if e.kind === "group"}
                        <Container
                            config={{ direction: "column", groupID: "drag-nested-group" }}
                            locked={false}
                            items={e.labels}
                            getId={(label) => label}
                            getClassName={() => "demo-item sub-item"}
                        >
                            {#snippet item(label)}<p>{label}</p>{/snippet}
                        </Container>
                    {:else}
                        <Item className="demo-item"><p>{e.label}</p></Item>
                    {/if}
                {/snippet}
            </Container>
        </div>
    </div>

    <!-- Demo 4: Horizontal row list -->
    <div class="demo-panel" style="width: 400px;">
        <div class="demo-header">
            <h3>Row Layout</h3>
            <p class="demo-description">Items arranged horizontally in a row container.</p>
        </div>
        <div class="demo-body">
            <Container
                config={{ direction: "row", groupID: "row-group" }}
                locked={true}
                items={rowItems}
                getId={(label) => label}
                getClassName={() => "demo-item row-item"}
            >
                {#snippet item(label)}<p>{label}</p>{/snippet}
            </Container>
        </div>
    </div>

    <!-- Demo 5: Nested row groups -->
    <div class="demo-panel" style="width: 400px;">
        <div class="demo-header">
            <h3>Nested Row Groups</h3>
            <p class="demo-description">Row items with a nested row sub-group that can be reordered.</p>
        </div>
        <div class="demo-body">
            <Container
                config={{ direction: "row", groupID: "nested-row-group" }}
                locked={true}
                items={nestedRowEntries}
                getId={(e) => (e.kind === "item" ? e.label : "nested-row-sub-group")}
            >
                {#snippet entry(e)}
                    {#if e.kind === "item"}
                        <Item className="demo-item row-item"><p>{e.label}</p></Item>
                    {:else}
                        <Container
                            config={{ direction: "row", groupID: "nested-row-group" }}
                            locked={false}
                            items={nestedRowChildren}
                            getId={(label) => label}
                            getClassName={() => "demo-item row-item sub-item"}
                        >
                            {#snippet item(label)}<p>{label}</p>{/snippet}
                        </Container>
                    {/if}
                {/snippet}
            </Container>
        </div>
    </div>

    <!-- Demo 6: Wrapping row -->
    <div class="demo-panel" style="width: 280px;">
        <div class="demo-header">
            <h3>Wrapping Row</h3>
            <p class="demo-description">Many row items that wrap into multiple lines.</p>
        </div>
        <div class="demo-body">
            <Container
                config={{ direction: "row", groupID: "wrap-row" }}
                locked={true}
                items={wrapRowItems}
                getId={(label) => label}
                getClassName={() => "demo-item row-item"}
            >
                {#snippet item(label)}<p>{label}</p>{/snippet}
            </Container>
        </div>
    </div>

    <!-- Demo 6: Layers panel style -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Layers Panel</h3>
            <p class="demo-description">Figma-style layers. Groups are nested containers that can be reordered alongside regular layers.</p>
        </div>
        <div class="layers-panel">
            <Container
                config={{ direction: "column", groupID: "layers" }}
                locked={true}
                items={layerEntries}
                getId={(e) => e.id}
            >
                {#snippet entry(e)}
                    {#if e.kind === "leaf"}
                        <Item className="layer-item">
                            <div class="layer-row">
                                <span class="layer-icon">{e.icon}</span>
                                <span class="layer-name">{e.name}</span>
                            </div>
                        </Item>
                    {:else}
                        <Container
                            config={{ direction: "column", groupID: "layers" }}
                            locked={false}
                            items={e.children}
                            getId={(child) => child.name}
                            getClassName={() => "layer-item"}
                        >
                            <div class="group-label">{e.label}</div>
                            {#snippet item(child)}
                                <div class="layer-row">
                                    <span class="layer-icon">{child.icon}</span>
                                    <span class="layer-name">{child.name}</span>
                                </div>
                            {/snippet}
                        </Container>
                    {/if}
                {/snippet}
            </Container>
        </div>
    </div>

</div>
</Engine>
</div>

{#if debugMode}
<div class="debug-sidebar">
    <div class="debug-sidebar-header">
        <h4>Debug Tags</h4>
        <div class="debug-sidebar-actions">
            <button onclick={() => toggleAll(true)}>All</button>
            <button onclick={() => toggleAll(false)}>None</button>
        </div>
    </div>
    {#each DEBUG_TAGS as tag}
        <label class="debug-tag-item">
            <input type="checkbox" checked={enabledTags[tag.id]} onchange={() => onTagChange(tag.id)} />
            <span></span>
            {tag.label}
        </label>
    {/each}
</div>
{/if}
</div>

<style lang="scss">
    .page-layout {
        display: flex;
        width: 100%;
        height: 100%;
    }

    .engine-area {
        flex: 1;
        min-width: 0;
        height: 100%;
        position: relative;
    }

    .demos-layout {
        width: 100%;
        height: 100%;
        display: flex;
        gap: 24px;
        justify-content: center;
        align-items: flex-start;
        padding: 60px 24px 24px;
        box-sizing: border-box;
        overflow-y: auto;
        pointer-events: auto;
        flex-wrap: wrap;
    }

    .demo-panel {
        width: 280px;
        border: 1px solid var(--color-border, #ccc);
        border-radius: 8px;
        background: var(--color-surface, #fff);
        overflow: hidden;
    }

    .demo-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border, #ccc);

        h3 {
            margin: 0 0 4px;
            font-size: 1em;
        }
    }

    .demo-description {
        margin: 0;
        font-size: 0.75em;
        color: var(--color-text-muted, #888);
    }

    .demo-body {
        padding: 8px;
        min-height: 250px;
    }

    :global(.demo-item) {
        border: 1px solid var(--color-border, #ccc);
        border-radius: 6px;
        background: transparent;
        cursor: grab;

        &:active {
            cursor: grabbing;
        }

        p {
            padding: 6px 12px;
            margin: 0;
            font-size: 0.85em;
            user-select: none;
        }
    }

    :global(.ghost) {
        background: rgba(0, 0, 0, 0.06);
        border-radius: 6px;
    }

    :global(.demo-item.sub-item) {
        border-color: var(--color-accent, #5856D6);
        background: transparent;
        opacity: 0.5;
    }

    :global(.demo-item.row-item) {
        min-width: 50px;
        text-align: center;
    }

    :global(.snapsort-container .snapsort-container) {
        padding-left: 12px;
    }

    /* ---- Layers Panel ---- */

    .layers-panel {
        background: var(--color-background, #fafafa);
        min-height: 300px;
        padding: 4px 0;
    }

    :global(.layer-item) {
        cursor: grab;
        border-bottom: 1px solid var(--color-border, #eee);

        &:active {
            cursor: grabbing;
        }
    }

    .layer-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        user-select: none;
        font-size: 0.85em;
    }

    .layer-icon {
        width: 16px;
        text-align: center;
        opacity: 0.5;
        font-size: 14px;
    }

    .layer-name {
        flex: 1;
    }

    .group-label {
        padding: 4px 12px;
        font-size: 0.75em;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--color-text-muted, #888);
        letter-spacing: 0.05em;
    }

    /* ---- Debug Sidebar ---- */

    .debug-sidebar {
        width: 200px;
        flex-shrink: 0;
        background: var(--color-surface, #fff);
        border-left: 1px solid var(--color-border, #ccc);
        padding: 68px 12px 12px;
        box-sizing: border-box;
        overflow-y: auto;
        pointer-events: auto;
        font-size: 0.8em;
    }

    .debug-sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--color-border, #eee);

        h4 {
            margin: 0;
            font-size: 1em;
        }
    }

    .debug-sidebar-actions {
        display: flex;
        gap: 4px;

        button {
            padding: 2px 8px;
            font-size: 0.75em;
            border: 1px solid var(--color-border, #ccc);
            border-radius: 4px;
            background: var(--color-background, #fafafa);
            cursor: pointer;

            &:hover {
                background: var(--color-border, #eee);
            }
        }
    }

    .debug-tag-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 0;
        cursor: pointer;
        user-select: none;
    }
</style>
