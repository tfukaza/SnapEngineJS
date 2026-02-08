<script lang="ts">

  export interface ExhibitProps { 
    play?: () => void;
    pause?: () => void;
    reverse?: () => void;
    cancel?: () => void;
  }
  let { props, children }: { props: ExhibitProps, children: any } = $props();

</script>

<div class="exhibit card" id="basic-animation">
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

    width: 400px;
    height: 300px;

  }
  .control-panel {
    position: absolute;
    top: var(--size-12);
    left: var(--size-12);
    display: flex;
    gap: var(--size-12);
    z-index: 10;

    button {
      color: var(--color-text);
    }
  }

</style>
