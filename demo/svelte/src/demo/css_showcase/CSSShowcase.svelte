<script lang="ts">
  let checkboxChecked = $state(false);
  let radioValue = $state("option1");
  let rangeValue = $state(50);
  let textValue = $state("");
  let numberValue = $state(42);
  let selectValue = $state("option1");
  let dateValue = $state("");
  let progressValue = $state(65);
</script>


    <section class="showcase-section">
      <h1>CSS Showcase</h1>
    </section>

    <!-- Typography Section -->
    <section class="showcase-section">
      <h2>Typography</h2>
      <div>
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <h4>Heading 4</h4>
        <h5>Heading 5</h5>
        <h6>Heading 6</h6>
        <p>
          This is a paragraph. 
        </p>
        <a href="#typography">This is a link element</a>
      </div>
    </section>

    <!-- Colors Section -->
    <section class="showcase-section">
      <h2>Color Palette</h2>
      <div class="color-grid">
        <div class="color-swatch primary card ground">
          <span class="light">Primary</span>
          <code>#ff753a</code>
        </div>
        <div class="color-swatch secondary card">
          <span class="light">Secondary</span>
          <code>#1e2659</code>
        </div>
        <div class="color-swatch secondary-1 card">
          <span class="light">Secondary 1</span>
          <code>#f34336</code>
        </div>
        <div class="color-swatch secondary-2 card">
          <span class="light">Secondary 2</span>
          <code>#e8b72f</code>
        </div>
        <div class="color-swatch secondary-3 card">
          <span class="light">Secondary 3</span>
          <code>#84c122</code>
        </div>
        <div class="color-swatch secondary-4 card">
          <span class="light">Secondary 4</span>
          <code>#1982c4</code>
        </div>
        <div class="color-swatch secondary-5 card">
          <span class="light">Secondary 5</span>
          <code>#6a4c93</code>
        </div>
        <div class="color-swatch secondary-6 card">
          <span class="light">Secondary 6</span>
          <code>#f15bb5</code>
        </div>
        <div class="color-swatch secondary-7 card">
          <span class="light">Secondary 7</span>
          <code>#00bbf9</code>
        </div>
        <div class="color-swatch accent card  ">
          <span class="light">Accent</span>
          <code>#4b403a</code>
        </div>
        <div class="color-swatch background card">
          <span>Background</span>
          <code>#f6f5f4</code>
        </div>
        <div class="color-swatch background-tint card">
          <span>Background Tint</span>
          <code>#e7e3e2</code>
        </div>
        <div class="color-swatch text card">
          <span class="light">Text</span>
          <code>#453e3a</code>
        </div>
      </div>
    </section>

    <!-- Cards & Slots Section -->
    <section class="showcase-section">
      <h2>Cards & Slots</h2>
      <div class="card-slot-grid">
        <div class="card">
          <h3>Default Card</h3>
          <p>A standard card with subtle shadow and border effects.</p>
        </div>
        <div class="card float">
          <h3>Float Card</h3>
          <p>A floating card variant with enhanced shadow for elevation.</p>
        </div>
           <div class="card ground">
          <h3>Ground Card</h3>
          <p>A ground card variant with subtle shadows to make it look as if 
            it is a bump on the ground.
          </p>
        </div>
        <div class="slot">
          <div class="slot-content">
            <p>Slot Container</p>
            <span>Inset container for drop zones and recessed UI areas</span>
          </div>
        </div>
       
      </div>
    </section>

    <!-- Buttons Section -->
    <section class="showcase-section">
      <h2>Buttons</h2>
      <div class="">
        <div class="button-row">
          <button>Default Button</button>
          <button class="primary">Primary Button</button>
          <button class="small">Small Button</button>
          <button class="active">Active State</button>
          <button class="primary" disabled>Disabled</button>
        </div>
        <div class="button-row" style="margin-top: var(--size-16);">
          <span class="button">Button Class on Span</span>
          <a href="#buttons" class="button primary">Link as Button</a>
        </div>
      </div>
    </section>

    <!-- Form Elements Section -->
    <section class="showcase-section three-column">
      <h2 style="grid-column: span 3;">Form Elements</h2>
      
   
       

        <!-- Checkboxes -->
        <div class="card">
          <h3>Checkboxes</h3>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={checkboxChecked} />
              <span></span>
              Unchecked by default
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" checked />
              <span></span>
              Checked by default
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" />
              <span></span>
              Another option
            </label>
          </div>
        </div>

        <!-- Radio Buttons -->
        <div class="card">
          <h3>Radio Buttons</h3>
          <div class="form-group">
            <label class="radio-label">
              <input type="radio" name="demo-radio" value="option1" bind:group={radioValue} />
              <span></span>
              Option One
            </label>
          </div>
          <div class="form-group">
            <label class="radio-label">
              <input type="radio" name="demo-radio" value="option2" bind:group={radioValue} />
              <span></span>
              Option Two
            </label>
          </div>
          <div class="form-group">
            <label class="radio-label">
              <input type="radio" name="demo-radio" value="option3" bind:group={radioValue} />
              <span></span>
              Option Three
            </label>
          </div>
        </div>

        <!-- Range Sliders -->
        <div class="card">
          <h3>Range Sliders</h3>
          <div class="form-group">
            <label>Default Range</label>
            <input type="range" min="0" max="100" bind:value={rangeValue} />
            <span class="range-value">{rangeValue}</span>
          </div>
          <div class="form-group">
            <label>Large Range</label>
            <input type="range" class="large" min="0" max="100" value="75" />
          </div>
        </div>

        <!-- Dropdowns/Selects -->
        <div class="card">
          <h3>Dropdowns</h3>
          <div class="form-group">
            <label for="select-default">Default Select</label>
            <select id="select-default" bind:value={selectValue}>
              <option value="option1">Option One</option>
              <option value="option2">Option Two</option>
              <option value="option3">Option Three</option>
              <option value="option4">Option Four</option>
            </select>
          </div>
          <div class="form-group">
            <label for="select-grouped">Grouped Options</label>
            <select id="select-grouped">
              <optgroup label="Category A">
                <option value="a1">Item A1</option>
                <option value="a2">Item A2</option>
              </optgroup>
              <optgroup label="Category B">
                <option value="b1">Item B1</option>
                <option value="b2">Item B2</option>
              </optgroup>
            </select>
          </div>
          <div class="form-group">
            <label for="select-disabled">Disabled Select</label>
            <select id="select-disabled" disabled>
              <option>Cannot change this</option>
            </select>
          </div>
        </div>

        <!-- Date Selectors -->
        <div class="card">
          <h3>Date Selectors</h3>
          <div class="form-group">
            <label for="date-input">Date Input</label>
            <input type="date" id="date-input" bind:value={dateValue} />
          </div>
          <div class="form-group">
            <label for="datetime-input">DateTime Input</label>
            <input type="datetime-local" id="datetime-input" />
          </div>
          <div class="form-group">
            <label for="time-input">Time Input</label>
            <input type="time" id="time-input" />
          </div>
        </div>

        <!-- Progress Bars -->
        <div class="card">
          <h3>Progress Bars</h3>
          <div class="form-group">
            <label>Default Progress ({progressValue}%)</label>
            <progress value={progressValue} max="100"></progress>
          </div>
          <div class="form-group">
            <label>Complete (100%)</label>
            <progress value="100" max="100"></progress>
          </div>
          <div class="form-group">
            <label>Indeterminate</label>
            <progress></progress>
          </div>
          <div class="form-group">
            <label>Adjust Progress</label>
            <input type="range" min="0" max="100" bind:value={progressValue} />
          </div>
        </div>

         <!-- Text Inputs -->
        <div class="card">
          <h3>Text Inputs</h3>
          <div class="form-group">
            <label for="text-input">Text Input</label>
            <input type="text" id="text-input" bind:value={textValue} placeholder="Enter text..." />
          </div>
          <div class="form-group">
            <label for="number-input">Number Input</label>
            <input type="number" id="number-input" bind:value={numberValue} />
          </div>
          <div class="form-group">
            <label for="disabled-input">Disabled Text Input</label>
            <input type="text" id="disabled-input" value="Cannot edit this" disabled />
          </div>
          <div class="form-group">
            <label for="disabled-number">Disabled Number Input</label>
            <input type="number" id="disabled-number" value="100" disabled />
          </div>
        </div>

    </section>

    <!-- Tables Section -->
    <section class="showcase-section">
      <h2>Tables</h2>
      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Component A</td>
              <td>Primary</td>
              <td><span class="badge success">Active</span></td>
              <td>128</td>
            </tr>
            <tr>
              <td>Component B</td>
              <td>Secondary</td>
              <td><span class="badge warning">Pending</span></td>
              <td>64</td>
            </tr>
            <tr>
              <td>Component C</td>
              <td>Accent</td>
              <td><span class="badge error">Inactive</span></td>
              <td>256</td>
            </tr>
            <tr>
              <td>Component D</td>
              <td>Primary</td>
              <td><span class="badge">Default</span></td>
              <td>512</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="card" style="margin-top: var(--size-24);">
        <h3>Striped Table</h3>
        <table class="striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>001</td>
              <td>First item in the list</td>
              <td>2025-01-15</td>
            </tr>
            <tr>
              <td>002</td>
              <td>Second item in the list</td>
              <td>2025-02-20</td>
            </tr>
            <tr>
              <td>003</td>
              <td>Third item in the list</td>
              <td>2025-03-10</td>
            </tr>
            <tr>
              <td>004</td>
              <td>Fourth item in the list</td>
              <td>2025-04-05</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Spacing Scale Section -->
    <section class="showcase-section">
      <h2>Spacing Scale</h2>
      <div class="card">
        <div class="spacing-demo">
          {#each [2, 4, 8, 12, 16, 24, 32, 48, 64] as size}
            <div class="spacing-item">
              <div class="spacing-box" style="width: {size}px; height: {size}px;"></div>
              <code>--size-{size}</code>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- CSS Variables Reference -->
    <section class="showcase-section">
      <h2>CSS Variables Reference</h2>
      <div class="card">
        <h3>Colors</h3>
        <code class="code-block">
--color-primary: #ff753a;
--color-secondary: #1e2659;
--color-accent: #4b403a;
--color-background: #f6f5f4;
--color-background-tint: #e7e3e2;
--color-background-dark: #8b817d;
--color-text: #453e3a;
        </code>
        
        <h3 style="margin-top: var(--size-16);">Sizing</h3>
        <code class="code-block">
--size-256, --size-128, --size-96, --size-80
--size-64, --size-48, --size-32, --size-24
--size-16, --size-12, --size-8, --size-4, --size-2
--ui-radius: var(--size-8);
        </code>
      </div>
    </section>


<style lang="scss">
  @use "../../../../app.scss";

  .css-showcase {
    width: 100%;
    height: 100%;
    position: relative;
  }

 

  .showcase-section {

    margin-bottom: var(--size-48);

    > h2 {
      margin-bottom: var(--size-16);
      padding-bottom: var(--size-8);
      border-bottom: 2px solid var(--color-primary);
    }
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--size-24);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--size-24);

    .card {
      h3 {
        margin-bottom: var(--size-16);
      }
    }
  }

  .form-group {
    margin-bottom: var(--size-12);
    display: flex;
    flex-direction: column;
    gap: var(--size-4);

    input[type="text"],
    input[type="number"] {
      height: var(--size-32);
    }
  }

  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-16);
    align-items: center;
  }

  .color-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--size-16);
  }

  .color-swatch {
    padding: var(--size-24) var(--size-16);
    border-radius: var(--ui-radius);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--size-8);

    span {
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      font-weight: 600;
    }

    code {
      font-size: 11px;
      opacity: 0.8;
    }

    &.primary {
      --card-color: var(--color-primary);
      color: white;
    }
    &.secondary {
      background-color: var(--color-secondary);
      color: white;
    }
    &.secondary-1 {
      background-color: var(--color-secondary-1);
      color: white;
    }
    &.secondary-2 {
      background-color: var(--color-secondary-2);
      color: white;
    }
    &.secondary-3 {
      background-color: var(--color-secondary-3);
      color: white;
    }
    &.secondary-4 {
      background-color: var(--color-secondary-4);
      color: white;
    }
    &.secondary-5 {
      background-color: var(--color-secondary-5);
      color: white;
    }
    &.secondary-6 {
      background-color: var(--color-secondary-6);
      color: white;
    }
    &.secondary-7 {
      background-color: var(--color-secondary-7);
      color: white;
    }
    &.accent {
      background-color: var(--color-accent);
      color: white;
    }
    &.background {
      background-color: var(--color-background);
      color: var(--color-text);
    }
    &.background-tint {
      background-color: var(--color-background-tint);
      color: var(--color-text);
    }
    &.text {
      background-color: var(--color-text);
      color: white;
    }
  }

  .card-slot-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--size-24);
    align-items: stretch;
  }

  @media (max-width: 800px) {
    .card-slot-grid {
      grid-template-columns: 1fr;
    }
  }

  .card-slot-grid .slot {
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-slot-grid .slot-content {
    text-align: center;
    padding: var(--size-16);

    span {
      font-size: 12px;
      color: var(--color-background-dark);
    }
  }

  .spacing-demo {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-24);
    align-items: flex-end;
  }

  .spacing-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-8);
  }

  .spacing-box {
    background-color: var(--color-primary);
    border-radius: var(--size-2);
  }

  .grid-cell {
    background-color: var(--color-primary);
    color: white;
    padding: var(--size-8);
    text-align: center;
    border-radius: var(--size-4);
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
  }

  .code-block {
    display: block;
    background-color: var(--color-background-tint);
    padding: var(--size-12);
    border-radius: var(--size-4);
    font-size: 12px;
    white-space: pre;
    overflow-x: auto;
  }

  .range-value {
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
    color: var(--color-background-dark);
  }

  .checkbox-label,
  .radio-label {
    cursor: pointer;
  }
</style>
