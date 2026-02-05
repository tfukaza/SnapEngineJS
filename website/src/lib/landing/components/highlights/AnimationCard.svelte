<script lang="ts">
  import { onDestroy } from "svelte";
  import Canvas from "@svelte-demo/lib/Canvas.svelte";
  import { ElementObject } from "@snapline/object";
  import { AnimationObject } from "@snapline/animation";
  import type { Engine } from "@snapline/index";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";

  type Keyframe = {
    time: number;
    label?: string;
  };

  type TrackId = "rotate" | "scale" | "variable";

  type Track = {
    id: TrackId;
    label: string;
    subtitle: string;
    type: "css" | "variable" | "sequence";
    keyframes: Keyframe[];
    range: {
      start: number;
      end: number;
    };
  };

  const TOTAL_DURATION = 4; // seconds
  const TOTAL_DURATION_MS = TOTAL_DURATION * 1000;

  const INITIAL_TIME = 0;
  const timelineMarkers = [0, 1, 2, 3, 4];
  let currentTime = $state(INITIAL_TIME);
  const TRACK_IDS: TrackId[] = ["rotate", "scale", "variable"];
  const KEYFRAME_TIMES = [0, 1.5, 3, TOTAL_DURATION];
  const ROTATION_KEYFRAMES = [0, 135, 270, 360];
  const SCALE_KEYFRAMES = [1, 1.5, 0.5, 1];
  const VARIABLE_KEYFRAMES = [1, 100];

  let counterValue = $state(VARIABLE_KEYFRAMES[0]);
  let engine: Engine | null = $state(null);
  let canvasComponent: Canvas | null = null;
  let animatedSquareRef: HTMLDivElement | null = $state(null);
  let squareObject: ElementObject | null = null;
  let isPlaying = $state(true);
  let trackControllers: Record<TrackId, AnimationObject | null> = {
    rotate: null,
    scale: null,
    variable: null,
  };
  let currentRotation = $state(0);
  let currentScale = $state(1);
  let squareTransform = $state(`rotate(0deg) scale(1)`);
  // Hidden linear time track state
  let playbackRaf: number | null = null;
  let playbackStartMs = 0;
  let playbackOffsetTime = INITIAL_TIME;
  let isScrubbingTimeline = false;
  let resumeAfterScrub = false;

  const TRACK_COLORS: Record<Track["type"], string> = {
    css: "var(--color-secondary-4)",
    variable: "var(--color-secondary-3)",
    sequence: "var(--color-secondary-1)",
  };

  const tracks: Track[] = [
    {
      id: "rotate",
      label: "rotate",
      subtitle: "",
      type: "css",
      keyframes: [
        { time: 0, label: "0°" },
        { time: 4, label: "360°" },
      ],
      range: { start: 0, end: 4 },
    },
    {
      id: "scale",
      label: "scale",
      subtitle: "",
      type: "css",
      keyframes: [
        { time: 0, label: "1×" },
        { time: 1.5, label: "1.5×" },
        { time: 3, label: "0.5×" },
        { time: 4, label: "1×" },
      ],
      range: { start: 0, end: 4 },
    },
    {
      id: "variable",
      label: "variable",
      subtitle: "",
      type: "variable",
      keyframes: [
        { time: 0, label: "1" },
        { time: 4, label: "100" },
      ],
      range: { start: 0, end: 4 },
    },
  ];

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function toPercent(time: number) {
    return `${(time / TOTAL_DURATION) * 100}%`;
  }

  function updateRotationState(rotation: number) {
    const clampedRotation = clamp(rotation, 0, 360);
    currentRotation = clampedRotation;
    squareTransform = `rotate(${currentRotation}deg) scale(${currentScale})`;
  }

  function updateScaleState(scale: number) {
    currentScale = clamp(scale, 0.25, 2);
    squareTransform = `rotate(${currentRotation}deg) scale(${currentScale})`;
  }

  $effect(() => {
    if (!engine || !animatedSquareRef) {
      return;
    }

    if (!squareObject) {
      squareObject = new ElementObject(engine, null);
      squareObject.element = animatedSquareRef;
    }

    ensureTrackAnimations();
  });

  onDestroy(() => {
    stopPlaybackLoop();
    cancelTrackAnimations();
    squareObject?.destroy();
    squareObject = null;
  });

  function startPlaybackLoop() {
    if (typeof window === "undefined") {
      return;
    }

    if (playbackRaf !== null) {
      return;
    }

    playbackOffsetTime = currentTime;
    playbackStartMs = performance.now();

    const step = (now: number) => {
      playbackRaf = null;
      const elapsedSeconds = (now - playbackStartMs) / 1000;
      const nextTime = playbackOffsetTime + elapsedSeconds;
      currentTime = Math.min(nextTime, TOTAL_DURATION);

      if (currentTime >= TOTAL_DURATION) {
        stopPlaybackLoop();
        return;
      }

      playbackRaf = requestAnimationFrame(step);
    };

    playbackRaf = requestAnimationFrame(step);
  }

  function stopPlaybackLoop() {
    if (typeof window === "undefined") {
      playbackOffsetTime = currentTime;
      return;
    }

    if (playbackRaf !== null) {
      cancelAnimationFrame(playbackRaf);
      playbackRaf = null;
    }
    playbackOffsetTime = currentTime;
  }

  function handleTimelineInput(
    event: Event & { currentTarget: HTMLInputElement },
  ) {
    const nextTime = Number(event.currentTarget?.value ?? currentTime);
    if (Number.isNaN(nextTime)) {
      return;
    }
    const progress = clamp(nextTime / TOTAL_DURATION, 0, 1);
    const triggeredScrubSession = !isScrubbingTimeline;
    if (triggeredScrubSession) {
      beginTimelineScrub();
    }
    setTrackProgress(progress);
    if (triggeredScrubSession) {
      endTimelineScrub();
    }
  }

  function beginTimelineScrub() {
    if (isScrubbingTimeline) {
      return;
    }
    isScrubbingTimeline = true;
    resumeAfterScrub = isPlaying;
    if (isPlaying) {
      isPlaying = false;
      stopPlaybackLoop();
      syncPlaybackState();
      return;
    }
    stopPlaybackLoop();
  }

  function endTimelineScrub() {
    if (!isScrubbingTimeline) {
      return;
    }
    isScrubbingTimeline = false;
    if (resumeAfterScrub) {
      isPlaying = true;
      startPlaybackLoop();
      syncPlaybackState();
    }
    resumeAfterScrub = false;
  }

  function ensureTrackAnimations() {
    if (!squareObject || !animatedSquareRef) {
      return;
    }

    const builders: Record<TrackId, () => AnimationObject> = {
      rotate: createRotationAnimation,
      scale: createScaleAnimation,
      variable: createVariableAnimation,
    };

    for (const id of TRACK_IDS) {
      if (trackControllers[id]) {
        continue;
      }

      const animation = builders[id]();
      animation.pause();
      squareObject.addAnimation(animation, { replaceExisting: false });
      animation.progress = currentTime / TOTAL_DURATION;
      trackControllers = { ...trackControllers, [id]: animation };
    }

    syncPlaybackState();

    if (isPlaying) {
      startPlaybackLoop();
    }
  }

  function createRotationAnimation() {
    let controller: AnimationObject;
    controller = new AnimationObject(
      animatedSquareRef,
      {
        $rotation: ROTATION_KEYFRAMES,
      },
      {
        duration: TOTAL_DURATION_MS,
        easing: "linear",
        tick: (values: Record<string, number>) => {
          if (typeof values.$rotation === "number") {
            updateRotationState(values.$rotation);
          }
        },
        finish: () => handleTrackFinish("rotate", controller),
      },
    );
    return controller;
  }

  function createScaleAnimation() {
    let controller: AnimationObject;
    controller = new AnimationObject(
      animatedSquareRef,
      {
        $scale: SCALE_KEYFRAMES,
      },
      {
        duration: TOTAL_DURATION_MS,
        easing: ["cubic-bezier(0.65, 0, 0.35, 1)", "linear", "steps(5, end)"],
        tick: (values: Record<string, number>) => {
          if (typeof values.$scale === "number") {
            updateScaleState(values.$scale);
          }
        },
        finish: () => handleTrackFinish("scale", controller),
      },
    );
    return controller;
  }

  function createVariableAnimation() {
    let controller: AnimationObject;
    controller = new AnimationObject(
      animatedSquareRef,
      {
        $variable: VARIABLE_KEYFRAMES,
      },
      {
        duration: TOTAL_DURATION_MS,
        easing: "ease-in-out",
        tick: (values: Record<string, number>) => {
          if (typeof values.$variable === "number") {
            counterValue = Math.round(values.$variable);
          }
        },
        finish: () => handleTrackFinish("variable", controller),
      },
    );
    return controller;
  }

  function handleTrackFinish(trackId: TrackId, controller: AnimationObject) {
    if (trackControllers[trackId] !== controller) {
      return;
    }
    trackControllers = { ...trackControllers, [trackId]: null };
    if (TRACK_IDS.every((id) => trackControllers[id] === null)) {
      onAllTracksFinished();
    }
  }

  function onAllTracksFinished() {
    updateScaleState(SCALE_KEYFRAMES[SCALE_KEYFRAMES.length - 1]);
    updateRotationState(ROTATION_KEYFRAMES[ROTATION_KEYFRAMES.length - 1]);
    counterValue = VARIABLE_KEYFRAMES[VARIABLE_KEYFRAMES.length - 1];
    currentTime = TOTAL_DURATION;
    stopPlaybackLoop();

    if (isPlaying) {
      resetAnimationCycle();
    }
  }

  function resetAnimationCycle() {
    stopPlaybackLoop();
    cancelTrackAnimations();
    updateScaleState(SCALE_KEYFRAMES[0]);
    updateRotationState(ROTATION_KEYFRAMES[0]);
    counterValue = VARIABLE_KEYFRAMES[0];
    currentTime = 0;
    playbackOffsetTime = 0;
    ensureTrackAnimations();
    setTrackProgress(0);

    if (isPlaying) {
      startPlaybackLoop();
      syncPlaybackState();
    }
  }

  function cancelTrackAnimations() {
    squareObject?.cancelAnimations();
    trackControllers = {
      rotate: null,
      scale: null,
      variable: null,
    };
  }

  function syncPlaybackState() {
    for (const id of TRACK_IDS) {
      const animation = trackControllers[id];
      if (!animation) {
        continue;
      }
      if (isPlaying) {
        animation.play();
      } else {
        animation.pause();
      }
    }
  }

  function setTrackProgress(progress: number) {
    for (const id of TRACK_IDS) {
      const animation = trackControllers[id];
      if (!animation) {
        continue;
      }
      animation.pause();
      animation.progress = progress;
    }
    const clampedProgress = clamp(progress, 0, 1);
    currentTime = clampedProgress * TOTAL_DURATION;
    playbackOffsetTime = currentTime;
    syncPlaybackState();
  }

  function togglePlayback() {
    isPlaying = !isPlaying;
    if (isPlaying && currentTime >= TOTAL_DURATION - 0.01) {
      resetAnimationCycle();
      return;
    }

    ensureTrackAnimations();

    if (isPlaying) {
      startPlaybackLoop();
    } else {
      stopPlaybackLoop();
    }

    syncPlaybackState();
  }
</script>

<HighlightCardShell
  className="animation-card theme-secondary-4"
  title="Animation Engine"
  description="WAAPI based animation engine that's lightweight and performant."
>
  <Canvas id="highlight-animation" bind:engine bind:this={canvasComponent} debug={debugState.enabled}>
    <div class="animation-card">
      <div class="timeline grid-layout">
        <div class="timeline-content">
          <!-- <label class="timeline-label" for="animation-timeline-range"
            >Time</label
          > -->
            <span/>
          <div class="timeline-slider">
            <input
              id="animation-timeline-range"
              type="range"
              min="0"
              max={TOTAL_DURATION}
              step="0.01"
              value={currentTime}
              oninput={handleTimelineInput}
              onpointerdown={beginTimelineScrub}
              onpointerup={endTimelineScrub}
              onpointerleave={endTimelineScrub}
              onpointercancel={endTimelineScrub}
              aria-label="Scrub animation time"
            />
            <span class="playhead" style={`left: calc(8px + (100% - 16px) * ${currentTime / TOTAL_DURATION});`}></span>
          </div>

          <span class="timeline-placeholder" aria-hidden="true"></span>
          <div class="timeline-header">
            {#each timelineMarkers as marker}
              <span>{marker}s</span>
            {/each}
          </div>

          {#each tracks as track}
            <div class="track-meta">
              <span class="track-label">{track.label}</span>
            </div>
            <div class={`track-lane slot ${track.type}`} aria-hidden="true">
              <div
                class="range-bar"
                style={`left: ${toPercent(track.range.start)}; width: calc(${toPercent(track.range.end)} - ${toPercent(track.range.start)}); --range-color: ${TRACK_COLORS[track.type]};`}
              >
                {#each track.keyframes as keyframe}
                  <span
                    class="keyframe-point"
                    style={`left: ${toPercent(keyframe.time)}; background-color: ${TRACK_COLORS[track.type]};`}
                  ></span>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="slot shallow preview-area">
        <div class="preview-square-container">
          <div
            class="animated-square"
            bind:this={animatedSquareRef}
            style={`transform: ${squareTransform};`}
          >
            <span class="value-readout">{counterValue}</span>
          </div>
        </div>
        <!-- <button class="playback-toggle" type="button" onclick={togglePlayback}>
          {isPlaying ? "Pause" : "Play"}
        </button> -->
      </div>
    </div>
  </Canvas>
</HighlightCardShell>

<style lang="scss">

  .animation-card {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100%;
    width: 100%;
  }


  .preview-area {
    flex: 1;
    border-radius: 0 0 var(--ui-radius) var(--ui-radius);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: radial-gradient(circle, rgba(47, 31, 26, 0.15) 1px, transparent 1px);
    background-size: 32px 32px;
    background-color: var(--color-background-tint);
    min-height: 150px;
  }

  .animated-square {
    width: 64px;
    height: 64px;
    border-radius: 0.6rem;
    background-color:var(--color-secondary-1);
    // box-shadow: 0 15px 35px color-mix(in srgb, red 30%, rgba(0, 0, 0, 0.35));
    // transition: transform 0.2s ease, filter 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
    transform: rotate(0deg) scale(1);


    span {
      font-family: 'Doto', sans-serif;
      font-weight: 900;
    }
  }

  // .preview-square-container {
  //   filter: drop-shadow(6px 6px 5px rgba(24, 29, 42, 0.264));
  // }

  .value-readout {
    color: #fffaf6;
  }

  .timeline {
    // border: 1px solid rgba(58, 42, 34, 0.15);
    height: auto;
    box-sizing: border-box;
    // background-color: var(--color-background-tint);
    // border-radius: var(--ui-radius) var(--ui-radius) 0 0;
    padding: 1rem;
  }

  .timeline.grid-layout {
    display: block;
  }

  .timeline-content {
    --timeline-label-width: 100px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: 0.4rem;
    column-gap: 0.6rem;
    align-items: center;
  }

  .timeline-label {
    font-size: 0.7rem;
    // letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(47, 31, 26, 0.55);
  }

  .timeline-slider {
    position: relative;
    margin: 0 8px;
    box-sizing: border-box;
  }

  .timeline-slider input[type="range"] {
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  .timeline-slider .playhead {
    position: absolute;
    top: 100%;
    width: 2px;
    border-radius: 1px;
    height: 100px;
    background: rgb(255, 96, 43);
    transform: translateX(-50%);
    pointer-events: none;
    box-shadow: 4px 4px 4px rgba(28, 38, 44, 0.151);
    z-index: 1;
  }

  .timeline-placeholder {
    height: 1px;
    width: 100%;
  }

  .timeline-header {
    display: flex;
    // grid-template-columns: repeat(5, minmax(0, 1fr));
    // letter-spacing: 0.08em;
    color: rgba(47, 31, 26, 0.55);
    justify-content: space-between;
    margin: 0 8px;
    // align-items: end;

    span {
      font-size: 0.7rem;
    }
  }

  .timeline-header span {
    text-align: right;
  }

  .track-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    color: rgba(47, 31, 26, 0.9);
  }

  .track-label {
    font-size: 0.8rem;
    // letter-spacing: 0.05em;
    // text-transform: uppercase;
  }

  .track-lane {
    position: relative;
    height: 20px;
    border-radius: 10px;
    background-color: var(--color-background-tint);
    border: none;
    // background: none;
    padding: 0px 8px;
    margin: 0px 8px;
    // padding: 0px 4px;
    // box-sizing: border-box;
    // overflow: hidden;  
    .range-bar {
      position: relative;
      height: 20px;
      border-radius: 10px;
      // border: 1px solid var(--range-color, rgba(47, 31, 26, 0.4));
      // box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
      // background-color: var(--color-background);
      pointer-events: none;
    }
  }



  .keyframe-point {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    transform: translate(-50%, -50%) rotate(45deg);
    box-shadow: 2px 2px 2px rgba(10, 30, 53, 0.12);
  }

  .playback-toggle {
    border: none;
    border-radius: 999px;
    padding: 0.4rem 1.25rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: var(--card-accent);
    color: #fffaf6;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px
        color-mix(in srgb, var(--card-accent) 35%, rgba(0, 0, 0, 0.22));
    }

    &:active {
      transform: translateY(0);
      box-shadow: none;
    }
  }

  @media (max-width: 720px) {
    // .track {
    //   grid-template-columns: 1fr;
    // }

    // .timeline-slider {
    //   grid-template-columns: 1fr;
    // }

    // .track-lane {
    //   height: 30px;
    // }
  }
</style>
