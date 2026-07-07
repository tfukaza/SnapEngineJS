# @snap-engine/snapsort-react

React components for SnapEngine drag-and-drop interactions.

`Container` and `Item` are the only components — every container picks its
drag behavior with a `mode` config field (`"euclidean"` default,
`"progressive"`, or `"insertion"`). `Item` never needs a mode.

## Install

```bash
npm install @snap-engine/snapsort-react @snap-engine/snapsort
```

## Includes

- `Container`
- `Item`
- `Engine` / `SnapSortEngine`
- `Handle`
- `useSnapSortAwaitMutation`

## React Mutation Callbacks

When SnapSort callbacks update React-owned item arrays or ghost state, pass
`useSnapSortAwaitMutation()` as `callbacks.awaitMutation`.

SnapSort mutation callbacks must enqueue normal synchronous React updates with
`setState` or `dispatch`. Do not wrap SnapSort mutations in `startTransition`,
timers, animation frames, or async promise chains. The React adapter keeps the
`flushSync` boundary inside the adapter layer so React commits DOM updates
before SnapEngine continues from write stages into layout reads.
