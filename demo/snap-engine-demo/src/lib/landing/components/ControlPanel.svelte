<script lang="ts">
  type ToggleControl = {
    id: string;
    label: string;
    description?: string;
    defaultValue?: boolean;
  };

  type SliderControl = {
    id: string;
    label: string;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    defaultValue: number;
    description?: string;
    precision?: number;
  };

  const toggleControls: ToggleControl[] = [
    {
      id: 'physics',
      label: 'Physics engine',
      description: 'Enable mass, gravity, and collisions',
      defaultValue: true
    },
    {
      id: 'snapping',
      label: 'Node snapping',
      description: 'Auto-align nodes on drop',
      defaultValue: true
    },
    {
      id: 'debug',
      label: 'Debug overlays',
      description: 'Show bounds, anchors, and gizmos'
    },
    {
      id: 'analytics',
      label: 'Live analytics',
      description: 'Stream metrics to dashboard'
    },
    {
      id: 'autosave',
      label: 'Session autosave',
      description: 'Persist canvas layout every 30s',
      defaultValue: true
    }
  ];

  const sliderControls: SliderControl[] = [
    {
      id: 'simulationSpeed',
      label: 'Simulation speed',
      min: 0.25,
      max: 2,
      step: 0.05,
      unit: '×',
      precision: 2,
      defaultValue: 1,
      description: 'Scales global delta time'
    },
    {
      id: 'snapStrength',
      label: 'Snap strength',
      min: 0,
      max: 1,
      step: 0.01,
      precision: 2,
      defaultValue: 0.65,
      description: 'Blend factor for connector magnets'
    },
    {
      id: 'friction',
      label: 'Friction',
      min: 0,
      max: 1,
      step: 0.01,
      precision: 2,
      defaultValue: 0.2,
      description: 'Energy loss per tick'
    },
    {
      id: 'noise',
      label: 'Input jitter filter',
      min: 0,
      max: 10,
      step: 0.5,
      unit: 'px',
      defaultValue: 2,
      description: 'Ignore micro-movements'
    }
  ];

  function createToggleState() {
    const initial: Record<string, boolean> = {};
    for (const control of toggleControls) {
      initial[control.id] = control.defaultValue ?? false;
    }
    return initial;
  }

  function createSliderState() {
    const initial: Record<string, number> = {};
    for (const control of sliderControls) {
      initial[control.id] = control.defaultValue;
    }
    return initial;
  }

  let toggleState = $state(createToggleState());
  let sliderState = $state(createSliderState());

  function handleToggle(id: string, value: boolean) {
    toggleState = { ...toggleState, [id]: value };
  }

  function handleSlider(id: string, value: number) {
    sliderState = { ...sliderState, [id]: value };
  }

  const quickActions = ['Reset graph', 'Bake animation', 'Export layout'];
</script>

<div class="card control-panel">
  <header>
    <div>
      <p class="eyebrow">Placeholder controls</p>
      <h3>Engine Control Panel</h3>
    </div>
    <button class="ghost-button">Save preset</button>
  </header>

  <section class="panel-section">
    <h4>Systems</h4>
    <div class="toggle-list">
      {#each toggleControls as control}
        <label class="toggle-item">
          <input
            type="checkbox"
            checked={toggleState[control.id]}
            onchange={(event) => handleToggle(control.id, event.currentTarget.checked)}
          />
          <span>
            <strong>{control.label}</strong>
            {#if control.description}
              <small>{control.description}</small>
            {/if}
          </span>
        </label>
      {/each}
    </div>
  </section>

  <section class="panel-section">
    <h4>Fine tuning</h4>
    <div class="slider-list">
      {#each sliderControls as control}
        <div class="slider-item">
          <div class="label-row">
            <span>{control.label}</span>
            <span class="value">
              {sliderState[control.id].toFixed(control.precision ?? 1)}{control.unit ?? ''}
            </span>
          </div>
          <input
            type="range"
            min={control.min}
            max={control.max}
            step={control.step ?? 0.1}
            value={sliderState[control.id]}
            oninput={(event) => handleSlider(control.id, parseFloat(event.currentTarget.value))}
          />
          {#if control.description}
            <small>{control.description}</small>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <section class="panel-section actions">
    <h4>Quick actions</h4>
    <div class="action-grid">
      {#each quickActions as action}
        <button class="secondary-button">{action}</button>
      {/each}
    </div>
  </section>
</div>

<style lang="scss">
  .control-panel {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: calc(var(--ui-radius) - 2px);
    background: linear-gradient(145deg, rgba(18, 19, 33, 0.9), rgba(14, 16, 34, 0.8));
    color: var(--color-foreground, white);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    h3 {
      margin: 0;
      font-size: 1.25rem;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 0.25rem;
    }
  }

  .ghost-button,
  .secondary-button {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: inherit;
    padding: 0.35rem 0.9rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
  }

  .panel-section {
    background: rgba(255, 255, 255, 0.02);
    border-radius: calc(var(--ui-radius) - 4px);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.06);

    h4 {
      margin: 0;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      color: rgba(255, 255, 255, 0.65);
    }
  }

  .toggle-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toggle-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: var(--size-4);
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;

    input[type='checkbox'] {
      accent-color: var(--color-primary, #ffc95f);
      width: 1rem;
      height: 1rem;
      margin-top: 0.2rem;
    }

    strong {
      display: block;
      font-size: 0.85rem;
      margin-bottom: 0.2rem;
    }

    small {
      color: rgba(255, 255, 255, 0.55);
      font-size: 0.7rem;
    }
  }

  .slider-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .slider-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0.25rem;

    .label-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.8);

      .value {
        font-feature-settings: 'tnum';
        font-variant-numeric: tabular-nums;
      }
    }

    input[type='range'] {
      width: 100%;
      accent-color: var(--color-primary, #ffc95f);
    }

    small {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.7rem;
    }
  }

  .actions .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 0.5rem;
  }

  .secondary-button {
    width: 100%;
    text-align: center;
    border-style: dashed;
  }
</style>
