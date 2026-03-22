# SnapEngine Asset Packages

## Overview

Asset packages extend SnapEngine with specialized functionality. Each follows a consistent monorepo structure with TypeScript core logic and framework-specific wrappers.

## Package Structure Pattern

```
{product-name}/
├── core/                  # TypeScript core logic
│   ├── package.json       # @snap-engine/{product}
│   ├── tsconfig.json      # Path mappings to @snap-engine/core
│   └── src/
│       ├── index.ts       # Exports
│       └── *.ts           # Implementation
├── svelte/                # Svelte components
│   ├── package.json       # @snap-engine/{product}-svelte
│   ├── tsconfig.json      # Path mappings
│   └── src/
│       ├── index.ts       # Component exports
│       └── *.svelte       # Components
└── react/                 # React components (future)
    └── package.json       # @snap-engine/{product}-react
```

## Available Packages

### 1. asset-base/
- **Packages:** `@snap-engine/asset-base`, `@snap-engine/asset-base-svelte`
- **Purpose:** Common base components (Engine, Camera, Background)
- **Components:** Engine.svelte, Camera.svelte, Background.svelte
- **Classes:** CameraControl, Background
- **Status:** ✅ Active

### 2. snapsort/
- **Packages:** `@snap-engine/snapsort`, `@snap-engine/snapsort-svelte`
- **Purpose:** Drag-and-drop list reordering
- **Components:** ItemContainer, Item
- **Classes:** ItemContainer, ItemObject
- **Status:** ✅ Active

### 3. snapline/
- **Packages:** `@snap-engine/snapline`, `@snap-engine/snapline-svelte`
- **Purpose:** Node-based graph UI
- **Components:** Node, Connector, Line, Select
- **Classes:** NodeComponent, ConnectorComponent, LineComponent, RectSelectComponent
- **Status:** ✅ Active

### 4. snapzap/
- **Packages:** `@snap-engine/snapzap-*`
- **Purpose:** Reserved for future enhancements
- **Status:** 📋 Placeholder

## Package Configuration

### Core Package (`package.json`)
```json
{
  "name": "@snap-engine/{product}",
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
  "name": "@snap-engine/{product}-svelte",
  "version": "0.1.0",
  "type": "module",
  "svelte": "./src/index.ts",
  "exports": {
    ".": { "svelte": "./src/index.ts" }
  },
  "dependencies": {
    "@snap-engine/{product}": "*"
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
      "@snap-engine/core": ["../../../src/index.ts"],
      "@snap-engine/core/animation": ["../../../src/animation.ts"],
      "@snap-engine/core/collision": ["../../../src/collision.ts"],
      "@snap-engine/core/debug": ["../../../src/debug.ts"]
    }
  }
}
```

## Design Principles

### Separation of Concerns
- **Core packages:** Framework-agnostic TypeScript, extends @snap-engine/core
- **Framework packages:** Thin wrappers for React, Svelte, etc.
- **No build step:** Raw source exported, not built bundles

### Import Requirements
```typescript
// ✅ Correct - use package names
import { Engine } from "@snap-engine/core";
import { CameraControl } from "@snap-engine/asset-base";

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
@snap-engine/core (built)
    ↓
@snap-engine/{product}
    ↓
@snap-engine/{product}-svelte
```

Special case - Asset Base:
```
@snap-engine/core
    ↓
@snap-engine/asset-base
    ↓
@snap-engine/asset-base-svelte
```

## Notes

- Asset packages export raw TypeScript/Svelte source (not built)
- Only @snap-engine/core is built to `dist/`
- Each package should have AGENTS.md for structure documentation
- API details belong in `doc/` directory, not AGENTS.md
