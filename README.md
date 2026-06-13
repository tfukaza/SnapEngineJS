<img src="./docs/assets/images/banner.png" alt="SnapEngine" width="100%" />

> [!WARNING]
> The engine is still in early stages of development. Expect frequent updates and breaking changes.

# Interactivity Engine for the Web

SnapEngineJS is a collection of utilities for building interactive UI elements on the web.

- Input handling with a common API for mouse and touch events.
- Collision detection for basic shapes and lines.
- Helpers for batching DOM updates.
- Camera and world coordinate translation for pan-and-zoom interfaces.
- A built-in WAAPI-based animation engine.
- A visual debugger for inspecting engine internals.
- Zero-dependency, framework-agnostic APIs.

See the [website](https://snap-engine-js.vercel.app) for details and documentation.

## Installation

```bash
npm install @snap-engine/core
```

## Quick Start

```ts
import { Engine, ElementObject } from "@snap-engine/core";

const engine = new Engine();
engine.assignDom(document.getElementById("container") as HTMLElement);

const object = new ElementObject(engine, null);
object.element = document.getElementById("item");

object.queueUpdate("WRITE_1", () => {
  object.worldPosition = [100, 200];
  object.writeTransform();
});
````

## License

MIT
