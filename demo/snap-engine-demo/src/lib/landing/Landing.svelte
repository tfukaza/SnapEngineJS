<script lang="ts">
  import { onDestroy } from "svelte";
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
  import type { EmojiWordConnection } from "./components/EmojiWordConnector.svelte";
  import SeqTwoPannable from "./components/SeqTwoPannable.svelte";
  import type { NodePoint } from "./components/SeqTwoPannable.svelte";
  import SeqOneDropDemo from "./components/SeqOneDropDemo.svelte";
  import SeqPanel from "./components/SeqPanel.svelte";
  import { AnimationObject, SequenceObject } from "../../../../../src/animation";
  import type { ItemContainer } from "../../../../../src/asset/drag_and_drop/container";
  import type { Engine } from "../../../../../src/index";
  import { debugState } from "./debugState.svelte";

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

  // Colors available in the bottom container (excludes the default red in top)
  const seqDropItems = [
    { id: "seq-color-2", color: "var(--color-secondary-2)", name: "Sunrise" },
    { id: "seq-color-3", color: "var(--color-secondary-3)", name: "Mint" },
    { id: "seq-color-4", color: "var(--color-secondary-4)", name: "Sky" },
    { id: "seq-color-5", color: "var(--color-secondary-5)", name: "Lavender" }
  ];
  
  // Default red color for top container
  const defaultTopToken = { id: "seq-color-1", color: "var(--color-secondary-1)", name: "Coral" };

  // Reference to the top drop zone container
  let seqOneTopContainer: ItemContainer | undefined = $state();
  
  // Reference to the engine from SeqOneDropDemo
  let seqOneEngine: Engine | null = $state(null);

  // API to get nodes from SeqTwoPannable
  let getSeqTwoNodes: (() => NodePoint[]) | undefined = $state();

  // API to get connections from EmojiWordConnector (Sequence 3)
  let getEmojiConnections: (() => EmojiWordConnection[]) | undefined = $state();

  // Sequence 3: Emoji replacement in preview text
  const EMOJI_REPLACE_INTERVAL = 500; // 500ms per emoji
  let seqThreeInterval: ReturnType<typeof setInterval> | null = null;
  let currentEmojiIndex = $state(0);
  
  // Preview text with emoji replacements
  const originalPreviewLines = ["Interactivity", "Engine", "for the Web"];
  let previewLines = $state([...originalPreviewLines]);

  function startSeqThreeAnimation() {
    if (seqThreeInterval) return;
    
    seqThreeInterval = setInterval(() => {
      const connections = getEmojiConnections?.() ?? [];
      if (connections.length === 0) {
        // Reset to original text if no connections
        previewLines = [...originalPreviewLines];
        return;
      }
      
      // Get current connection based on index
      const connection = connections[currentEmojiIndex % connections.length];
      
      // Reset lines to original first
      const newLines = [...originalPreviewLines];
      
      // Find which line contains this word and replace a random char with emoji
      for (let lineIdx = 0; lineIdx < newLines.length; lineIdx++) {
        const line = originalPreviewLines[lineIdx];
        if (line === connection.headline || line.includes(connection.headline)) {
          // Find valid character positions (not spaces)
          const validPositions: number[] = [];
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== ' ') {
              validPositions.push(i);
            }
          }
          
          if (validPositions.length > 0) {
            const randomPos = validPositions[Math.floor(Math.random() * validPositions.length)];
            newLines[lineIdx] = line.slice(0, randomPos) + connection.glyph + line.slice(randomPos + 1);
          }
          break;
        }
      }
      
      previewLines = newLines;
      currentEmojiIndex = (currentEmojiIndex + 1) % Math.max(1, connections.length);
    }, EMOJI_REPLACE_INTERVAL);
  }

  function stopSeqThreeAnimation(resetText: boolean = false) {
    if (seqThreeInterval) {
      clearInterval(seqThreeInterval);
      seqThreeInterval = null;
    }
    if (resetText) {
      previewLines = [...originalPreviewLines];
    }
  }

  // Start Seq 3 animation when component mounts
  $effect(() => {
    startSeqThreeAnimation();
    return () => stopSeqThreeAnimation(true); // Reset text on unmount
  });

  // Color cycling animation state using AnimationObject
  let currentColorIndex = $state(0);
  let droppedColors: { color: string; name: string; id: string }[] = $state([]);
  let previewTextColor = $derived(
    droppedColors.length > 0 
      ? droppedColors[currentColorIndex % droppedColors.length]?.color ?? "#f5f5f5"
      : "#f5f5f5"
  );
  let previewTextRef: HTMLDivElement | null = $state(null);
  
  // Animation sequence state
  let animationSequence: SequenceObject | null = null;
  let previewTranslateX = $state(0);
  let previewTranslateY = $state(0);

  // Unified animation duration for all sequences
  const ANIMATION_DURATION = 4000; // 4 seconds for full animation cycle

  function updateDroppedColors() {
    if (seqOneTopContainer) {
      const newColors = seqOneTopContainer.getItemsMetadata<{ color: string; name: string; id: string }>();
      const colorsChanged = 
        newColors.length !== droppedColors.length ||
        newColors.some((c, i) => c.id !== droppedColors[i]?.id);
      
      if (colorsChanged) {
        droppedColors = newColors;
        currentColorIndex = 0;
        restartAnimationSequence();
      }
    }
  }

  function stopAnimationSequence() {
    if (animationSequence) {
      // Remove from engine's animation list
      if (seqOneEngine) {
        const index = seqOneEngine.animationList.indexOf(animationSequence);
        if (index !== -1) {
          seqOneEngine.animationList.splice(index, 1);
        }
      }
      animationSequence.cancel();
      animationSequence = null;
    }
  }

  function restartAnimationSequence() {
    stopAnimationSequence();
    
    if (!previewTextRef || droppedColors.length === 0) {
      return;
    }

    // Reset translation
    previewTranslateX = 0;
    previewTranslateY = 0;

    animationSequence = new SequenceObject();
    
    // Get satellite nodes (skip the center node at index 0)
    const allNodes = getSeqTwoNodes?.() ?? [];
    const satelliteNodes = allNodes.filter((n: NodePoint) => n.id !== "node-0");
    
    // Add color animation (cycles through all colors over ANIMATION_DURATION)
    const numColors = droppedColors.length;
    const colorAnim = new AnimationObject(
      previewTextRef!,
      {
        $colorIndex: [0, numColors]
      },
      {
        duration: ANIMATION_DURATION,
        easing: "linear",
        tick: (values: Record<string, number>) => {
          if (typeof values.$colorIndex === "number") {
            const index = Math.floor(values.$colorIndex) % numColors;
            if (index !== currentColorIndex) {
              currentColorIndex = index;
            }
          }
        }
      }
    );
    animationSequence.add(colorAnim);

    // Add translation animation (runs in parallel with same duration)
    if (satelliteNodes.length > 0) {
      const centerX = 128; // BASE_WIDTH / 2
      const centerY = 128; // BASE_HEIGHT / 2
      const scale = 0.15; // Scale down the movement

      const xPositions: number[] = [0];
      const yPositions: number[] = [0];
      
      for (const node of satelliteNodes) {
        xPositions.push((node.x - centerX) * scale);
        yPositions.push((node.y - centerY) * scale);
      }
      // Return to center
      xPositions.push(0);
      yPositions.push(0);

      const translationAnim = new AnimationObject(
        previewTextRef!,
        {
          $translateX: xPositions,
          $translateY: yPositions
        },
        {
          duration: ANIMATION_DURATION,
          easing: "ease-in-out",
          tick: (values: Record<string, number>) => {
            if (typeof values.$translateX === "number") {
              previewTranslateX = values.$translateX;
            }
            if (typeof values.$translateY === "number") {
              previewTranslateY = values.$translateY;
            }
          },
          finish: () => {
            // Restart the whole sequence when done
            restartAnimationSequence();
          }
        }
      );
      
      animationSequence.add(translationAnim);
    } else {
      // No satellite nodes - color animation restarts when done
      colorAnim.property.finish = () => {
        restartAnimationSequence();
      };
    }
    
    animationSequence.play();
    
    // Add to engine's animation list so it gets processed
    if (seqOneEngine) {
      seqOneEngine.enableAnimationEngine();
      seqOneEngine.animationList.push(animationSequence);
    }
  }

  // Poll for changes in the drop zone (since drag events don't trigger reactive updates)
  let pollInterval: ReturnType<typeof setInterval>;
  
  $effect(() => {
    if (seqOneTopContainer) {
      // Start polling for changes
      pollInterval = setInterval(() => {
        updateDroppedColors();
      }, 50); // Poll more frequently (50ms)
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  });

  onDestroy(() => {
    stopAnimationSequence();
    stopPlaybackLoop();
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  // Start playback loop on mount if playing
  $effect(() => {
    if (isPlaying) {
      startPlaybackLoop();
    }
    return () => stopPlaybackLoop();
  });

  // Sequence 4: Scale and rotation controls
  let seqFourScaleX = $state(1.0);
  let seqFourScaleY = $state(1.0);
  let seqFourRotation = $state(0);
  
  // Animated values for Seq 4
  let previewScaleX = $state(1.0);
  let previewScaleY = $state(1.0);
  let previewRotation = $state(0);

  // Timeline seeking state
  let timelineProgress = $state(0);
  let isScrubbing = $state(false);
  let wasPlayingBeforeScrub = false;
  let isPlaying = $state(true);
  
  // Playback loop for updating timeline slider
  let playbackRaf: number | null = null;
  let playbackStartMs = 0;
  let playbackOffsetProgress = 0;

  function startPlaybackLoop() {
    if (playbackRaf !== null) return;
    
    playbackOffsetProgress = timelineProgress;
    playbackStartMs = performance.now();
    
    const step = (now: number) => {
      playbackRaf = null;
      const elapsedMs = now - playbackStartMs;
      const progressDelta = elapsedMs / ANIMATION_DURATION;
      let nextProgress = playbackOffsetProgress + progressDelta;
      
      // Loop back to 0 when reaching 1
      if (nextProgress >= 1) {
        nextProgress = nextProgress % 1;
        playbackOffsetProgress = 0;
        playbackStartMs = now;
      }
      
      timelineProgress = nextProgress;
      playbackRaf = requestAnimationFrame(step);
    };
    
    playbackRaf = requestAnimationFrame(step);
  }

  function stopPlaybackLoop() {
    if (playbackRaf !== null) {
      cancelAnimationFrame(playbackRaf);
      playbackRaf = null;
    }
    playbackOffsetProgress = timelineProgress;
  }

  function setAllAnimationsProgress(progress: number) {
    // Set progress on Seq 1 & 2 animations (in animationSequence)
    if (animationSequence) {
      animationSequence.progress = progress;
    }
    
    // Set progress on Seq 4 animation
    if (seqFourAnimation) {
      seqFourAnimation.progress = progress;
    }
  }

  function pauseAllAnimations() {
    stopPlaybackLoop();
    if (animationSequence) {
      animationSequence.pause();
    }
    if (seqFourAnimation) {
      seqFourAnimation.pause();
    }
    stopSeqThreeAnimation();
  }

  function playAllAnimations() {
    if (animationSequence) {
      animationSequence.play();
    }
    if (seqFourAnimation) {
      seqFourAnimation.play();
    }
    startSeqThreeAnimation();
    startPlaybackLoop();
  }

  function handleTimelineInput(event: Event & { currentTarget: HTMLInputElement }) {
    const value = Number(event.currentTarget?.value ?? 0);
    if (Number.isNaN(value)) return;
    
    timelineProgress = value;
    setAllAnimationsProgress(value);
  }

  function beginTimelineScrub() {
    if (isScrubbing) return;
    isScrubbing = true;
    wasPlayingBeforeScrub = isPlaying;
    
    if (isPlaying) {
      isPlaying = false;
      pauseAllAnimations();
    }
  }

  function endTimelineScrub() {
    if (!isScrubbing) return;
    isScrubbing = false;
    
    if (wasPlayingBeforeScrub) {
      isPlaying = true;
      playAllAnimations();
    }
    wasPlayingBeforeScrub = false;
  }

  function togglePlayback() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playAllAnimations();
    } else {
      pauseAllAnimations();
    }
  }
  
  // Animation for Seq 4 (scale and rotation)
  let seqFourAnimation: AnimationObject | null = null;
  
  function restartSeqFourAnimation() {
    // Cancel existing animation
    if (seqFourAnimation && seqOneEngine) {
      const index = seqOneEngine.animationList.indexOf(seqFourAnimation);
      if (index !== -1) {
        seqOneEngine.animationList.splice(index, 1);
      }
      seqFourAnimation.cancel();
      seqFourAnimation = null;
    }
    
    if (!previewTextRef || !seqOneEngine) return;
    
    // Animate from current values to slider values and back
    seqFourAnimation = new AnimationObject(
      previewTextRef,
      {
        $scaleX: [1.0, seqFourScaleX, 1.0],
        $scaleY: [1.0, seqFourScaleY, 1.0],
        $rotation: [0, seqFourRotation, 0]
      },
      {
        duration: ANIMATION_DURATION,
        easing: "ease-in-out",
        tick: (values: Record<string, number>) => {
          if (typeof values.$scaleX === "number") {
            previewScaleX = values.$scaleX;
          }
          if (typeof values.$scaleY === "number") {
            previewScaleY = values.$scaleY;
          }
          if (typeof values.$rotation === "number") {
            previewRotation = values.$rotation;
          }
        },
        finish: () => {
          restartSeqFourAnimation();
        }
      }
    );
    
    seqFourAnimation.play();
    seqOneEngine.enableAnimationEngine();
    seqOneEngine.animationList.push(seqFourAnimation);
  }
  
  // Restart Seq 4 animation when slider values change
  $effect(() => {
    // Track slider values
    const _x = seqFourScaleX;
    const _y = seqFourScaleY;
    const _r = seqFourRotation;
    
    // Only start if we have an engine
    if (seqOneEngine && previewTextRef) {
      restartSeqFourAnimation();
    }
  });
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
            <div class="grid-item screen card ground">
              <!-- <div class="item-label">
                <span class="label-dot" style="background: var(--color-secondary-5)"></span>
                <span class="label-text">Preview</span>
              </div> -->
              <div class="preview-hero" style="color: {previewTextColor}; transform: translate({previewTranslateX}px, {previewTranslateY}px) scale({previewScaleX}, {previewScaleY}) rotate({previewRotation}deg)" bind:this={previewTextRef}>
                {previewLines[0]}<br />{previewLines[1]}<br />{previewLines[2]}
              </div>
            </div>
            <SeqPanel label="Sequence 1" accent="var(--color-secondary-1)" className="seq-1">
              <SeqOneDropDemo 
                tokens={seqDropItems} 
                initialTopTokens={[defaultTopToken]}
                bind:topContainer={seqOneTopContainer} 
                bind:engine={seqOneEngine} 
              />
            </SeqPanel>
          </div>
          <div class="top-right">
            <SeqPanel label="Sequence 3" accent="var(--color-secondary-3)" className="seq-3" gridColumn="1 / 3" gridRow="1 / 2">
              <div class="seq-3-board">
                <EmojiWordConnector bind:getConnections={getEmojiConnections} />
              </div>
            </SeqPanel>

            <SeqPanel label="Sequence 2" accent="var(--color-secondary-2)" className="seq-2" gridColumn="1 / 2" gridRow="2 / 3">
              <SeqTwoPannable bind:getNodes={getSeqTwoNodes} />
            </SeqPanel>
            <SeqPanel label="Sequence 4" accent="var(--color-secondary-4)" className="seq-4">
              <div class="seq-4-controls">
                <label class="slider-control">
                  <div class="control-header">
                    <span>Scale X</span>
                    <span class="control-value">{seqFourScaleX.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    bind:value={seqFourScaleX}
                    aria-label="Adjust X scale"
                  />
                </label>
                <label class="slider-control">
                  <div class="control-header">
                    <span>Scale Y</span>
                    <span class="control-value">{seqFourScaleY.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.01"
                    bind:value={seqFourScaleY}
                    aria-label="Adjust Y scale"
                  />
                </label>
                <label class="slider-control">
                  <div class="control-header">
                    <span>Rotation</span>
                    <span class="control-value">{seqFourRotation.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    bind:value={seqFourRotation}
                    aria-label="Adjust rotation"
                  />
                </label>
              </div>
            </SeqPanel>
          </div>
        </div>
        <!-- Bottom row - slider -->
        <div class="grid-item slider timeline-controls">
          <div class="timeline-row">
            <button 
              type="button" 
              class="playback-toggle" 
              onclick={togglePlayback}
              aria-label={isPlaying ? "Pause animation" : "Play animation"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <input
              id="wave-timeline"
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={timelineProgress}
              oninput={handleTimelineInput}
              onpointerdown={beginTimelineScrub}
              onpointerup={endTimelineScrub}
              onpointerleave={endTimelineScrub}
              onpointercancel={endTimelineScrub}
              aria-label="Scrub animation timeline"
            />
            <span class="timeline-value">{(timelineProgress * 100).toFixed(0)}%</span>
          </div>
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
  @import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans&display=swap');

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
      // background-color: #26272d;
      --card-color: #26272d;
      // border-radius: 4px;
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
      transition: color 0.5s ease-in-out;
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

     span {
      font-weight: 600;
      font-size: 10px;
    }
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

  .timeline-controls {
    display: flex;
    align-items: center;
    // padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.6);
    border-radius: var(--size-4);
  }

  .timeline-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  .playback-toggle {
    width: 32px;
    height: 32px;
    border: none;
    // border-radius: 50%;
    // background: var(--color-secondary-5);
    --button-color: var(--color-primary);
    color: white;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    // transition: background 0.2s ease;

    // &:hover {
    //   background: var(--color-secondary-4);
    // }
  }

  .timeline-value {
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    color: rgba(15, 23, 42, 0.7);
    min-width: 3ch;
    text-align: right;
  }

  #wave-timeline {
    flex: 1;
    accent-color: var(--color-secondary-5);
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
