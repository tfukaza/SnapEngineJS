<script lang="ts">
  import HighlightCardShell from "./HighlightCardShell.svelte";

  type Keyframe = {
    time: number;
    label?: string;
    emphasis?: boolean;
  };

  type Track = {
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

  const timelineMarkers = [0, 1, 2, 3, 4];
  let currentTime = $state(1.2);

  const TRACK_COLORS: Record<Track["type"], string> = {
    css: "#7b5bf2",
    variable: "#10b981",
    sequence: "#ff7a18"
  };

  const tracks: Track[] = [
    {
      label: "rotate",
      subtitle: "",
      type: "css",
      keyframes: [
        { time: 0, label: "0°" },
        { time: 4, label: "360°", emphasis: true }
      ],
      range: { start: 0, end: 4 }
    },
    {
      label: "scale",
      subtitle: "",
      type: "css",
      keyframes: [
        { time: 0, label: "1×" },
        { time: 1.5, label: "1.5×", emphasis: true },
        { time: 3, label: "0.5×" },
        { time: 4, label: "1×" }
      ],
      range: { start: 0, end: 4 }
    },
    {
      label: "energy var",
      subtitle: "",
      type: "variable",
      keyframes: [
        { time: 0, label: "1" },
        { time: 4, label: "100", emphasis: true }
      ],
      range: { start: 0, end: 4 }
    }
  ];

  const toPercent = (time: number) => `${(time / TOTAL_DURATION) * 100}%`;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
  const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t));

  const getRotation = (time: number) => {
    const normalized = clamp(time, 0, TOTAL_DURATION) / TOTAL_DURATION;
    return lerp(0, 360, normalized);
  };

  const getScale = (time: number) => {
    const clamped = clamp(time, 0, TOTAL_DURATION);

    if (clamped <= 1.5) {
      const eased = easeInOut(clamped / 1.5);
      return lerp(1, 1.5, eased);
    }

    if (clamped <= 3) {
      const progress = (clamped - 1.5) / (3 - 1.5);
      return lerp(1.5, 0.5, progress);
    }

    return 1; // snap back via step timing
  };

  const getCounterValue = (time: number) => {
    const normalized = clamp(time, 0, TOTAL_DURATION) / TOTAL_DURATION;
    const eased = easeInOut(normalized);
    return Math.round(lerp(1, 100, eased));
  };
</script>

<HighlightCardShell className="animation-card">
  <div class="card-heading">
    <h3>Animation</h3>
    <p>WAAPI based animation engine that's lightweight and performant.</p>
  </div>

  <div class="preview-area">
    <div
      class="animated-square"
      style={`transform: rotate(${getRotation(currentTime)}deg) scale(${getScale(currentTime)});`}
    >
      <span class="value-readout">{getCounterValue(currentTime)}</span>
    </div>
  </div>

  <div class="timeline grid-layout">
    <div class="timeline-content">
      <div class="timeline-slider">
        <span></span>
        <input
          type="range"
          min="0"
          max={TOTAL_DURATION}
          step="0.05"
          bind:value={currentTime}
          aria-label="Scrub animation time"
        />
      </div>
      <div class="timeline-header">
        <span></span>
        {#each timelineMarkers as marker}
          <span>{marker}s</span>
        {/each}
      </div>
      <div class="tracks">
        {#each tracks as track}
          <div class={`track ${track.type}`}>
            <div class="track-meta">
              <span class="track-label">{track.label}</span>
            </div>
            <div class="track-lane" aria-hidden="true">
              <span
                class="range-bar"
                style={`left: ${toPercent(track.range.start)}; width: calc(${toPercent(track.range.end)} - ${toPercent(track.range.start)}); --range-color: ${TRACK_COLORS[track.type]};`}
              ></span>
              {#each track.keyframes as keyframe}
                <span class={`keyframe-point ${keyframe.emphasis ? "emphasis" : ""}`} style={`left: ${toPercent(keyframe.time)}; background-color: ${TRACK_COLORS[track.type]};`}></span>
              {/each}
              <span class="playhead" style={`left: ${toPercent(currentTime)};`}></span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</HighlightCardShell>

<style lang="scss">
  .animation-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card-heading h3 {
    margin: 0;
  }

  .card-heading p {
    margin: 0.35rem 0 0;
    color: rgba(58, 42, 34, 0.8);
  }

  .preview-area {
    height: 110px;
    border-radius: 0.9rem;
    background: #f0ebe6;
    border: 1px solid rgba(58, 42, 34, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .animated-square {
    width: 64px;
    height: 64px;
    border-radius: 0.6rem;
    background: linear-gradient(135deg, #7b5bf2, #ff7a18);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.18);
    // transition: transform 0.2s ease, filter 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fffaf6;
    font-weight: 600;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.05em;
  }

  .value-readout {
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.18));
  }

  .timeline {
    background: #f9f7f4;
    border-radius: 0.9rem;
    padding: 1rem;
    color: #2f1f1a;
    box-shadow: inset 0 0 0 1px rgba(58, 42, 34, 0.15);
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  }

  .timeline.grid-layout {
    display: block;
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .timeline-slider {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    align-items: center;
    column-gap: 0.6rem;
  }

  .timeline-slider input[type="range"] {
    width: 100%;
    accent-color: #2f1f1a;
  }

  .timeline-header {
    display: grid;
    grid-template-columns: 150px repeat(5, minmax(0, 1fr));
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    color: rgba(47, 31, 26, 0.55);
    margin-bottom: 0.75rem;
    align-items: end;
  }

  .timeline-header span {
    text-align: right;
  }

  .tracks {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .track {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 0.6rem;
    align-items: center;
    color: rgba(47, 31, 26, 0.9);
  }

  .track-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .track-label {
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }


  .track-lane {
    position: relative;
    height: 36px;
    border-radius: 0.75rem;
    border: none;
    background: none;
    overflow: hidden;
  }

  .range-bar {
    position: absolute;
    top: 8px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid var(--range-color, rgba(47, 31, 26, 0.4));
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
    pointer-events: none;
    background: none;
  }

  .keyframe-point {
    position: absolute;
    top: 50%;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  }

  .keyframe-point.emphasis {
    width: 14px;
    height: 14px;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
  }

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(47, 31, 26, 0.6);
    transform: translateX(-50%);
    pointer-events: none;
  }

  .track.css .track-lane {
    background-color: rgba(123, 91, 242, 0.1);
    border-color: rgba(123, 91, 242, 0.25);
  }

  .track.variable .track-lane {
    background-color: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.25);
  }

  .track.sequence .track-lane {
    background-color: rgba(255, 122, 24, 0.12);
    border-color: rgba(255, 122, 24, 0.25);
  }

  @media (max-width: 720px) {
    .track {
      grid-template-columns: 1fr;
    }

    .timeline-slider {
      grid-template-columns: 1fr;
    }

    .track-lane {
      height: 30px;
    }
  }
</style>
