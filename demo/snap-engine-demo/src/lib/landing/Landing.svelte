<script lang="ts">
  import InputHandlingCard from "./components/highlights/InputHandlingCard.svelte";
  import AnimationCard from "./components/highlights/AnimationCard.svelte";
  import CameraControlCard from "./components/highlights/CameraControlCard.svelte";
  import DomOptimizationCard from "./components/highlights/DomOptimizationCard.svelte";
  import CollisionCard from "./components/highlights/CollisionCard.svelte";
  import VisualDebuggerCard from "./components/highlights/VisualDebuggerCard.svelte";
  import Canvas from "../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";
  import EmojiWordConnector from "./components/EmojiWordConnector.svelte";
  import SeqTwoPannable from "./components/SeqTwoPannable.svelte";
  import SeqOneDropDemo from "./components/SeqOneDropDemo.svelte";
  import SeqPanel from "./components/SeqPanel.svelte";

  const dragItems = [
    {
      id: "Card A",
      label: "Animation Seq. 1",
      color: "var(--color-secondary-1)",
      description: "Cycle through different colors"
    },
    {
      id: "Card B",
      label: "Animation Seq. 2",
      color: "var(--color-secondary-2)",
      description: "Scale up and down"
    },
    {
      id: "Card C",
      label: "Animation Seq. 3",
      color: "var(--color-secondary-3)",
      description: "Display emojis"
    },
    {
      id: "Card D",
      label: "Animation Seq. 4",
      color: "var(--color-secondary-4)",
      description: "Move the object around"
    }
  ];

  const seqDropItems = [
    { id: "seq-color-1", color: "var(--color-secondary-1)", name: "Coral" },
    { id: "seq-color-2", color: "var(--color-secondary-2)", name: "Sunrise" },
    { id: "seq-color-3", color: "var(--color-secondary-3)", name: "Mint" },
    { id: "seq-color-4", color: "var(--color-secondary-4)", name: "Sky" },
    { id: "seq-color-5", color: "var(--color-secondary-5)", name: "Lavender" }
  ];

  let seqFourPathWeight = 0.45;
  let seqFourDrift = 0.65;
</script>

<section class="page-width" id="landing" style="height: 80vh; position: relative">
  <div class="hero-layout">
    <div class="hero-text">
      <h1>Interactivity<br /> Engine<br /> for the Web</h1>
    </div>
    <div class="hero-card card ground">
      <div class="hero-grid">
        <!-- Top row -->
        <div class="top-row">
          <div class="top-left">
            <div class="grid-item screen">
              <div class="item-label">
                <span class="label-dot" style="background: var(--color-secondary-5)"></span>
                <span class="label-text">Preview</span>
              </div>
              <div class="preview-hero">
                Interactivity<br />Engine<br />for the Web
              </div>
            </div>
            <SeqPanel label="Sequence 1" accent="var(--color-secondary-1)" className="seq-1">
              <SeqOneDropDemo tokens={seqDropItems} />
            </SeqPanel>
          </div>
          <div class="top-right">
            <SeqPanel label="Sequence 3" accent="var(--color-secondary-3)" className="seq-3" gridColumn="1 / 3" gridRow="1 / 2">
              <div class="seq-3-board">
                <EmojiWordConnector />
              </div>
            </SeqPanel>

            <SeqPanel label="Sequence 2" accent="var(--color-secondary-2)" className="seq-2" gridColumn="1 / 2" gridRow="2 / 3">
              <SeqTwoPannable />
            </SeqPanel>
            <SeqPanel label="Sequence 4" accent="var(--color-secondary-4)" className="seq-4">
              <div class="seq-4-controls">
                <label class="slider-control">
                  <div class="control-header">
                    <span>Path weight</span>
                    <span class="control-value">{seqFourPathWeight.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={seqFourPathWeight}
                    aria-label="Adjust path weight"
                  />
                </label>
                <label class="slider-control">
                  <div class="control-header">
                    <span>Drift</span>
                    <span class="control-value">{seqFourDrift.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    bind:value={seqFourDrift}
                    aria-label="Adjust drift"
                  />
                </label>
              </div>
            </SeqPanel>
          </div>
        </div>
        <!-- Middle row - drag cards -->
        <div class="middle-row slot">
          <Canvas id="hero-drag-canvas">
            <Container config={{ direction: "row", groupID: "hero-drag" }}>
              {#each dragItems as item (item.id)}
                <Item className="card">
                  <div class="drag-card-content">
                    <div class="item-label">
                      <span class="label-dot" style="background: {item.color}"></span>
                      <span class="label-text">{item.label}</span>
                    </div>
                    <p class="sequence-description">{item.description}</p>
                  </div>
                </Item>
              {/each}
            </Container>
          </Canvas>
        </div>
        <!-- Bottom row - slider -->
        <div class="grid-item slider">

          <input
            id="wave-timeline"
            type="range"
            min="0"
            max="1"
            step="0.001"

          />
          <!-- <button type="button" class="playback-toggle small" >
            Play
          </button> -->
    
        </div>
      </div>
    </div>
  </div>
</section>

<section class="two-column interactivity-explainer">
<div class="interactivity-intro">
  <h2>…what’s an “Interactivity Engine”?</h2>
  <p>It’s a collection of utilities for adding interactive elements to web apps.</p>
</div>

      <InputHandlingCard />
      <AnimationCard />
      <CameraControlCard />
      <DomOptimizationCard />
      <CollisionCard />
      <VisualDebuggerCard />

</section>

<section class="page-width assets-showcase">
  <div class="explainer-surface">
    <h2 class="eyebrow">Assets</h2>
    <p class="subhead">Projects built on top of SnapEngine.</p>

    <div class="assets-grid">
      <div class="asset-card">
        <h3>SnapZap</h3>
        <p>Zoom and pan any DOM element.</p>
      </div>
      <a href="/dropandsnap" class="asset-card">
        <h3>DropAndSnap</h3>
        <p>Sortable lists and items.</p>
      </a>
      <div class="asset-card">
        <h3>SnapLine</h3>
        <p>Node based UI.</p>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  @use "./landing.scss";
  @import url("https://fonts.googleapis.com/css2?family=Micro+5&display=swap");
  #landing {
    border-radius: var(--size-12);
    background-color: var(--color-background-tint);
  }

  .hero-layout {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: center;
    padding: 0px 50px;
    box-sizing: border-box;
  }

  .hero-text {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    padding-left: 2rem;

    h1 {
      font-size: clamp(2.5rem, 4vw, 3rem);
      line-height: 1.1;
      margin: 0;
    }
  }

  .hero-card {
    height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--size-48);
  }

  .hero-grid {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .top-row {
    flex: 2;
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 0.75rem;
  }

  .top-left {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    .grid-item.screen {
      flex: 1;
      background-color: #232427;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
      padding: 1.5rem;
      box-sizing: border-box;
    }

    .preview-hero {
      font-family: "Micro 5", system-ui;
      font-size: clamp(1rem, 1.5rem, 4rem);

      color: #f5f5f5;
      letter-spacing: 0.05em;
      line-height: 0.9;
    }
  }

  .top-right {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    grid-template-rows: auto 1fr;
    gap: 0.75rem;
    
    :global(.seq-2) {
      grid-column: 1 / -1;
    }
  }

  :global(.seq-1) {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    box-sizing: border-box;
  }

  :global(.seq-4) {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .seq-4-controls {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .slider-control {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(15, 23, 42, 0.75);
  }

  .slider-control input[type="range"] {
    width: 100%;
    accent-color: var(--color-secondary-4);
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .control-value {
    font-variant-numeric: tabular-nums;
    font-size: 0.75rem;
    color: rgba(15, 23, 42, 0.8);
  }

  .middle-row {
    height: 70px;
    background-color: var(--color-background-tint);
  }

  :global(.middle-row .container) {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: stretch;
    filter: drop-shadow(2px 2px 4px rgba(28, 39, 56, 0.114));
  }

  :global(.middle-row .item-wrapper) {
    height: 100%;
    width: 25%;
    box-shadow: none;
    // --ui-radius: var(--size-4);
    padding: 0;
  }

  :global(.middle-row .item) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width:100%;
    padding: 0;
  }

  .drag-card-content {
    width: 100%;
    height: 100%;
    position: relative;
    // display: flex;
    // flex-direction: column;
    // justify-content: flex-end;
    // padding: 0.75rem;
  }

  .grid-item {
    position: relative;
  }

  .item-label {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .label-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .label-text {
    font-size: clamp(0.5rem, 2cqi, 0.75rem);
    color: #8b8a89;
    white-space: nowrap;
  }

  .grid-item, .drag-card-content {
    container-type: inline-size;
  }

  .sequence-description {
    font-size: clamp(0.6rem, 3cqi, 0.85rem);
    color: #5a5654;
    margin: 0;
    margin-top: auto;
  }

  .slider {
    flex: 0.5;
    border-radius: var(--ui-radius);

    input[type="range"] {
      width: 100%;
     
    }
  }

  

  .interactivity-explainer {
    margin-top: clamp(3rem, 6vw, 6rem);
  }

  .interactivity-intro {
    grid-column: 1 / -1;
    text-align: center;
    margin: clamp(20px, 20vh, 300px) auto;

    h2 {
      font-size: clamp(2rem, 4vw, 2.75rem);
      margin-bottom: 0.75rem;
    }

    p {
      font-size: 1rem;
      line-height: 1.6;
    }
  }

  .explainer-surface {
    background: transparent;
    border-radius: 0;
    padding: clamp(1.5rem, 4vw, 3rem);
    text-align: center;
  }

  .eyebrow {
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #3a2a22;
  }

  .subhead {
    color: #5e4d44;
    font-size: 1rem;
    max-width: 32rem;
    margin: 0 auto clamp(2rem, 4vw, 3rem);
    line-height: 1.6;
  }
 
  .assets-showcase {
    margin-top: clamp(3rem, 6vw, 6rem);
    margin-bottom: clamp(3rem, 6vw, 6rem);
  }

  .assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    text-align: left;
    margin-top: 2rem;
  }

  .asset-card {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(125, 106, 95, 0.1);
    border-radius: var(--size-4);
    padding: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: block;
    text-decoration: none;
    color: inherit;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      background: rgba(255, 255, 255, 0.6);
    }

    h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #3a2a22;
    }

    p {
      margin: 0;
      font-size: 0.95rem;
      color: #5e4d44;
      line-height: 1.5;
    }
  }
</style>
