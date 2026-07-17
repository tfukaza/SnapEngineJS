# @snap-engine/snapsort-react

React components for SnapEngine drag-and-drop interactions.

`Container` and `Item` are the only components — every container picks its
drag behavior with a `mode` config field (`"euclidean"` default,
`"progressive"`, `"insertion"`, or `"swap"`). `Item` never needs a mode.

## Install

```bash
npm install @snap-engine/snapsort-react @snap-engine/snapsort
```

## Includes

- `Container`
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
