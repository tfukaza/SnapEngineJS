<script lang="ts">
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";
</script>

<HighlightCardShell
  className="visual-debugger-card theme-secondary-3"
  title="Visual Debugger"
  description="See what's going on under the hood."
>
  <div class="card-content">
    <div
      class="toggle-switch slot"
      class:enabled={debugState.enabled}
      onclick={() => (debugState.enabled = !debugState.enabled)}
      role="switch"
      aria-checked={debugState.enabled}
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ")
          debugState.enabled = !debugState.enabled;
      }}
    >
      <div class="knob disk"></div>
    </div>
    <p class="status-text">Debugger: {debugState.enabled ? "On" : "Off"}</p>
  </div>
</HighlightCardShell>

<style lang="scss">
  .card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }

  .toggle-switch {
    width: 80px;
    height: 48px;
    // background-color: rgba(0, 0, 0, 0.08);
    border-radius: 999px;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    transition: background-color 0.3s ease;
    // border: 2px solid transparent; /* For high contrast mode or consistency */

    &:hover {
      background-color: rgba(0, 0, 0, 0.12);
    }

    &.enabled {
      background-color: var(--color-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  .knob {
    width: 40px;
    height: 40px;
    --ui-radius: 20px;
    --card-color: rgb(29, 29, 29);
    background-color: var(--color-primary);
    // border-radius: 50%;

    position: absolute;
    top: 4px;
    left: 4px;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    // box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    padding: 0;
  }

  .toggle-switch.enabled .knob {
    transform: translateX(32px);
    background-color: white;
  }

  .status-text {
    font-size: 1rem;
    font-weight: 600;
    // color: var(--color-text-secondary);
    color: rgba(0, 0, 0, 0.5);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.8rem;
  }
</style>
