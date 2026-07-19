# @snap-engine/asset-base-svelte

Svelte wrappers for SnapEngine's shared foundational asset components.

## Install

```bash
npm install @snap-engine/asset-base-svelte @snap-engine/asset-base @snap-engine/core
```

## Includes

- `Engine`
- `Camera`
- `Background`

## Usage

```svelte
<script>
  import { Engine, Camera, Background } from "@snap-engine/asset-base-svelte";
</script>
```

`Engine`, `Camera`, and `Background` forward standard `div` attributes. The
engine defaults to `height: 100%`, `position: relative`, and `overflow:
visible`; pass `style` or a class to establish a different viewport. A supplied
`engine` is never destroyed by the component. An internally created engine is
destroyed on unmount.
