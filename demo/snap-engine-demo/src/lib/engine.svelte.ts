import { Engine } from "../../../../src/index";
import type { Component } from "svelte";
let engineDict: { [key: string]: Engine } = {};

export function getEngine(id: string) {
  if (!engineDict[id]) {
    engineDict[id] = new Engine();
  }
  return engineDict[id];
}

export interface ObjectData {
  svelteComponent: Component;
  prop: any;
}
