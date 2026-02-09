# SnapEngine Project Structure

## Overview

SnapEngine is an interactivity engine for the web, structured as an npm workspace monorepo with a core engine and multiple asset packages.

## Repository Structure

```
SnapEngineJS/
├── src/                    # Core engine source (snap-engine package)
├── assets/                 # Asset packages (npm workspaces)
│   ├── snapengine-asset-base/
│   ├── drop-and-snap/
│   ├── snapline/
│   └── snapzap/
├── demo/                   # Demo applications
│   ├── svelte/
│   ├── react/
│   └── vanilla/
├── doc/                    # Documentation
├── tests/                  # Test suites
├── dist/                   # Build output (generated)
├── package.json            # Root workspace config
├── tsconfig.json           # TypeScript config
└── vite.config.mjs         # Build config
```

## Core Engine (`src/`)

**Package:** `@snap-engine/core`
**Purpose:** Core interactivity engine
**Build:** Yes → `dist/`

See `src/AGENTS.md` for module details.

**Entry points:**
- `@snap-engine/core` - Main export
- `@snap-engine/core/animation` - Animation system
- `@snap-engine/core/collision` - Collision detection
- `@snap-engine/core/debug` - Debug utilities

## Asset Packages (`assets/`)

Organized as npm workspaces following a consistent pattern:
- `core/` - TypeScript classes extending snap-engine
- `svelte/` - Svelte component wrappers
- `react/` - React component wrappers (future)

### 1. SnapEngine Asset Base
- **Packages:** `@snap-engine/base`, `@snap-engine/base-svelte`
- **Purpose:** Common components (Engine, Camera, Background)
- **Status:** Active
- See `assets/snapengine-asset-base/AGENTS.md`

### 2. DropAndSnap
- **Packages:** `@snap-engine/drop-and-snap`, `@snap-engine/drop-and-snap-svelte`
- **Purpose:** Drag-and-drop list reordering
- **Status:** Active
- See `assets/drop-and-snap/AGENTS.md`

### 3. SnapLine
- **Packages:** `@snap-engine/snapline`, `@snap-engine/snapline-svelte`
- **Purpose:** Node graph UI system
- **Status:** Active
- See `assets/snapline/AGENTS.md`

### 4. SnapZap
- **Packages:** `@snap-engine/snapzap-*` (placeholders)
- **Purpose:** Future enhancements
- **Status:** Placeholder

## Package Naming

All packages use the `@snap-engine` organization:

- **Core engine:** `@snap-engine/core`
- **Asset base:** `@snap-engine/base`, `@snap-engine/base-svelte`
- **Products:** `@snap-engine/{product}`, `@snap-engine/{product}-svelte`, `@snap-engine/{product}-react`

## Import Patterns

Asset packages must import from published package names:

```typescript
// ✅ Correct
import { Engine } from "@snap-engine/core";
import { CameraControl } from "@snap-engine/base";

// ❌ Wrong - no relative imports to src/
import { Engine } from "../../../src/index";
```

## Workspace Setup

**Root `package.json`:**
```json
{
  "workspaces": [
    "assets/snapengine-asset-base/*",
    "assets/drop-and-snap/*",
    "assets/snapline/*",
    "assets/snapzap/*"
  ]
}
```

**Asset package structure:**
```
{product-name}/
├── core/
│   ├── package.json          # @snap-engine/{product}
│   ├── tsconfig.json         # Path mappings to @snap-engine/core
│   └── src/
│       ├── index.ts
│       └── *.ts
└── svelte/
    ├── package.json          # @snap-engine/{product}-svelte
    ├── tsconfig.json         # Path mappings
    └── src/
        ├── index.ts
        └── *.svelte
```

## TypeScript Configuration

Each asset package needs path mappings:

```json
{
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

## Development Workflow

**Install dependencies:**
```bash
npm install
```

**Build core engine:**
```bash
npm run build
```

**Run demo:**
```bash
npm run dev:svelte    # Svelte demo
npm run dev:react     # React demo
```

**Run tests:**
```bash
npm test
```

## Build System

- **Core engine:** Built with Vite → `dist/`
- **Asset packages:** Not built, export raw source
- **Workspaces:** Auto-linked by npm

## Adding New Asset Package

1. Create directory: `assets/{product-name}/{core,svelte}/`
2. Create package.json for each sub-package
3. Add tsconfig.json with @snap-engine/core path mappings
4. Create AGENTS.md documenting the package
5. Update root package.json workspaces (if needed)
6. Run `npm install`

## Key Principles

- **Separation:** Core TypeScript logic separate from framework wrappers
- **No relative imports:** Asset packages import from package names
- **No build for assets:** Raw source exported, not built bundles
- **Workspace linking:** Automatic via npm workspaces

## Documentation

- **Project structure:** This file and subdirectory AGENTS.md files
- **API reference:** See `doc/` directory
- **Module details:** See `src/AGENTS.md` and package-specific AGENTS.md
