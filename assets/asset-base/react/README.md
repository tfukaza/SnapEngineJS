# @snap-engine/asset-base-react

React wrappers for SnapEngine's shared Engine, camera, and background assets.

## Install

```bash
npm install @snap-engine/asset-base-react @snap-engine/asset-base @snap-engine/core
```

React 18 and React 19 are supported.

## Usage

```tsx
import { Background, Camera, Engine } from "@snap-engine/asset-base-react";

export function Scene() {
  return (
    <Engine id="scene">
      <Camera>
        <Background />
        <div>Interactive content</div>
      </Camera>
    </Engine>
  );
}
```

`Engine`, `Camera`, and `Background` forward refs to their underlying
SnapEngine objects. Use `useSnapEngine()` or `useCameraControl()` from a child
component when context access is more convenient.
