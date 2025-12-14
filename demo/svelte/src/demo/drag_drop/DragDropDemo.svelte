<script lang="ts">
  import Item from "./Item.svelte";
  import ItemContainer from "./ItemContainer.svelte";
</script>

<div id="drag-and-drop-container">
  <Item title="Drag Me 1" initialX={50} initialY={50} />
  <Item title="Drag Me 2" initialX={250} initialY={50} />
  <Item title="Drag Me 3" initialX={450} initialY={50} />
  
  <ItemContainer title="Drop Zone" />
</div>

<style>
    #drag-and-drop-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    :global(.item) {
        pointer-events: auto;
    }
</style>
