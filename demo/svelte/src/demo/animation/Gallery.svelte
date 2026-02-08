<script lang="ts">
    import { Engine } from "@snap-engine/base-svelte";
    import Basic from "./Basic.svelte";
    import Variable from "./Variable.svelte";
    import Sequence from "./Sequence.svelte";
    import TimeControl from "./TimeControl.svelte";
  </script>
    
  <Engine id="gallery-demo-canvas">
    <div class="gallery">
      <Basic />
      <Variable />
      <Sequence />
      <TimeControl />
    </div>
  </Engine>
    
  <style lang="scss">
    @use "../../../../app.scss";

    .gallery {
      width: 100%;
      height: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: var(--size-16);
      justify-content: center;
      align-content: center;
      overflow-y: auto;
      padding: var(--size-16);
      box-sizing: border-box;
    }


  </style>
  