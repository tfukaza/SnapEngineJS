<script lang="ts">

  export interface ExhibitProps { 
    play?: () => void;
    pause?: () => void;
    reverse?: () => void;
    cancel?: () => void;
  }
  let { props, children }: { props: ExhibitProps, children: any } = $props();

</script>

<div class="exhibit" id="basic-animation">
  {@render children()}
  <div class="control-panel">
    <button onclick={() => props.play?.()}>Play</button>
    <button onclick={() => props.pause?.()}>Pause</button>
    <button onclick={() => props.reverse?.()}>Reverse</button>
    <button onclick={() => props.cancel?.()}>Cancel</button>
  </div>
</div>

<style lang="scss">
  .exhibit {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 300px;
    background-color: #f0f0f0;
    border-radius: 16px;
    overflow: hidden;
  }
  .control-panel {
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    gap: 4px;
    z-index: 10;
  }
  .control-panel button {
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    background-color: #333;
    color: white;
    cursor: pointer;
    font-size: 12px;
  }
  .control-panel button:hover {
    background-color: #555;
  }
</style>
