<script lang="ts">
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";
</script>

<HighlightCardShell
  className="visual-debugger-card theme-secondary-3"
  title="Visual Debugger"
  description="See what's going on under the hood."
>
    <label>
      <input type="checkbox" class="toggle" bind:checked={debugState.enabled} />
      <span></span>
    </label>

</HighlightCardShell>

<style lang="scss">
 
  .debug-label {
    font-size: 0.65rem;
    font-family: "IBM Plex Mono", monospace;
    color: #fff;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 0.15rem 0.35rem;
    border-radius: 0.25rem;
  }
</style>
