<script lang="ts">
    import { Engine } from "@snap-engine/asset-base-svelte";
    import { ItemV2 as Item, ItemContainerV2 as Container } from "@snap-engine/snapsort-svelte";
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
        { id: "drop-collisions", label: "Drop: Collisions" },
        { id: "drop-candidates", label: "Drop: Candidates" },
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
</script>

<Engine id="nested-items-v2-demo-canvas" debug={debugMode} bind:this={engineComponent} bind:engine={engineInstance}>
<div class="demos-layout">

    <!-- Demo 1: Flat list -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Flat List (V2)</h3>
            <p class="demo-description">Regular items in a V2 container.</p>
        </div>
        <div class="demo-body">
            <Container config={{ direction: "column", groupID: "v2-flat-group" }}>
                <Item className="demo-item"><p>Item A</p></Item>
                <Item className="demo-item"><p>Item B</p></Item>
                <Item className="demo-item"><p>Item C</p></Item>
                <Item className="demo-item"><p>Item D</p></Item>
            </Container>
        </div>
    </div>

    <!-- Demo 2: Nested containers -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Nested Container (V2)</h3>
            <p class="demo-description">A container with nested sub-containers and items.</p>
        </div>
        <div class="demo-body">
            <Container config={{ direction: "column", groupID: "v2-nested-group" }}>
                <Item className="demo-item"><p>Item 1</p></Item>
                <Item className="demo-item"><p>Item 1.5</p></Item>
                <Container config={{ direction: "column", groupID: "v2-nested-group" }} locked={false}>
                    <Item className="demo-item sub-item"><p>Sub A1</p></Item>
                    <Item className="demo-item sub-item"><p>Sub A2</p></Item>
                    <Item className="demo-item sub-item"><p>Sub A3</p></Item>
                </Container>
                <Item className="demo-item"><p>Item 2</p></Item>
                <Item className="demo-item"><p>Item 3</p></Item>
            </Container>
        </div>
    </div>

    <!-- Demo 3: Draggable sub-containers -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Draggable Sub-Containers (V2)</h3>
            <p class="demo-description">Nested containers that can be dragged and reordered.</p>
        </div>
        <div class="demo-body">
            <Container config={{ direction: "column", groupID: "v2-drag-nested-group" }}>
                <Container config={{ direction: "column", groupID: "v2-drag-nested-group" }} locked={false}>
                    <Item className="demo-item sub-item"><p>Group 1 - A</p></Item>
                    <Item className="demo-item sub-item"><p>Group 1 - B</p></Item>
                </Container>
                <Container config={{ direction: "column", groupID: "v2-drag-nested-group" }} locked={false}>
                    <Item className="demo-item sub-item"><p>Group 2 - A</p></Item>
                    <Item className="demo-item sub-item"><p>Group 2 - B</p></Item>
                    <Item className="demo-item sub-item"><p>Group 2 - C</p></Item>
                </Container>
                <Item className="demo-item"><p>Loose Item</p></Item>
            </Container>
        </div>
    </div>

    <!-- Demo 4: Layers panel style -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Layers Panel (V2)</h3>
            <p class="demo-description">Figma-style layers. Groups are nested containers that can be reordered alongside regular layers.</p>
        </div>
        <div class="layers-panel">
            <Container config={{ direction: "column", groupID: "v2-layers" }}>
                <Item className="layer-item">
                    <div class="layer-row">
                        <span class="layer-icon">&#x25FB;</span>
                        <span class="layer-name">Header</span>
                    </div>
                </Item>
                <Container config={{ direction: "column", groupID: "v2-layers" }} locked={false}>
                    <div class="group-label">Hero Section</div>
                    <Item className="layer-item">
                        <div class="layer-row">
                            <span class="layer-icon">&#x25CB;</span>
                            <span class="layer-name">Avatar</span>
                        </div>
                    </Item>
                    <Item className="layer-item">
                        <div class="layer-row">
                            <span class="layer-icon">T</span>
                            <span class="layer-name">Title</span>
                        </div>
                    </Item>
                    <Item className="layer-item">
                        <div class="layer-row">
                            <span class="layer-icon">T</span>
                            <span class="layer-name">Subtitle</span>
                        </div>
                    </Item>
                </Container>
                <Item className="layer-item">
                    <div class="layer-row">
                        <span class="layer-icon">&#x25FB;</span>
                        <span class="layer-name">Card Grid</span>
                    </div>
                </Item>
                <Item className="layer-item">
                    <div class="layer-row">
                        <span class="layer-icon">&#x25FB;</span>
                        <span class="layer-name">Footer</span>
                    </div>
                </Item>
            </Container>
        </div>
    </div>

</div>
</Engine>

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

<style lang="scss">
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

    :global(.container-v2 .container-v2) {
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
        position: fixed;
        top: 60px;
        right: 12px;
        width: 200px;
        background: var(--color-surface, #fff);
        border: 1px solid var(--color-border, #ccc);
        border-radius: 8px;
        padding: 8px 12px;
        z-index: 2000;
        pointer-events: auto;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
