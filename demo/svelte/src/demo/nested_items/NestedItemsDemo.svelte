<script lang="ts">
    import { Engine } from "@snap-engine/asset-base-svelte";
    import { Item, ItemContainer as Container } from "@snap-engine/snapsort-svelte";

    let engineComponent: Engine | null = null;
    let debugMode = $state(false);

    export function setDebug(enabled: boolean) {
        debugMode = enabled;
    }
</script>

<Engine id="nested-items-demo-canvas" debug={debugMode} bind:this={engineComponent}>
<div class="demos-layout">

    <!-- Demo 1: Flat list (baseline — should work as before) -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Flat List (Baseline)</h3>
            <p class="demo-description">Regular items in a container. Should work exactly as before.</p>
        </div>
        <div class="demo-body">
            <Container config={{ direction: "column", groupID: "flat-group" }}>
                <Item className="demo-item"><p>Item A</p></Item>
                <Item className="demo-item"><p>Item B</p></Item>
                <Item className="demo-item"><p>Item C</p></Item>
                <Item className="demo-item"><p>Item D</p></Item>
                <Item className="demo-item"><p style="height: 90px; display: flex; align-items: center;">Item E (tall)</p></Item>
            </Container>
        </div>
    </div>

    <!-- Demo 2: Items + nested container (container moves like an item) -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Nested Container</h3>
            <p class="demo-description">A container mixed with items. The nested container should shift/animate like an item when others are dragged.</p>
        </div>
        <div class="demo-body">
            <Container config={{ direction: "column", groupID: "nested-group" }}>
                <Item className="demo-item"><p>Item 1</p></Item>
                <Container config={{ direction: "column", groupID: "sub-group-a" }} locked={false}>
                    <Item className="demo-item sub-item"><p>Sub A1</p></Item>
                    <Item className="demo-item sub-item"><p>Sub A2</p></Item>
                    <Item className="demo-item sub-item"><p>Sub A3</p></Item>
                </Container>
                <Item className="demo-item"><p>Item 2</p></Item>
                <Item className="demo-item"><p>Item 3</p></Item>
            </Container>
        </div>
    </div>

    <!-- Demo 3: Draggable nested container -->
    <div class="demo-panel">
        <div class="demo-header">
            <h3>Draggable Sub-Containers</h3>
            <p class="demo-description">Nested containers can be dragged around like items. Items inside them can also be reordered.</p>
        </div>
        <div class="demo-body">
            <Container config={{ direction: "column", groupID: "drag-nested-group" }}>
                <Container config={{ direction: "column", groupID: "sub-group-b" }} locked={false}>
                    <Item className="demo-item sub-item"><p>Group 1 - A</p></Item>
                    <Item className="demo-item sub-item"><p>Group 1 - B</p></Item>
                </Container>
                <Container config={{ direction: "column", groupID: "sub-group-c" }} locked={false}>
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
            <h3>Layers Panel</h3>
            <p class="demo-description">Figma-style layers. Groups are nested containers that can be reordered alongside regular layers.</p>
        </div>
        <div class="layers-panel">
            <Container config={{ direction: "column", groupID: "layers" }}>
                <Item className="layer-item">
                    <div class="layer-row">
                        <span class="layer-icon">◻</span>
                        <span class="layer-name">Header</span>
                    </div>
                </Item>
                <Container config={{ direction: "column", groupID: "layer-sub-hero" }} locked={false}>
                    <div class="group-label">Hero Section</div>
                    <Item className="layer-item nested">
                        <div class="layer-row">
                            <span class="layer-icon">○</span>
                            <span class="layer-name">Avatar</span>
                        </div>
                    </Item>
                    <Item className="layer-item nested">
                        <div class="layer-row">
                            <span class="layer-icon">T</span>
                            <span class="layer-name">Title</span>
                        </div>
                    </Item>
                    <Item className="layer-item nested">
                        <div class="layer-row">
                            <span class="layer-icon">T</span>
                            <span class="layer-name">Subtitle</span>
                        </div>
                    </Item>
                </Container>
                <Item className="layer-item">
                    <div class="layer-row">
                        <span class="layer-icon">◻</span>
                        <span class="layer-name">Card Grid</span>
                    </div>
                </Item>
                <Item className="layer-item">
                    <div class="layer-row">
                        <span class="layer-icon">◻</span>
                        <span class="layer-name">Footer</span>
                    </div>
                </Item>
            </Container>
        </div>
    </div>

</div>
</Engine>

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

    :global(.demo-item.sub-item) {
        border-color: var(--color-accent, #5856D6);
        background: transparent;
        opacity: 0.5;
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

    :global(.layer-item.nested) {
        padding-left: 16px;
        opacity: 0.5;
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
</style>
