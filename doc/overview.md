# SnapLine Engine

SnapLine is a high-performance interactivity engine designed for building complex interactive UIs on web applications. It provides a structured way to manage DOM updates, animations, collisions, and user input while minimizing performance bottlenecks like layout thrashing.

## Core Concepts


### Global Manager & Engine Instances

- **GlobalManager**: A singleton that orchestrates the render loop, manages global input, and holds the shared render queues. It ensures that even if you have multiple `Engine` instances on a page, their DOM operations are synchronized to the same animation frame.
- **Engine**: The main entry point for a specific canvas or container. It manages its own camera, objects, and features (collision, debug, etc.), but delegates the actual scheduling of updates to the GlobalManager.

### Object System

All entities in SnapLine inherit from `BaseObject`. Objects are hierarchical (parent/child) and have built-in support for:
- **Transforms**: Position, scale, and coordinate conversion (World <-> Camera <-> Screen).
- **Events**: Unified pointer events (drag, pinch, wheel).
- **Queued Updates**: Built-in methods to schedule DOM operations.

### Coordinate Systems & Camera

SnapLine uses a camera abstraction that maintains three coordinate systems. This is essential for building zoomable/pannable interfaces.

#### Coordinate Spaces

1. **Screen Coordinates** (aka Viewport)
   - Raw pixel coordinates on the browser window, not the document.
   - `(0, 0)` is the top-left of the viewport.
   - This is what `getBoundingClientRect()` returns.

2. **Camera Coordinates**
   - Coordinates relative to the camera's viewport (the container element).
   - `(0, 0)` is the top-left of the container.
   - Accounts for the container's offset on the page.

3. **World Coordinates**
   - The "true" position of objects in your scene.
   - Independent of camera pan and zoom.
   - An object at world `(100, 100)` stays at `(100, 100)` regardless of the camera oritentation, container position, or how much the document has been scrolled.

#### Coordinate Conversion

`BaseObject` provides automatic coordinate conversion:

```typescript
// Get world position (consistent regardless of camera)
const [worldX, worldY] = object.worldPosition;

// Get camera-relative position
const [camX, camY] = object.cameraPosition;

// Get screen position (raw viewport coordinates)
const [screenX, screenY] = object.screenPosition;

// Set position using any coordinate system
object.worldPosition = [100, 200];
object.cameraPosition = [50, 100];  // Automatically converts to world
object.screenPosition = [300, 400]; // Automatically converts to world
```

#### Camera API

The camera is accessible via `engine.camera`:

```typescript
// Pan the camera
engine.camera.setCameraPosition(x, y);       // Move camera to world position
engine.camera.setCameraCenterPosition(x, y); // Center camera on world position

// Zoom
engine.camera.handleScroll(deltaZoom, mouseX, mouseY); // Zoom towards a point

// Get current state
const zoom = engine.camera.zoom;
const { x, y } = engine.camera.getCameraCenterPosition();

// Apply camera transform to a canvas element
canvasElement.style.transform = engine.camera.canvasStyle;
```

Setting the camera position does not update the DOM. To reflect the new camera position to the rendered screen, `canvasStyle` must be applied to the style of the camera container, ideally using a write queue. 

### Render Pipeline & Queue System

The heart of SnapLine is its multi-stage render pipeline. Unlike standard DOM manipulation where reads and writes can happen interleaved (causing repeated reflows), SnapLine enforces a strict separation of read and write operations.

The pipeline consists of 6 stages per frame:

1. **READ_1**: Initial read phase. Ideal for reading current DOM state before any changes.
2. **WRITE_1**: First write phase. Apply initial changes based on READ_1.
3. **READ_2**: Second read phase. Read the result of WRITE_1 if necessary.
4. **WRITE_2**: Second write phase. Apply secondary changes.
   - **Animation Updates**: Animation API updates are processed after WRITE_2.
5. **READ_3**: Final read phase.
6. **WRITE_3**: Final write phase.
   - **Post-Render**: Collision detection and debug rendering happen after WRITE_3.

This system is similar to libraries like `fastdom`, but extended to 3 pairs of read/write cycles to accommodate complex dependency chains often found in node-based editors or physics simulations.

**Why this matters:**
Browsers are lazy. When you write to the DOM, the browser waits to calculate the layout until you try to read from it. If you interleave reads and writes (`read -> write -> read -> write`), you force the browser to recalculate layout multiple times per frame ("Layout Thrashing"). By batching all reads together and all writes together, we ensure layout is calculated only when necessary.

## API Usage

### Queuing DOM Updates

The primary way to interact with the DOM in SnapLine is through the `queueUpdate` method available on any `BaseObject` (or its subclasses like `ElementObject`).

**Signature:**
```typescript
object.queueUpdate(stage, callback, queueID?)
```

- **stage**: One of `"READ_1"`, `"WRITE_1"`, `"READ_2"`, `"WRITE_2"`, `"READ_3"`, `"WRITE_3"`.
- **callback**: The function to execute.
- **queueID**: (Optional) A unique ID. If you queue multiple updates with the same ID in the same frame, only the last one will execute.

**Example:**

```typescript
// BAD: Interleaved read/write causing layout thrashing
const width = element.offsetWidth; // Read
element.style.width = (width + 10) + 'px'; // Write
const newWidth = element.offsetWidth; // Read (Forces Layout)
element.style.height = (newWidth * 2) + 'px'; // Write

// GOOD: Using SnapLine's queue system
object.queueUpdate("READ_1", () => {
    // Read current state
    const width = object.element.offsetWidth;
    
    // Schedule the write based on the read
    object.queueUpdate("WRITE_1", () => {
        object.element.style.width = (width + 10) + 'px';
        
        // Schedule next read if needed
        object.queueUpdate("READ_2", () => {
            const newWidth = object.element.offsetWidth;
            
            object.queueUpdate("WRITE_2", () => {
                object.element.style.height = (newWidth * 2) + 'px';
            });
        });
    });
});
```

### Best Practices

1. **Always use `queueUpdate` for DOM access**: Never read or write to the DOM directly inside your main logic loops or event handlers. Always schedule it.
2. **Group operations by stage**:
   - Use `READ_1` for gathering initial state (e.g., mouse position, current element size).
   - Use `WRITE_1` for the main visual updates (e.g., moving an element).
   - Use `READ_2` / `WRITE_2` only if your update depends on the result of `WRITE_1` (e.g. checking if an element wrapped after resizing, using FLIP technique for animations, etc.).
   - `READ_3` / `WRITE_3` should not be used unless absolutely neccesary.
3. **Use `queueID` for frequent events**: If you are queuing updates from a high-frequency event like `mousemove`, provide a `queueID` so that pending updates are debounced/overwritten, ensuring only the latest update runs per frame.
4. **Cache DOM properties**: Minimize direct DOM reads by using cached values from `getDomProperty()`. Call `readDom()` during a READ stage, then access the cached properties throughout your logic without triggering additional reflows.

```typescript
// Inside a mousemove handler
object.queueUpdate("WRITE_1", () => {
    this.updatePosition();
}, "update_pos_id"); // "update_pos_id" ensures we don't stack 100s of updates per frame
```

### DOM Property Caching

SnapLine caches DOM properties to minimize expensive `getBoundingClientRect()` calls.

**How it works:**
- When you call `readDom()` inside a READ queue, the element's position and dimensions are read from the DOM and stored in an internal cache.
- The cache is keyed by render stage (`READ_1`, `READ_2`, `READ_3`), allowing you to track how properties change across stages (useful for FLIP animations).
- `getDomProperty(stage)` returns the cached values from the specified stage without triggering a DOM read.

**Example:**

```typescript
// ElementObject has built-in caching
object.queueUpdate("READ_1", () => {
    object.readDom(); // Reads DOM and caches to READ_1 slot
});

object.queueUpdate("WRITE_1", () => {
    // Apply some changes
    object.element.classList.add('expanded');
});

object.queueUpdate("READ_2", () => {
    object.readDom(); // Reads DOM and caches to READ_2 slot
    
    // Compare before/after (FLIP technique)
    const before = object.getDomProperty("READ_1");
    const after = object.getDomProperty("READ_2");
    
    const deltaX = before.x - after.x;
    const deltaY = before.y - after.y;
    
    // Use delta for animation inversion
});
```

**Cached Properties:**
- `x`, `y`: World coordinates
- `screenX`, `screenY`: Screen/viewport coordinates
- `width`, `height`: Dimensions in world space
- `scaleX`, `scaleY`: Scale factors

### ElementObject Convenience Methods

`ElementObject` (the base class for DOM-backed objects) provides higher-level methods that combine queuing with common read/write operations.

#### Reading: `readDom()` and `requestRead()`

**`readDom(accountTransform?, stage?)`**
Immediately reads DOM properties and caches them. Should only be called inside a READ queue callback.

```typescript
object.queueUpdate("READ_1", () => {
    object.readDom();  // Reads and caches position/dimensions
});
```

**`requestRead(accountTransform?, saveTransform?, stage?)`**
Convenience method that queues `readDom()` to run in the specified stage. Returns a `queueEntry`.

```typescript
// These are roughly equivalent:
object.requestRead(false, true, "READ_1");

object.queueUpdate("READ_1", () => {
    object.readDom(false);
    object.saveDomPropertyToTransform("READ_1");
});
```

Parameters:
- `accountTransform`: If `true`, subtracts any CSS transform from the read values (useful for getting the "natural" position).
- `saveTransform`: If `true`, automatically copies the cached position to `object.transform`.
- `stage`: Which READ stage to queue in (`"READ_1"`, `"READ_2"`, `"READ_3"`).

#### Writing: `writeDom()`, `writeTransform()`, and `requestWrite()`

**`writeDom()`**
Writes all pending style, class, and data attribute changes to the DOM element. Should only be called inside a WRITE queue callback.

```typescript
object.style = { backgroundColor: 'red', padding: '10px' };
object.classList = ['active', 'highlighted'];

object.queueUpdate("WRITE_1", () => {
    object.writeDom();  // Applies all pending changes
});
```

**`writeTransform()`**
Writes only the CSS `transform` property. This is more performant than `writeDom()` because transforms don't trigger layout recalculation.

```typescript
object.worldPosition = [100, 200];

object.queueUpdate("WRITE_1", () => {
    object.writeTransform();  // Only updates transform, no layout thrashing
});
```

**`requestWrite(mutate?, writeCallback?, stage?)`**
Convenience method that queues `writeDom()` to run in the specified stage.

```typescript
// Queue a write with custom callback
object.requestWrite(true, () => {
    console.log('Write complete!');
}, "WRITE_1");
```

**`requestTransform(stage?)`**
Convenience method that queues `writeTransform()` to run in the specified stage.

```typescript
object.worldPosition = [100, 200];
object.requestTransform("WRITE_1");  // Queues transform update
```

### Helper Utilities

SnapLine provides several helper functions to make working with the DOM and coordinate systems easier.

#### `getDomProperty(engine, element)`

Retrieves the position and dimensions of a DOM element in multiple coordinate spaces (World, Camera, Screen). This is essential because `getBoundingClientRect` only gives you screen coordinates, which change when the camera pans or zooms.

```typescript
import { getDomProperty } from 'snapline';

// Inside a READ queue
const props = getDomProperty(engine, myElement);

console.log(props.x, props.y);           // World coordinates (consistent regardless of camera)
console.log(props.screenX, props.screenY); // Screen coordinates (relative to viewport)
console.log(props.width, props.height);    // World dimensions
```

#### `setDomStyle(element, style)`

A helper to apply styles to an element.

```typescript
import { setDomStyle } from 'snapline';

// Inside a WRITE queue
setDomStyle(element, {
    width: '100px',
    backgroundColor: 'red'
});
```
