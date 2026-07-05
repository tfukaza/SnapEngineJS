# @snap-engine/snapsort-react

React components for SnapEngine drag-and-drop interactions.

`Container` and `Item` are aliases for the Euclidean components. The explicit
component pairs are available as Euclidean, Progressive, and Insertion variants.

## Install

```bash
npm install @snap-engine/snapsort-react @snap-engine/snapsort
```

## Includes

- `ContainerEuclidean`
- `ItemEuclidean`
- `ContainerProgressive`
- `ItemProgressive`
- `ContainerInsertion`
- `ItemInsertion`
- `Handle`
- `useSnapSortAwaitMutation`
- `Container`
- `Item`

## React Mutation Callbacks

When SnapSort callbacks update React-owned item arrays or ghost state, pass
`useSnapSortAwaitMutation()` as `callbacks.awaitMutation`.

SnapSort mutation callbacks must enqueue normal synchronous React updates with
`setState` or `dispatch`. Do not wrap SnapSort mutations in `startTransition`,
timers, animation frames, or async promise chains. The React adapter keeps the
`flushSync` boundary inside the adapter layer so React commits DOM updates
before SnapEngine continues from write stages into layout reads.
