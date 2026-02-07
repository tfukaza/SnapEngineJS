/**
 * Global debug state shared across all landing page demos and cards.
 * Import and use `debugEnabled` to reactively read/write the debug mode.
 */

let _debugEnabled = $state(false);

export const debugState = {
  get enabled() {
    return _debugEnabled;
  },
  set enabled(value: boolean) {
    _debugEnabled = value;
  },
};