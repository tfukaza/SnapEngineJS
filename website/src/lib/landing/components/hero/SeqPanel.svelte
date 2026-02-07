<script lang="ts">
  export let label: string;
  export let accent: string;
  export let helper: string | null = null;
  export let className = "";
  export let gridArea: string | null = null;
  export let gridColumn: string | null = null;
  export let gridRow: string | null = null;
  export let style: string | null = null;

  $: styleAttr = [
    style?.trim() ?? "",
    gridArea ? `grid-area: ${gridArea}` : "",
    gridColumn ? `grid-column: ${gridColumn}` : "",
    gridRow ? `grid-row: ${gridRow}` : ""
  ].filter(Boolean).join("; ");
</script>

<div class={`seq-panel ${className}`.trim()} style={styleAttr || undefined}>
  <div class="item-label">
    <span class="label-dot" style={`background: ${accent}`}></span>
    <span class="label-text">{label}</span>
    {#if helper}
      <span class="label-helper">{helper}</span>
    {/if}
  </div>
  <slot />
</div>

<style lang="scss">
  .seq-panel {
    position: relative;
    border: 1px solid rgba(148, 163, 184, 0.35);
    padding: var(--size-8);
    padding-top: var(--size-12);
    border-radius: 6px;
  }

  .item-label {
    position: absolute;
    top: 0px;
    left: 5px;
    transform: translateY(-50%);
    display: flex;
    padding: 0 4px;
    align-items: center;
    gap: 0.35rem;
    background-color: #ffffff;

    .label-text {
        // font-size: clamp(0.5rem, 2cqi, 0.75rem);
        font-size: 10px;
        color: #8b8a89;
        white-space: nowrap;
    }
  }

  .label-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }



  .label-helper {
    font-size: clamp(0.45rem, 1.5cqi, 0.6rem);
    color: #a7a4a2;
    text-transform: uppercase;
  }
</style>
