<script lang="ts">
  import type { GhostInsertEvent } from "@snap-engine/snapsort";
  import type { Snippet } from "svelte";

  let {
    event,
    children,
    className = "",
    style = "",
  }: {
    event: GhostInsertEvent;
    children?: Snippet<[]>;
    className?: string;
    style?: string;
  } = $props();

  const footprintStyle = $derived.by(() => {
    const origProp = event.original.dragSnapshot?.box ?? event.original.currentDomProperty;
    const width = event.ghostRect?.width ?? origProp.width;
    const height = event.ghostRect?.height ?? origProp.height;
    return (
      `width:${width}px;height:${height}px;` +
      `margin:${origProp.margin.top}px ${origProp.margin.right}px ${origProp.margin.bottom}px ${origProp.margin.left}px;` +
      "box-sizing:border-box;"
    );
  });
  const mergedStyle = $derived(`${footprintStyle}${style}`);

  function bindGhostElement(node: HTMLElement) {
    event.ghostItem.element = node;
    return {
      destroy() {
        if (event.ghostItem.element === node) {
          event.ghostItem.element = null;
        }
      },
    };
  }
</script>

<div
  id="spacer"
  class={className}
  data-snapsort-ghost-entry={event.kind}
  style={mergedStyle}
  use:bindGhostElement
>
  {@render children?.()}
</div>
