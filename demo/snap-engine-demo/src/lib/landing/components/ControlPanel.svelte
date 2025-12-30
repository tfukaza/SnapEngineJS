<script lang="ts">
  export type ControlPanelSlot = {
    id: string;
    label: string;
    column: string;
    row: string;
    supportsDebug?: boolean;
    type?: "hero" | "slot";
  };

  export let slots: ControlPanelSlot[] = [];
  export let debugStates: Record<string, boolean> = {};
  export let onToggleDebug: (slotId: string, enabled: boolean) => void = () => {};

  function handleChange(slotId: string, event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    onToggleDebug(slotId, target.checked);
  }
</script>

<p class="panel-label">▼ Debug Overlay Toggle Control Panel v0.1</p>
<div class="card control-panel">
  <p>Select the panel to enable debug overlays</p>
  <div class="grid-preview" aria-label="Landing layout preview">
    {#each slots as item (item.id)}
      <label
        class={`slot-panel ${item.supportsDebug ? "toggleable" : ""} ${item.type === "hero" ? "hero-slot" : ""}`}
        style={`grid-column: ${item.column}; grid-row: ${item.row};`}
        title={item.label}
        aria-disabled={!item.supportsDebug}
      >
        {#if item.supportsDebug}
          <input
            class="small"
            type="checkbox"
           
            checked={!!debugStates[item.id]}
            on:change={(event) => handleChange(item.id, event)}
          />
          <span></span>
        {:else}
         
        {/if}
      </label>
    {/each}
  </div>
</div>

<style lang="scss">

  @import "../landing.scss";

  .control-panel {
    height: 100%;
    box-sizing: border-box;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    // padding: clamp(1rem, 2vw, 1.5rem);

    p {
      padding-bottom: 0;
    }
  }

  .grid-preview {
    grid-row: 2;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    // grid-template-rows: repeat(6, minmax(0, 1fr));
    gap: 2px;
  }

  .slot-panel {
    // background: rgba(0, 0, 0, 0.04);
    border: 0.5px solid rgb(209, 209, 209);
    border-radius: calc(var(--ui-radius) - 4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5px;
    // gap: 0.5rem;
    // font-size: 0.75rem;
    // color: #5a5a5a;
    // box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .slot-panel input[type="checkbox"] {
    accent-color: var(--color-primary, #3a2a22);
    width: 16px;
    height: 16px;
    margin: 0;
  }

  .slot-panel .slot-label {
    font-size: 0.65rem;
    text-align: center;
    color: #8a8077;
  }

  .slot-panel.hero-slot {
    background: rgba(58, 42, 34, 0.05);
    border-style: dashed;
  }

  .slot-panel:not(.toggleable) {
    opacity: 0.6;
  }
</style>
