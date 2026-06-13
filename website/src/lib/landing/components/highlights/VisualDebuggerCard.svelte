<script lang="ts">
  import { debugState } from "$lib/landing/debugState.svelte";
</script>

<article class="visual-debugger-card theme-secondary-3">
  <div class="visual-debugger-card-heading">
    <h3>
      Visual<br />
      Debugger<br />
      {debugState.enabled ? "On" : "Off"}
    </h3>
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
  </div>
</article>

<style lang="scss">
  .visual-debugger-card {
    --card-padding: var(--size-48);
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    box-sizing: border-box;
    background: var(--color-background-tint);
    border-radius: var(--ui-radius);
    overflow: hidden;

    @media (max-width: 720px) {
      --card-padding: var(--size-24);
      grid-column: span 2;
    }
  }

  .visual-debugger-card-heading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--size-24);
    padding: var(--card-padding);
    text-align: center;

    h3 {
      display: flex;
      flex-direction: column;
      width: min-content;
      margin: 0;
      font-family: "Geist Pixel Circle", "Doto", sans-serif;
      font-size: clamp(3rem, 6.5vw, 5.25rem);
      line-height: 1;
    }

    @media (max-width: 720px) {
      gap: var(--size-20);
      padding: var(--card-padding);
    }
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

</style>
