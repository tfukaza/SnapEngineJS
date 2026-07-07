<script lang="ts">
    import { NodeComponent, LineComponent } from "@snap-engine/snapline";
    import type { Engine } from "@snap-engine/core";
    import Line from "./Line.svelte";
    import { onMount, setContext, getContext, onDestroy } from "svelte";
    import { blur } from "svelte/transition";

    let { className = "", LineSvelteComponent = Line, nodeObject = null, x = 0, y = 0, children}: {
        className?: string,
        LineSvelteComponent?: typeof Line,
        nodeObject?: NodeComponent | null,
        x?: number,
        y?: number,
        children: any
    } = $props();
    let nodeDOM: HTMLDivElement | null = null;
    let engine: Engine = getContext("engine");
    const ownsNode = nodeObject == null;
    if (!nodeObject) {
         nodeObject = new NodeComponent(engine, null);
    }
    let lineList: LineComponent[] = $state(nodeObject.getAllOutgoingLines());

    setContext("nodeObject", nodeObject);

    onMount(() => {
        nodeObject.worldTransform = { x, y };
        nodeObject.element = nodeDOM as HTMLElement;
        nodeObject.writeTransform();
        nodeObject.setLineListCallback((lines: LineComponent[]) => {
            lineList = lines;
        });
        lineList = nodeObject.getAllOutgoingLines();
    });

    onDestroy(() => {
        nodeObject.setLineListCallback(() => {});
        if (ownsNode) {
            nodeObject.destroy();
        }
    });

    export function addSetPropCallback(name: string, callback: (prop: any) => void) {
        nodeObject!.addSetPropCallback(callback, name);
    }

    export function getNodeObject() {
        return nodeObject;
    }

</script>


{#each lineList as line (line.id)}
    <LineSvelteComponent {line} />
{/each}
<div bind:this={nodeDOM} data-snapline-type="node" class={className} style="position: absolute;" transition:blur|global={{duration: 200}}>
    {@render children()}
</div>


<style>

</style>
