# SnapLine - Node Graph UI System

## Purpose

Node-based graph UI system for creating visual programming interfaces, node editors, and flow-based applications.

## Packages

### @snap-engine/snapline
**Location:** `core/src/`
**Language:** TypeScript
**Dependencies:** `@snap-engine/core`

**Exports:**
- `NodeComponent` - Graph node with connectors
- `ConnectorComponent` - Input/output connector
- `LineComponent` - Visual connection line
- `RectSelectComponent` - Rectangle selection tool
- `GlobalManager` - Shared state manager

### @snap-engine/snapline-svelte
**Location:** `svelte/src/`
**Language:** Svelte 5
**Dependencies:** `@snap-engine/snapline`, `@snap-engine/core`

**Exports:**
- `Node.svelte` - Node component
- `Connector.svelte` - Connector component
- `Line.svelte` - Connection line component
- `Select.svelte` - Rectangle selection component

## File Structure

```
snapline/
├── core/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── node.ts          # NodeComponent
│       ├── connector.ts     # ConnectorComponent
│       ├── line.ts          # LineComponent
│       └── select.ts        # RectSelectComponent
└── svelte/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── Node.svelte
        ├── Connector.svelte
        ├── Line.svelte
        └── Select.svelte
```

## Core Classes

### NodeComponent
**Extends:** `ElementObject`
**Purpose:** Draggable graph node with input/output connectors

**Features:**
- Multiple connectors
- Property-based data flow
- Parent-child relationships
- Transform hierarchy

**Key Methods:**
- `addConnector(name, connector)` - Register connector
- `setProp(name, value)` - Set output property
- `getProp(name)` - Get property value
- `addSetPropCallback(callback, propName)` - React to property changes

### ConnectorComponent
**Extends:** `BaseObject`
**Purpose:** Connection point on a node

**Configuration:**
- `name: string` - Connector identifier
- `maxConnectors: number` - Connection limit (-1 = unlimited, 0 = output-only)
- `allowDragOut: boolean` - Can drag connections from this

**Features:**
- Input/output mode
- Connection limits
- Drag permissions
- Connection callbacks

### LineComponent
**Extends:** `ElementObject`
**Purpose:** Visual connection between connectors

**Features:**
- Curved Bézier path
- Automatic path updates
- Start/end world coordinates
- Callback-based rendering

### RectSelectComponent
**Extends:** `ElementObject`
**Purpose:** Rectangle selection tool

**Features:**
- Drag to select
- Visual feedback
- Intersection detection

## Svelte Components

### Node.svelte
**Purpose:** Node wrapper component

**Props:**
- `className?: string` - CSS class
- `LineSvelteComponent?: Component` - Custom line component
- `nodeObject?: NodeComponent` (bindable) - Node instance

**Slots:**
- Default: Node content and connectors

### Connector.svelte
**Purpose:** Connector wrapper component

**Props:**
- `name: string` - Connector identifier
- `maxConnectors: number` - Connection limit
- `allowDragOut: boolean` - Allow drag out

**Methods:**
- `object(): ConnectorComponent` - Get underlying connector

### Line.svelte
**Purpose:** Renders connection path

**Props:**
- `line: LineComponent` - Line instance

**Features:**
- SVG path rendering
- Auto-updates on movement
- Customizable styling

### Select.svelte
**Purpose:** Rectangle selection wrapper

**Props:** None

## Key Concepts

### Property System
- Nodes have named properties
- Connectors map to properties by name
- Connected connectors share data through properties
- Use `setProp()` to send, `addSetPropCallback()` to receive

### Connector Types
- **Input:** `maxConnectors > 0`, `allowDragOut = false`
- **Output:** `maxConnectors = 0 or -1`, `allowDragOut = true`
- **Bidirectional:** Custom combinations

### Connection Rules
- `-1`: Unlimited connections
- `0`: No incoming (output only)
- `N`: Maximum N incoming connections

## Dependencies

```
@snap-engine/core
    ↓
@snap-engine/snapline
    ↓
@snap-engine/snapline-svelte
```

## Notes

- Connectors must be children of Node components
- Line component injected via `LineSvelteComponent` prop
- Data flows through property system
- All input handling automatic via SnapEngine
