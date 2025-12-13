<script lang="ts">
    import Basic from "./Basic.svelte";
    import Variable from "./Variable.svelte";
    import Sequence from "./Sequence.svelte";
    import TimeControl from "./TimeControl.svelte";
  </script>
    
  <div class="gallery">
    <Basic />
    <Variable />
    <Sequence />
    <TimeControl />
  </div>
    
  <style lang="scss">
    .gallery {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      padding: 10px;
      box-sizing: border-box;
    }

    .gallery > :global(.exhibit) {
      position: relative;
      background-color: #f0f0f0;
      border-radius: 16px;
      overflow: hidden;
      height: 300px;
    }
  
  </style>
  