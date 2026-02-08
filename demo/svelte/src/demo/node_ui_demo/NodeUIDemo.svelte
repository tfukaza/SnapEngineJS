<script lang="ts">
  import { Engine } from "@snapengine-asset-base/svelte";
  import SimpleNode from "./SimpleNode.svelte";
</script>

<Engine id="node-ui-demo-canvas">
  <div id="node-ui-demo">
    <SimpleNode title="Node A" />
    <SimpleNode title="Node B"  />
    <SimpleNode title="Node C"  />
  </div>
</Engine>

<style>
    #node-ui-demo {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    
    :global(.node) {
        pointer-events: auto;
    }
</style>
