<script lang="ts">
  import { Connector, Node } from "@snapline/svelte";
  import DemoLine from "./Line.svelte";
  import { NodeComponent } from "@snapline/core";
  import { onMount } from "svelte";

  let node: any = $state(null);
  let { nodeObject, text }: { nodeObject?: NodeComponent | null, text?: string | null } = $props();
  let input: HTMLInputElement | null = null;

  onMount(() => {
    nodeObject = (node as any).getNodeObject();
    if (text) {
      input!.value = text;
      nodeObject!.setProp("text", text);
    }
  });

  function onInput(e: any) {
    const text = (e.target as any).value;
    nodeObject?.setProp("text", text);
  }
</script>

<Node bind:this={node} className="node card" LineSvelteComponent={DemoLine} nodeObject={nodeObject}>
  <div class="row-container">
    <input type="text" oninput={onInput} bind:this={input} />
    <Connector name="text" maxConnectors={0} allowDragOut={true} />
  </div>
</Node>

<style lang="scss">

 input {
    grid-column: 1 / 3;
    width: 100px;
    margin-left: var(--size-12);
    height: var(--size-24);
 }


 
</style>
