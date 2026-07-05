# @snap-engine/snapsort

Core TypeScript logic for SnapEngine drag-and-drop interactions.

SnapSort includes Euclidean and Progressive Placement container/item
implementations.

## Install

```bash
npm install @snap-engine/snapsort @snap-engine/core
```

## Includes

- `ContainerBase`
- `ContainerEuclidean`
- `ContainerProgressive`
- `Container`
- `ItemBase`
- `ItemEuclidean`
- `ItemProgressive`
- `Item`

## Usage

```ts
import {
  Container,
  ContainerEuclidean,
  ContainerProgressive,
  ItemProgressive,
  ItemBase,
  ContainerBase,
  Item,
  ItemEuclidean,
} from "@snap-engine/snapsort";
```

## DOM ownership contract

SnapSort core is designed to work identically across Vanilla JS, Svelte, React,
and any future framework adapter. That only works if core and the framework
never fight over the same DOM nodes. The contract:

1. **The framework owns the DOM tree.** Core never inserts, removes, or
   reparents an element the framework rendered. All structural intent flows
   through `ContainerCallbacks` (`onItemInsert`, `onItemRemove`,
   `onGhostInsert`, `onGhostRemove`), which carry everything an adapter needs
   (`index`, `beforeElement`, `ghostRect`, metadata). The default callback
   implementations in `container.ts` are the "vanilla JS adapter" — legitimate
   defaults when no framework owns the DOM, not a parallel mutation path.
2. **Core writes only non-structural properties on the dragged element** —
   `transform`, `position`/`z-index` styles. Every framework tolerates that;
   none diffs inline styles it didn't set.
3. **Core never trusts an element across an await point.** Elements are
   resolved lazily from item identity (`#findItemByID`) and revalidated
   (`isConnected`) after every `awaitMutation`, since an async framework may
   destroy and recreate the DOM node between the callback firing and the next
   read.
4. **After `awaitMutation`, the framework's DOM is the truth.** Core verifies
   placement (a dev-mode `console.warn` if an adapter didn't place the element
   where `onItemInsert` specified) — it never silently repairs it. A silent
   fixup would mask an adapter bug instead of surfacing it.

A concrete consequence: **the dragged element stays in its original DOM
parent for the entire drag.** It never gets reparented into whichever
container is currently hovered — it's moved only by `transform`, computed
against a coordinate parent frozen at drag start. This is what lets the React
adapter stay thin (no DOM snapshot/restore bookkeeping): React's reconciler
never observes a node outside the parent it rendered it under.

### Accepted trade-offs

- **Clipping/stacking:** an `overflow: hidden` ancestor can clip the dragged
  element, and a FLIP-transformed ancestor becomes a stacking context, so the
  dragged item (`z-index: 1000`) can paint under a later sibling while that
  ancestor is mid-animation. Avoid `overflow: hidden` on draggable surfaces if
  this matters for your layout.
- **Original parent unmounted mid-drag:** if the framework unmounts the
  dragged item's parent while a drag is in flight, the dragged element goes
  with it (the framework owns that subtree). `dragEnd` still commits state via
  `onItemInsert`, so application state recovers even though the visual drag
  ends abruptly.
- **Inner scroll containers:** core does not track scroll offsets. Dragging
  within a container that itself scrolls mid-drag is unhandled today (this
  predates the ownership contract and is a separate, open limitation).
