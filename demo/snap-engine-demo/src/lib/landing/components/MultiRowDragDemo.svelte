<script lang="ts">
  import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";

  const hemisphereItems = [
    { id: "alpha", left: "#f472b6", right: "#60a5fa" },
    { id: "beta", left: "#34d399", right: "#facc15" },
    { id: "gamma", left: "#c084fc", right: "#f97316" },
  ];

  let canvasComponent: Canvas | null = null;

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }
</script>

<Canvas id="multi-row-drag-demo" bind:this={canvasComponent}>
  <div class="card multi-drop-demo">
    <div class="areas-wrapper">
      <div class="area slot top-area">
        <Container config={{ direction: "row", groupID: "multi-row-landing" }}>
          <p class="drop-placeholder">Drop here</p>
        </Container>
      </div>

      <!-- <p class="drop-area-label">Available Parts </p> -->

      <div class="area bottom-area">
        <Container config={{ direction: "row", groupID: "multi-row-landing" }}>
          {#each hemisphereItems as item (item.id)}
            <Item className="rect-item card">
              <div class="hemisphere-pill">
                <span
                  class="hemisphere left"
                  style={`background: ${item.left};`}
                ></span>
                <span class="pill-body"></span>
                <span
                  class="hemisphere right"
                  style={`background: ${item.right};`}
                ></span>
              </div>
            </Item>
          {/each}
        </Container>
      </div>
    </div>
  </div>
</Canvas>

<style lang="scss">
  @import"../landing.scss";

  .multi-drop-demo {
    width: 100%;
    height: 100%;
    padding: 0.5rem 0.75rem;
    box-sizing: border-box;
  }

  .areas-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .area {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    border-radius: 8px;
  }

  .top-area {
    flex: 0 0 32px;
    height: 32px;
    max-height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    overflow: hidden!important;
  }

  .bottom-area {
    flex: 1 1 auto;
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: transparent;

 
  }

  .drop-area-label {


    text-align: center;

  }

  .drop-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    // display: flex;
    // align-items: center;
    // justify-content: center;
    // font-size: 0.7rem;
    color: #a89aa0;
  }

  :global(.bottom-area .container) {
    gap: 8px;
  }

  :global(.top-area .container) {
    gap: 0px;
  }

  :global(.multi-drop-demo .container) {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    // gap: 0.35rem;
    align-content: flex-start;
  }

  :global(.multi-drop-demo .item-wrapper) {
    height: 32px;
    width: 32px;
  }

  :global(.rect-item.card) {
    box-shadow: 0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06);
    // width: 100%;
    // height: 100%;
    // display: flex;
    // align-items: center;
    // justify-content: center;
  }


  .hemisphere {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 18px;
    transform: translate(0, -50%);
  }

  .hemisphere.left {
    left: 0;
    border-radius: 0 999px 999px 0;
  }

  .hemisphere.right {
    right: 0;
    border-radius: 999px 0 0 999px;
  }


</style>
