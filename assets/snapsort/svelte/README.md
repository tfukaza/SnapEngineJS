# @snap-engine/snapsort-svelte

Svelte components for SnapEngine drag-and-drop interactions.

`Container`, `Item`, `Ghost`, and `Handle` are the Svelte primitives. Every
container picks its drag behavior with a `mode` config field (`"euclidean"`
default, `"progressive"`, `"insertion"`, or `"swap"`). `Item` never needs a mode.

## Install

```bash
npm install @snap-engine/core @snap-engine/asset-base-svelte @snap-engine/snapsort @snap-engine/snapsort-svelte svelte
```

## Includes

- `Container`
- `Ghost`
- `Item`
- `Handle`

## Usage

```svelte
<script lang="ts">
  import { Container, Ghost, Item, Handle } from "@snap-engine/snapsort-svelte";
  import type { ItemMoveEvent } from "@snap-engine/snapsort";

  let words = $state([{ id: "word-1", text: "hello" }]);

  function onItemMove(event: ItemMoveEvent) {
    const moved = words.find((word) => word.id === event.itemId);
    if (!moved) return;
    const next = words.filter((word) => word.id !== event.itemId);
    next.splice(Math.max(0, Math.min(event.to.index, next.length)), 0, moved);
    words = next;
  }
</script>

<Container
  config={{
    mode: "progressive",
    groupID: "sentence",
    callbacks: { onItemMove },
  }}
  items={words}
>
  {#snippet entry(word)}
    <Item itemId={word.id}>{word.text}</Item>
  {/snippet}

  {#snippet ghost(event)}
    <Ghost {event}>
      <span>{event.originalItemId}</span>
    </Ghost>
  {/snippet}
</Container>
```

## Svelte Mutation Callbacks

Use normal synchronous assignments to `$state` from SnapSort callbacks. The
adapter automatically runs each structural mutation inside Svelte's
`flushSync`, so the DOM is committed before SnapEngine measures final geometry
and writes FLIP's inverse transform. No `tick()` callback is required.

Use a stable `itemId` for every entry and update application arrays in
`onItemMove`; SnapSort does not own Svelte state and the adapter never falls
back to Vanilla DOM mutation. A move without the required state callback is an
integration error. Do not call structural DOM APIs from a callback. Components
forward normal `div` attributes. The only component subpaths are `Container.svelte`,
`Item.svelte`, `Ghost.svelte`, and `Handle.svelte`; select placement behavior
with `config.mode`.
