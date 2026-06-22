# SnapSort - Drag and Drop System

### @snap-engine/snapsort
**Location:** `core/src/`
**Language:** TypeScript
**Dependencies:** `@snap-engine/core`

**Exports:**
- `ContainerBase` - Shared container behavior
- `ContainerEuclidean` - Container using SnapSort Euclidean
- `ContainerProgressive` - Container using Progressive Placement
- `Container` - Alias for `ContainerEuclidean`
- `ItemBase` - Shared base class for SnapSort item mechanics
- `ItemEuclidean` - Individual draggable item using SnapSort Euclidean
- `ItemProgressive` - Individual draggable item using Progressive Placement
- `Item` - Alias for `ItemEuclidean`

### @snap-engine/snapsort-svelte
**Location:** `svelte/src/`
**Language:** Svelte 5
**Dependencies:** `@snap-engine/snapsort`, `@snap-engine/core`

**Exports:**
- `ContainerEuclidean.svelte` - Container component for SnapSort Euclidean
- `ItemEuclidean.svelte` - Item component using SnapSort Euclidean
- `ContainerProgressive.svelte` - Container component for Progressive Placement
- `ItemProgressive.svelte` - Item component using Progressive Placement

## File Structure

```
snapsort/
├── core/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── container.ts        # ContainerBase, ContainerEuclidean, ContainerProgressive
│       └── item.ts             # ItemBase, ItemEuclidean, ItemProgressive
└── svelte/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── ContainerEuclidean.svelte
        ├── ItemEuclidean.svelte
        ├── ContainerProgressive.svelte
        └── ItemProgressive.svelte
```

## Core Classes

### ContainerBase
**Extends:** `ItemBase`
**Purpose:** Shared container mechanics and configuration

### ContainerEuclidean
**Extends:** `ContainerBase`
**Purpose:** Manages draggable items using SnapSort Euclidean

### ContainerProgressive
**Extends:** `ContainerBase`
**Purpose:** Manages draggable items using Progressive Placement

**Configuration:**
- `direction: "row" | "column"` - Layout direction
- `groupID: string` - Group identifier for cross-container drops
- `gap?: number` - Spacing between items

**Features:**
- Automatic positioning
- Smooth reordering animations
- Cross-container drops within group

### ItemBase
**Extends:** `ElementObject`
**Purpose:** Shared drag/drop mechanics and container movement helpers

### ItemEuclidean
**Extends:** `ItemBase`
**Purpose:** Individual draggable item using SnapSort Euclidean

**Features:**
- Drag and drop
- Cross-container movement
- Automatic position calculation
- Parent container tracking

## Svelte Components

### ContainerEuclidean.svelte
**Purpose:** Container for draggable Euclidean items

**Props:**
- `config: { direction, groupID, gap? }` - Container configuration

**Slots:**
- Default: Item components

### ItemEuclidean.svelte
**Purpose:** Individual draggable item using SnapSort Euclidean

**Props:** None

**Slots:**
- Default: Item content

### ContainerProgressive.svelte
**Purpose:** Container for draggable Progressive Placement items

**Props:**
- `config: { direction, groupID, gap? }` - Container configuration

**Slots:**
- Default: Item components

### ItemProgressive.svelte
**Purpose:** Individual draggable item using Progressive Placement

**Props:** None

**Slots:**
- Default: Item content

## Key Concepts

### Grouping
Items can only move between containers sharing the same `groupID`. This enables:
- Isolated drag zones
- Related container organization
- Cross-container reordering

### Layout Modes
- **Column:** Vertical stacking, top-to-bottom reordering
- **Row:** Horizontal alignment, left-to-right reordering

## Dependencies

```
@snap-engine/core
    ↓
@snap-engine/snapsort
    ↓
@snap-engine/snapsort-svelte
```
