<script lang="ts">
  import type { Snippet } from "svelte";

  let { snippet, entry }: { snippet: Snippet<[unknown]>; entry: unknown } = $props();
</script>

{@render snippet(entry)}
