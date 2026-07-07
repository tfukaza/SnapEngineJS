import { writable } from "svelte/store";

export type DebugLayoutFooterControl = {
  debugLayout: boolean;
  onToggle: () => void;
};

export const debugLayoutFooterControl = writable<DebugLayoutFooterControl | null>(null);
