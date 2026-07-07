# @snap-engine/snapsort-svelte

Svelte components for SnapEngine drag-and-drop interactions.

`Container` and `Item` are the only components — every container picks its
drag behavior with a `mode` config field (`"euclidean"` default,
`"progressive"`, or `"insertion"`). `Item` never needs a mode.

## Install

```bash
npm install @snap-engine/snapsort-svelte @snap-engine/snapsort
```

## Includes

- `Container`
- `Item`
- `Handle`

## Usage

```svelte
<script>
  import { Container, Item, Handle } from "@snap-engine/snapsort-svelte";
</script>

<Container config={{ mode: "progressive", groupID: "sentence" }}>
  <Item metadata={{ itemId: "word-1" }}>hello</Item>
</Container>
```
