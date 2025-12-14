<script lang="ts">
  import SimpleNode from "./SimpleNode.svelte";
</script>

<div id="node-ui-demo">
  <SimpleNode title="Node A" />
  <SimpleNode title="Node B"  />
  <SimpleNode title="Node C"  />
</div>

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
