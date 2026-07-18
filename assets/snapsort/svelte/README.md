# @snap-engine/snapsort-svelte

Svelte components for SnapEngine drag-and-drop interactions.

`Container`, `Item`, `Ghost`, and `Handle` are the Svelte primitives. Every
container picks its drag behavior with a `mode` config field (`"euclidean"`
default, `"progressive"`, `"insertion"`, or `"swap"`). `Item` never needs a mode.

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

## Svelte Mutation Callbacks

Use normal synchronous assignments to `$state` from SnapSort callbacks. The
adapter automatically runs each structural mutation inside Svelte's
`flushSync`, so the DOM is committed before SnapEngine measures final geometry
and writes FLIP's inverse transform. No `tick()` callback is required.
