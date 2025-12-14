<script lang="ts">
  import CollisionBox from "./CollisionBox.svelte";
</script>

<div id="collision-demo">
  <CollisionBox title="Box A" initialX={100} initialY={100} color="#ffcccc" />
  <CollisionBox title="Box B" initialX={300} initialY={150} color="#ccffcc" />
  <CollisionBox title="Box C" initialX={200} initialY={300} color="#ccccff" />
  <CollisionBox title="Box D" initialX={450} initialY={300} color="#ffffcc" />
</div>

<style>
    #collision-demo {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    
    :global(.collision-box) {
        pointer-events: auto;
    }
</style>
