<script lang="ts">
    import DragInstance from "./DragInstance.svelte";
</script>

<div class="split-view">
    <div class="pane">
        <DragInstance canvasId="drag-demo-canvas-1" />
    </div>
    <div class="pane">
        <DragInstance canvasId="drag-demo-canvas-2" />
    </div>
</div>

<style lang="scss">
    .split-view {
        display: flex;
        flex-direction: row;
        width: 100%;
        margin-top: 200px;
        height: 60vh;
        gap: 1rem;
        /* Disable touch gestures */
        touch-action: none;
        -webkit-user-select: none;
        user-select: none;
    }

    .pane {
        flex: 1;
        position: relative;
        border: 1px solid #ccc;
        height: 100%;
        /* Disable touch gestures */
        touch-action: none;
    }
</style>
