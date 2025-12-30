# Source Directory Guide

This document describes the structure and purpose of each module in the `src/` directory of SnapLine.

> **Note**: For high-level engine concepts (render pipeline, coordinate systems, API usage), see `doc/overview.md` in the project root.

## Directory Structure

```
src/
├── index.ts          # Public API exports
├── snapline.ts       # Engine class - main entry point
├── global.ts         # GlobalManager singleton - shared state & render loop
├── object.ts         # BaseObject & ElementObject - core entity classes
├── camera.ts         # Camera - coordinate systems & viewport management
├── input.ts          # Input handling - pointer, drag events
├── collision.ts      # Collision detection engine & collider shapes
├── animation.ts      # Web Animations API wrapper
├── debug.ts          # Debug overlay renderer
├── util.ts           # Utility functions (DOM helpers, transform parsing)
└── asset/            # Pre-built components
    ├── background.ts
    ├── cameraControl.ts
    ├── node_ui/      # Node-based UI components
    └── drag_and_drop/ # Drag-and-drop system
```

## Core Modules

### `index.ts`
Public API entry point. All exports that external consumers can import come from here. When adding new public APIs, export them from this file.

### `snapline.ts`
**Engine Class** - The main orchestrator for a single canvas/container.

Responsibilities:
- Manages a container DOM element and its camera
- Holds references to optional subsystems (collision, animation, debug)
- Processes render stages delegated by GlobalManager
- Provides `enableX()` methods for lazy-loading features

Key methods:
- `assignDom(container)` - Initialize with a DOM container
- `enableDebug()` - Enable debug overlay (dynamically imports debug.ts)
- `enableCameraControl()` - Enable pan/zoom controls
- `enableCollisionEngine()` - Enable collision detection
- `enableAnimationEngine()` - Enable animation processing

### `global.ts`
**GlobalManager Singleton** - Central coordinator for all engine instances.

Responsibilities:
- Maintains the 6-stage render queue (read1, write1, read2, write2, read3, write3)
- Runs the `requestAnimationFrame` loop
- Tracks all registered Engine instances
- Manages global object table and ID generation
- Provides input engine instances per-engine

The render loop processes stages in order across ALL engines before moving to the next stage. This prevents layout thrashing even when multiple engines exist.

### `object.ts`
**BaseObject & ElementObject** - Core entity classes.

**BaseObject**: Abstract base for all entities.
- Transform properties (position, scale)
- Parent-child hierarchy
- Event subscription (global and input events)
- Collider and animation management
- `queueUpdate(stage, callback)` for scheduling DOM operations
- Debug marker helpers

**ElementObject**: Extends BaseObject with DOM element support.
- Owns a `DomElement` wrapper for DOM manipulation
- DOM property caching per render stage (`_domProperty[0..2]`)
- `readDom()` / `writeDom()` / `writeTransform()` methods
- Convenience methods: `requestRead()`, `requestWrite()`, `requestTransform()`
- Style, classList, and dataAttribute management

**DomElement**: Internal class managing a single HTML element's state.

### `camera.ts`
**Camera Class** - Viewport and coordinate system management.

Maintains three coordinate spaces:
- **Screen**: Raw browser viewport pixels
- **Camera**: Relative to container element
- **World**: Logical scene coordinates (pan/zoom independent)

Key methods:
- `getCameraFromScreen()` / `getScreenFromCamera()`
- `getWorldFromCamera()` / `getCameraFromWorld()`
- `setCameraPosition()` / `setCameraCenterPosition()`
- `handleScroll()` - Zoom towards a point
- `handlePanStart/Drag/End()` - Pan gesture handling

### `input.ts`
**Input System** - Unified pointer event handling.

**GlobalInputControl**: Engine-wide input manager.
- Subscribes to container pointer events
- Normalizes mouse and touch into unified events
- Manages drag gesture detection
- Dispatches to subscribed objects

**InputControl**: Per-object input handler.
- Attaches to specific DOM elements
- Fires element-specific pointer events
- Supports drag gestures with configurable thresholds

Event types: `pointerDown`, `pointerMove`, `pointerUp`, `mouseWheel`, `dragStart`, `drag`, `dragEnd`, `pinchStart`, `pinch`, `pinchEnd`

### `collision.ts`
**Collision System** - Shape-based collision detection.

**CollisionEngine**: Manages collision detection each frame.
- Supports multiple collider shapes
- Tracks collision state for begin/end contact events

**Collider**: Base class for collision shapes.
- `RectCollider`: Axis-aligned bounding box
- `CircleCollider`: Circle shape
- `LineCollider`: Line segment
- `PointCollider`: Single point

Events: `onCollide` (continuous), `onBeginContact`, `onEndContact`

### `animation.ts`
**Animation System** - Web Animations API wrapper.

**AnimationObject**: Single animation instance.
- Wraps native `Element.animate()`
- Supports CSS properties and custom variables (`$varName`)
- Custom variables allow animating non-CSS values via `tick` callback
- Configurable easing per keyframe

**SequenceObject**: Sequential animation chain.
- Plays animations one after another
- `add()` to queue animations

### `debug.ts`
**Debug Renderer** - Visual debugging overlay.

Renders to a canvas positioned over the container:
- Object bounding boxes
- Collider shapes
- Coordinate grid
- Custom debug markers (points, rects, circles, text)

Dynamically imported by `engine.enableDebug()` to keep bundle size small when not used.

### `util.ts`
**Utility Functions**

## Asset Modules (`asset/`)

Pre-built components for common UI patterns.

### `asset/background.ts`
**Background** - Tiled background that follows camera.

Auto-updates position when camera moves. Useful for grid patterns in node editors.

### `asset/cameraControl.ts`
**CameraControl** - Interactive pan/zoom controls.

- Middle mouse button for panning
- Scroll wheel for zooming
- Automatically updates camera and repaints

### `asset/node_ui/`
Components for node-based editors (like visual programming tools).

- `node.ts` - **NodeComponent**: Draggable node with connectors
- `connector.ts` - **ConnectorComponent**: Input/output ports on nodes
- `line.ts` - **LineComponent**: Bezier curves connecting nodes
- `select.ts` - **RectSelectComponent**: Rectangle selection tool

### `asset/drag_and_drop/`
Components for sortable lists and drag-drop interfaces.

- `container.ts` - **ItemContainer**: Sortable container with spacer animation
- `item.ts` - **ItemObject**: Draggable item within containers
