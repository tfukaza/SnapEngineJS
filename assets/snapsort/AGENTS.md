# SnapSort - Drag and Drop System

A single `Container`/`Item` class pair (per framework) whose drag/drop behavior is picked with a `mode` config field (`"euclidean"` | `"progressive"` | `"insertion"`, default `"euclidean"`) instead of separate per-mode classes.

### @snap-engine/snapsort
**Location:** `core/src/`
**Language:** TypeScript
**Dependencies:** `@snap-engine/core`

**Exports:**
- `Container` - The only container class. `new Container(engine, parent, { mode, ... })`.
- `Item` - The only item class (including ghosts/markers). Never needs a mode.
- `DragSession` - Owns all per-drag state (pointer, ghost, drop target); lives at `container.dragSession` on the root while a drag is active.
- Event types: `ItemInsertEvent`, `ItemRemoveEvent`, `ItemMoveEvent`, `GhostCreateEvent`, `GhostInsertEvent`, `GhostRemoveEvent`, `DragStartEvent`, `DragEndEvent`, `DropTargetChangeEvent`, `CanDropEvent`, `DragLocation`.
- `ContainerCallbacks`, `ContainerConfig`, `SortMode`, `SortStrategy`, `DropTargetStrategy`, `DragLifecycleStrategy`.

### @snap-engine/snapsort-svelte
**Location:** `svelte/src/`
**Language:** Svelte 5
**Dependencies:** `@snap-engine/snapsort`, `@snap-engine/core`

**Exports:** `Container.svelte`, `Item.svelte`, `Handle.svelte`.

### @snap-engine/snapsort-react
**Location:** `react/src/`
**Language:** React (TSX)
**Dependencies:** `@snap-engine/snapsort`, `@snap-engine/core`, `react`, `react-dom` (peer)

**Exports:** `Engine`/`SnapSortEngine`, `Container`, `Item`, `Handle`, `useSnapSortEngine`, `useSnapSortAwaitMutation`, `ContainerObjectContext`, `ItemObjectContext`.

## File Structure

```
snapsort/
├── core/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── container.ts        # Container class + ContainerConfig
│       ├── item.ts             # Item class: tree membership, FLIP animation, dispatchers
│       ├── events.ts           # All callback event interfaces + ContainerCallbacks
│       ├── mutation.ts         # Mutator: single dispatch point for ContainerCallbacks + defaults
│       ├── algorithm.ts        # Drop-target candidate resolution (3 modes) + canDrop filtering
│       ├── layout.ts           # Pure flow-layout simulation used by algorithm.ts
│       ├── snapshot.ts         # ItemSnapshot / ItemSnapshotMetadata types
│       └── drag/
│           ├── session.ts            # DragSession: all per-drag state
│           ├── lifecycle.ts          # DragLifecycleStrategy interface
│           ├── drop-strategy.ts      # DropTargetStrategy interface + builtinStrategies map
│           ├── flow-ghost.ts         # Euclidean/progressive lifecycle (flow-layout spacer ghost)
│           └── insertion-marker.ts   # Insertion lifecycle (floating marker line)
├── svelte/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── Container.svelte
│       ├── Item.svelte
│       └── Handle.svelte
└── react/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── Engine.tsx
        ├── Container.tsx
        ├── Item.tsx
        ├── Handle.tsx
        └── useSnapSortAwaitMutation.ts
```

## Core Architecture

### Two independent axes
Sort mode is really two orthogonal choices, each resolved once per drag from the root container's config:
- **Drop-target resolution** (`DropTargetStrategy`, `drag/drop-strategy.ts`): which algorithm (`determineDropTarget` / `determineProgressiveDropTarget` / `determineInsertionDropTarget` in `algorithm.ts`) picks the winning candidate.
- **Drag/ghost lifecycle** (`DragLifecycleStrategy`, `drag/lifecycle.ts`): how the ghost is created/moved/removed and whether the dragged item itself is hoisted out of flow. Two implementations: `FlowGhostLifecycle` (full-size spacer, FLIP-animated; euclidean + progressive) and `InsertionMarkerLifecycle` (floating absolutely-positioned line; insertion).

`ContainerConfig.mode` picks a built-in pair from `builtinStrategies`; `ContainerConfig.strategy` overrides with a custom pair.

### DragSession
Created on `dragStart` and stored at `root.dragSession`; holds pointer/offset/start, the live ghost item, `pendingGhostTarget`, the resolved `SortStrategy`, and `status` (`pending → active → dropping → ended`). All per-drag state that used to live as `#private` fields on the dragged item now lives here so drag lifecycle strategies (separate classes) can read/write it without needing access to `Item`'s private fields. `items`/`sources` are arrays so multi-item drag can be added later without an API change — only length-1 is implemented today.

### Mutator (`mutation.ts`)
Every `ContainerCallbacks` invocation goes through one of the `fire*` functions here (`fireItemInsert`, `fireItemRemove`, `fireItemMove`, `fireGhostInsert`, `fireGhostRemove`, `fireCreateGhost`, `fireAwaitMutation`). `fireItemMove` fires `onItemMove` on the destination container if defined, else falls back to `fireItemInsert` (today's default DOM behavior is insert-only — a plain `insertBefore` inherently moves the node). Default DOM callback implementations (`defaultCallbacks`) also live here.

### Callbacks (`events.ts`)
- Primitives: `onItemInsert`, `onItemRemove`, `onGhostInsert`, `onGhostRemove`, `createGhost` (was `createItemGhost`; dispatches on `event.kind: "flow" | "marker"`), `awaitMutation`.
- Semantic: `onItemMove` (preferred — carries `from`/`to` `DragLocation`s).
- Lifecycle: `onDragStart` (return `false` to veto before any state changes), `onDragEnd`, `onDropTargetChange` (fires only when the prospective container/index actually changes).
- Validation: `canDrop` — consulted once per container per drop-target resolution (not per candidate slot); must be cheap.

## Key Concepts

### Grouping
Items can only move between containers sharing the same `groupID`.

### Mode is per-tree
Resolved from the root container's config at drag start; nested containers should share one mode. Mixed-mode trees are unsupported.

### Layout direction
- **Column:** Vertical stacking, top-to-bottom reordering.
- **Row:** Horizontal alignment, left-to-right reordering, wraps.

## Dependencies

```
@snap-engine/core
    ↓
@snap-engine/snapsort
    ↓
@snap-engine/snapsort-svelte   @snap-engine/snapsort-react
```
