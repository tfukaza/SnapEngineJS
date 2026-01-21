<script lang="ts">
  import Canvas from "@svelte-demo/lib/Canvas.svelte";
  import Item from "@svelte-demo/demo/drag_drop/Item.svelte";
  import Container from "@svelte-demo/demo/drag_drop/ItemContainer.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";

  const items = [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5",
    "Option 6",
    "Option 7",
    "Option 8"
  ];

  const emojiPool = [
    "✨",
    "⚡️",
    "🌈",
    "🔥",
    "🌀",
    "🌟",
    "💧",
    "🍀",
    "🎯",
    "🧠",
    "💡",
    "🎵",
    "🌊",
    "🌸",
    "🚀",
    "🎲"
  ];

  const decoratedItems = items.map((label, index) => ({
    label,
    emoji: emojiPool[index % emojiPool.length]
  }));

  const brailleChar = "⠿";

  let canvasComponent: Canvas | null = null;

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }
</script>
<p class="panel-label">▼ Vertical Drag v0.1</p>
<Canvas id="vertical-drag-drop-canvas" bind:this={canvasComponent} debug={debugState.enabled}>
  <div class="vertical-drag-drop">
    <Container config={{ direction: "column", groupID: "vertical-landing" }}>
      {#each decoratedItems as item (item.label)}
        <Item className="card">
          <div class="drag-item-content">
            <span class="drag-dots" aria-hidden="true">{brailleChar}</span>
            <p>
              <span class="item-emoji" aria-hidden="true">{item.emoji}</span>
              {item.label}
            </p>
          </div>
        </Item>
      {/each}
    </Container>
  </div>
</Canvas>

<style lang="scss">


  @import "../landing.scss";

  .vertical-drag-drop {
    height: 100%;
  }

  :global(.vertical-drag-drop .container) {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    align-items: stretch;
    justify-content: flex-start;
  }

  :global(.vertical-drag-drop .item-wrapper) {
    width: 100%;
    height: 12.5%;
    box-shadow: none;
    --ui-radius: 6px;
    padding: 0.25rem 0.5rem;
  }

  :global(.vertical-drag-drop .item) {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    // padding: 0.25rem 0.5rem;
    gap: 0.5rem;
  }

  .drag-item-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    // justify-content: space-between;
    gap: 0.5rem;
  }

  .drag-dots {
    font-size: 0.75rem;
    color: #9a9796;
    letter-spacing: 0.1em;
  }

  .item-emoji {
    margin-right: 0.35rem;
    font-size: 1rem;
  }
</style>
