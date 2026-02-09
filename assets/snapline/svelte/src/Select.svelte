
<script lang="ts">
    import { RectSelectComponent } from "@snap-engine/snapline";
    import type { Engine } from "@snap-engine/core";
    import { onMount, getContext } from "svelte";

    let selectDOM: HTMLDivElement | null = null;
    let engine: Engine = getContext("engine");
    let select = new RectSelectComponent(engine, null);

    onMount(() => {
        select.element = selectDOM as HTMLElement;
    });

</script>

<div id="select-container" bind:this={selectDOM}></div>

<style>
    #select-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        background-color: rgba(0, 0, 0, 0.103);
    }
</style>
