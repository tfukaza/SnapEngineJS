<script lang="ts">
    import { onMount, setContext, getContext } from "svelte";
    import { Background } from "@snap-engine/base";
    import type { Engine } from "@snap-engine/core";
    let background: HTMLDivElement | null = null;

    const engine:Engine = getContext("engine");
    let bg = new Background(engine, null);

    setContext("bg", bg);

    onMount(() => {
        bg.element = background as HTMLElement;
    });
</script>


<div id="sl-background" bind:this={background}></div>


<style lang="scss">
    #sl-background {
        background-color: #fff;
        background-image: radial-gradient(circle, #cccccc 2px, transparent 1px);
        user-select: none;
    }
</style>
