<script lang="ts">
  import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";
  import type { ItemContainer } from "../../../../../../src/asset/drag_and_drop/container";
  import type { Engine } from "../../../../../../src/index";
  import { debugState } from "../debugState.svelte";

  type SeqToken = {
    id: string;
    color: string;
    name: string;
  };

  interface Props {
    tokens?: SeqToken[];
    initialTopTokens?: SeqToken[];
    topContainer?: ItemContainer;
    engine?: Engine | null;
  }

  let { tokens = [], initialTopTokens = [], topContainer = $bindable(), engine = $bindable<Engine | null>(null) }: Props = $props();
</script>

<Canvas id="seq-drop-demo" bind:engine={engine} debug={debugState.enabled}>
  <div class="mini-drop-demo">
    <div class="mini-drop-top slot">
      <Container config={{ direction: "row", groupID: "seq-1-drop" }} bind:container={topContainer}>
        {#each initialTopTokens as token (token.id)}
          <Item className="color-token card" metadata={{ color: token.color, name: token.name, id: token.id }}>
            <div
              class="color-indicator"
              style={`--token-color: ${token.color}`}
              aria-label={token.name}
            ></div>
          </Item>
        {/each}
        <p class="drop-placeholder" style="display: none">Drop colors here</p>
      </Container>
    </div>
    <div class="mini-drop-bottom">
      <Container config={{ direction: "row", groupID: "seq-1-drop" }}>
        {#each tokens as token (token.id)}
          <Item className="color-token card" metadata={{ color: token.color, name: token.name, id: token.id }}>
            <div
              class="color-indicator"
              style={`--token-color: ${token.color}`}
              aria-label={token.name}
            ></div>
          </Item>
        {/each}
      </Container>
    </div>
  </div>
</Canvas>

<style lang="scss">
  :global(#seq-drop-demo) {
    display: block;
    height: 100%;
    width: 100%;
  }

  .mini-drop-demo {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mini-drop-top {
    flex: 0 0 auto;
    height: 24px;
    position: relative;
    overflow: hidden;
    // padding: 0 0.3rem;
  }

  .mini-drop-bottom {
    flex: 1;
    padding: 0.2rem;
    border-radius: 6px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    min-height: 25px;
    // background: rgba(248, 249, 255, 0.55);
  }

  :global(.mini-drop-demo .container) {
    display: flex;
    flex: 1;
    height: 100%;
    align-items: center;
    align-content: flex-start;
  }

  :global(.mini-drop-bottom .container) {
    flex-wrap: wrap;
    display: flex;
    flex: 1;
    height: 100%;
    gap: 0.2rem;
    align-items: flex-start;
    flex-direction: row;
    border-radius: 4px;
  }

  :global(.mini-drop-top .container) {
    justify-content: flex-start;
  }

  :global(.color-token.card) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    touch-action: none;
    // padding: 0.2rem;
    // background: #fff;
    // border: 1px solid rgba(15, 23, 42, 0.08);
    // box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .color-indicator {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background-color: var(--token-color, #ccc);
    // box-shadow:
    //   0 0 0 1.5px #fff,
    //   0 0 0 3px rgba(15, 23, 42, 0.08);
  }

  .drop-placeholder {
    font-size: 0.52rem;
    color: #a9a5a7;
    margin: 0;
  }
</style>
