import { Engine } from "@snap-engine/core";

/** @type {Record<string, Engine>} */
const engineDict = {};

/**
 * @param {string} id
 * @returns {Engine}
 */
export function getEngine(id) {
  if (!engineDict[id]) {
    engineDict[id] = new Engine();
  }
  return engineDict[id];
}
