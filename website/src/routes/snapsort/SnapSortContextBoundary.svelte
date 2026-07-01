<script lang="ts">
  import { setContext } from "svelte";

  let { children }: { children: any } = $props();

  setContext("container", null);
  setContext("item", null);
</script>

{@render children?.()}
