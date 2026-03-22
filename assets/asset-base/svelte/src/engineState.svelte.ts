import { ElementObject, Engine } from "@snap-engine/core";
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
  object: ElementObject;
  prop?: { [key: string]: any };
}
