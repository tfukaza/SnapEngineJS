import { writable } from "svelte/store";
import {
  frameworks,
  isFramework,
  type Framework,
} from "$lib/frameworks";

export {
  frameworkLabels,
  frameworks,
  isFramework,
  type Framework,
} from "$lib/frameworks";

const storageKey = "preferredCodeFramework";
const defaultFramework: Framework = "svelte";

export const selectedFramework = writable<Framework>(defaultFramework);

export function initializeFrameworkPreference(search: string): void {
  const queryFramework = new URLSearchParams(search).get("framework");
  const storedFramework = localStorage.getItem(storageKey);
  const framework = isFramework(queryFramework)
    ? queryFramework.toLowerCase() as Framework
    : isFramework(storedFramework)
      ? storedFramework.toLowerCase() as Framework
      : defaultFramework;

  selectedFramework.set(framework);
  localStorage.setItem(storageKey, framework);
}

export function setSelectedFramework(
  framework: Framework,
  updateUrl = true,
): void {
  selectedFramework.set(framework);
  localStorage.setItem(storageKey, framework);

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("framework", framework);
    window.history.replaceState(window.history.state, "", url);
  }
}
