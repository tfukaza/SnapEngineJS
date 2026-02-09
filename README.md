# SnapEngine

Interactivity engine for building complex interactive UIs on web applications.

## Installation

```bash
npm install snap-engine
```

## Quick Start

```typescript
import { Engine, ElementObject } from 'snap-engine';

// Create engine and attach to container
const engine = new Engine();
engine.assignDom(document.getElementById('container'));

// Create an interactive object
const obj = new ElementObject(engine, null);
obj.element = document.getElementById('my-element');

// Queue DOM updates to avoid layout thrashing
obj.queueUpdate("READ_1", () => {
    obj.readDom();
});

obj.queueUpdate("WRITE_1", () => {
    obj.worldPosition = [100, 200];
    obj.writeTransform();
});
```

## Documentation

See `doc/overview.md` for detailed engine concepts and API documentation.

## Development

Install dependencies:
```bash
npm install
```

Run demo apps:
```bash
npm run dev:vanilla   # Vanilla JS demo
npm run dev:react     # React demo
npm run dev:svelte    # Svelte demo
```

Build the library:
```bash
npm run build
```

Run tests:
```bash
npm run test
```

## License

MIT
