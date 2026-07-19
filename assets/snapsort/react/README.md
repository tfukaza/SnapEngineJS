# @snap-engine/snapsort-react

React components for SnapEngine drag-and-drop interactions.

Every container picks its
drag behavior with a `mode` config field (`"euclidean"` default,
`"progressive"`, `"insertion"`, or `"swap"`). `Item` never needs a mode.

## Install

```bash
npm install @snap-engine/core @snap-engine/asset-base-react @snap-engine/snapsort @snap-engine/snapsort-react react react-dom
```

## Includes

- `Container`
- `Ghost`
- `Item`
- `Engine` / `SnapSortEngine`
- `Handle`
- `useSnapSortAwaitMutation` (deprecated compatibility helper)

## React Mutation Callbacks

SnapSort mutation callbacks must enqueue normal synchronous React updates with
`setState` or `dispatch`. Do not wrap SnapSort mutations in `startTransition`,
timers, animation frames, or async promise chains. The adapter automatically
runs the mutation callback inside `flushSync`, so React commits the DOM before
SnapEngine reads final geometry and writes FLIP's inverse transform.

`callbacks.awaitMutation` and `useSnapSortAwaitMutation()` are deprecated.
Promise-returning mutation waits cannot guarantee a pre-paint FLIP inversion.

Use a stable `itemId` for every rendered item and update application arrays in
`onItemMove`; SnapSort does not own React state. `Ghost` renders a flow-mode
placeholder from a `GhostInsertEvent` and must be removed from state when the
matching `onGhostRemove` fires. All components forward standard HTML `div`
attributes, and consumer `style` values override structural defaults.
