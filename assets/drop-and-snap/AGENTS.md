# DropAndSnap - Drag and Drop System

## Purpose

Drag-and-drop list reordering system with support for multiple containers and flexible layouts.

## Packages

### @snap-engine/drop-and-snap
**Location:** `core/src/`
**Language:** TypeScript
**Dependencies:** `@snap-engine/core`

**Exports:**
- `ItemContainer` - Container for draggable items
- `ItemObject` - Individual draggable item

### @snap-engine/drop-and-snap-svelte
**Location:** `svelte/src/`
**Language:** Svelte 5
**Dependencies:** `@snap-engine/drop-and-snap`, `@snap-engine/core`

**Exports:**
- `ItemContainer.svelte` - Container component
- `Item.svelte` - Item component

## File Structure

```
drop-and-snap/
├── core/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── container.ts        # ItemContainer class
│       └── item.ts             # ItemObject class
└── svelte/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── ItemContainer.svelte
        └── Item.svelte
```

## Core Classes

### ItemContainer
**Extends:** `BaseObject`
**Purpose:** Manages collection of draggable items with automatic positioning

**Configuration:**
- `direction: "row" | "column"` - Layout direction
- `groupID: string` - Group identifier for cross-container drops
- `gap?: number` - Spacing between items

**Features:**
- Automatic positioning
- Smooth reordering animations
- Cross-container drops within group

### ItemObject
**Extends:** `ElementObject`
**Purpose:** Individual draggable item

**Features:**
- Drag and drop
- Cross-container movement
- Automatic position calculation
- Parent container tracking

## Svelte Components

### ItemContainer.svelte
**Purpose:** Container for draggable items

**Props:**
- `config: { direction, groupID, gap? }` - Container configuration

**Slots:**
- Default: Item components

### Item.svelte
**Purpose:** Individual draggable item

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
@snap-engine/drop-and-snap
    ↓
@snap-engine/drop-and-snap-svelte
```
