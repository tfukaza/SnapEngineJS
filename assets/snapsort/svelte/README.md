# @snap-engine/snapsort-svelte

Svelte components for SnapEngine drag-and-drop interactions.

`Container`, `Item`, `Ghost`, and `Handle` are the Svelte primitives. Every
container picks its drag behavior with a `mode` config field (`"euclidean"`
default, `"progressive"`, or `"insertion"`). `Item` never needs a mode.

## Install

```bash
npm install @snap-engine/snapsort-svelte @snap-engine/snapsort
```

## Includes

- `Container`
- `Ghost`
- `Item`
- `Handle`

## Usage

```svelte
<script>
  import { Container, Ghost, Item, Handle } from "@snap-engine/snapsort-svelte";
</script>

<Container
  config={{ mode: "progressive", groupID: "sentence" }}
  items={[{ id: "word-1", text: "hello" }]}
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
