# SnapEngine Asset Packages

## Overview

Asset packages extend SnapEngine with specialized functionality. Each follows a consistent monorepo structure with TypeScript core logic and framework-specific wrappers.

## Package Structure Pattern

```
{product-name}/
├── core/                  # TypeScript core logic
│   ├── package.json       # @{product}/core
│   ├── tsconfig.json      # Path mappings to snap-engine
│   └── src/
│       ├── index.ts       # Exports
│       └── *.ts           # Implementation
├── svelte/                # Svelte components
│   ├── package.json       # @{product}/svelte
│   ├── tsconfig.json      # Path mappings
│   └── src/
│       ├── index.ts       # Component exports
│       └── *.svelte       # Components
└── react/                 # React components (future)
    └── package.json       # @{product}/react
```

## Available Packages

### 1. snapengine-asset-base/
- **Packages:** `@snapengine-asset-base/core`, `@snapengine-asset-base/svelte`
- **Purpose:** Common base components (Engine, Camera, Background)
- **Components:** Engine.svelte, Camera.svelte, Background.svelte
- **Classes:** CameraControl, Background
- **Status:** ✅ Active

### 2. drop-and-snap/
- **Packages:** `@drop-and-snap/core`, `@drop-and-snap/svelte`
- **Purpose:** Drag-and-drop list reordering
- **Components:** ItemContainer, Item
- **Classes:** ItemContainer, ItemObject
- **Status:** ✅ Active

### 3. snapline/
- **Packages:** `@snapline/core`, `@snapline/svelte`
- **Purpose:** Node-based graph UI
- **Components:** Node, Connector, Line, Select
- **Classes:** NodeComponent, ConnectorComponent, LineComponent, RectSelectComponent
- **Status:** ✅ Active

### 4. snapzap/
- **Packages:** `@snapzap/*`
- **Purpose:** Reserved for future enhancements
- **Status:** 📋 Placeholder

## Package Configuration

### Core Package (`package.json`)
```json
{
  "name": "@{product-name}/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

### Svelte Package (`package.json`)
```json
{
  "name": "@{product-name}/svelte",
  "version": "0.1.0",
  "type": "module",
  "svelte": "./src/index.ts",
  "exports": {
    ".": { "svelte": "./src/index.ts" }
  },
  "dependencies": {
    "@{product-name}/core": "*"
  }
}
```

### TypeScript Config (`tsconfig.json`)
```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "snap-engine": ["../../../src/index.ts"],
      "snap-engine/animation": ["../../../src/animation.ts"],
      "snap-engine/collision": ["../../../src/collision.ts"],
      "snap-engine/debug": ["../../../src/debug.ts"]
    }
  }
}
```

## Design Principles

### Separation of Concerns
- **Core packages:** Framework-agnostic TypeScript, extends snap-engine
- **Framework packages:** Thin wrappers for React, Svelte, etc.
- **No build step:** Raw source exported, not built bundles

### Import Requirements
```typescript
// ✅ Correct - use package names
import { Engine } from "snap-engine";
import { CameraControl } from "@snapengine-asset-base/core";

// ❌ Wrong - no relative paths to src/
import { Engine } from "../../../src/index";
```

### Workspace Linking
- Managed via npm workspaces in root `package.json`
- Automatic linking between packages
- No manual setup needed

## Adding New Asset Package

1. **Create directory structure:**
   ```bash
   mkdir -p assets/{product-name}/{core,svelte}/src
   ```

2. **Create core package.json**

3. **Create framework package.json**

4. **Add tsconfig.json** with path mappings

5. **Create AGENTS.md** documenting structure and components

6. **Update root package.json** workspaces (if adding new top-level directory)

7. **Run `npm install`** to link packages

## Package Dependencies

```
snap-engine (built)
    ↓
@{product}/core
    ↓
@{product}/svelte
```

Special case - Asset Base:
```
snap-engine
    ↓
@snapengine-asset-base/core
    ↓
@snapengine-asset-base/svelte
```

## Notes

- Asset packages export raw TypeScript/Svelte source (not built)
- Only snap-engine is built to `dist/`
- Each package should have AGENTS.md for structure documentation
- API details belong in `doc/` directory, not AGENTS.md
