<script lang="ts">
  let {
    debugLayout,
    onToggle,
  }: {
    debugLayout: boolean;
    onToggle: () => void;
  } = $props();
</script>

<div class="toggle-demo">
  <div
    class="mini-toggle-switch slot"
    class:enabled={debugLayout}
    role="switch"
    aria-checked={debugLayout}
    aria-label="Toggle debug layout"
    tabindex="0"
    onclick={onToggle}
    onkeydown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    }}
  >
    <div class="mini-toggle-knob disk"></div>
  </div>
</div>

<style lang="scss">
  .toggle-demo {
    display: flex;
    align-items: center;
  }

  .mini-toggle-switch {
    width: 36px;
    height: 22px;
    --ui-radius: 999px;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }

    &.enabled {
      background-color: var(--color-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  .mini-toggle-knob {
    width: 16px;
    height: 16px;
    --ui-radius: 999px;
    --card-color: rgb(29, 29, 29);
    background-color: var(--color-primary);
    position: absolute;
    top: 3px;
    left: 3px;
    padding: 0;
    transition:
      transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
      background-color 0.3s ease;
  }

  .mini-toggle-switch.enabled .mini-toggle-knob {
    transform: translateX(14px);
    background-color: white;
  }
</style>
