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

**Package:** `snap-engine`
**Purpose:** Core interactivity engine
**Build:** Yes → `dist/`

See `src/AGENTS.md` for module details.

**Entry points:**
- `snap-engine` - Main export
- `snap-engine/animation` - Animation system
- `snap-engine/collision` - Collision detection
- `snap-engine/debug` - Debug utilities

## Asset Packages (`assets/`)

Organized as npm workspaces following a consistent pattern:
- `core/` - TypeScript classes extending snap-engine
- `svelte/` - Svelte component wrappers
- `react/` - React component wrappers (future)

### 1. SnapEngine Asset Base
- **Packages:** `@snapengine-asset-base/core`, `@snapengine-asset-base/svelte`
- **Purpose:** Common components (Engine, Camera, Background)
- **Status:** Active
- See `assets/snapengine-asset-base/AGENTS.md`

### 2. DropAndSnap
- **Packages:** `@drop-and-snap/core`, `@drop-and-snap/svelte`
- **Purpose:** Drag-and-drop list reordering
- **Status:** Active
- See `assets/drop-and-snap/AGENTS.md`

### 3. SnapLine
- **Packages:** `@snapline/core`, `@snapline/svelte`
- **Purpose:** Node graph UI system
- **Status:** Active
- See `assets/snapline/AGENTS.md`

### 4. SnapZap
- **Packages:** `@snapzap/*` (placeholders)
- **Purpose:** Future enhancements
- **Status:** Placeholder

## Package Naming

- **Core engine:** `snap-engine`
- **Asset base:** `@snapengine-asset-base/{core|svelte|react}`
- **Products:** `@{product-name}/{core|svelte|react}`

## Import Patterns

Asset packages must import from published package names:

```typescript
// ✅ Correct
import { Engine } from "snap-engine";
import { CameraControl } from "@snapengine-asset-base/core";

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
│   ├── package.json          # @{product}/core
│   ├── tsconfig.json         # Path mappings to snap-engine
│   └── src/
│       ├── index.ts
│       └── *.ts
└── svelte/
    ├── package.json          # @{product}/svelte
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
      "snap-engine": ["../../../src/index.ts"],
      "snap-engine/animation": ["../../../src/animation.ts"],
      "snap-engine/collision": ["../../../src/collision.ts"],
      "snap-engine/debug": ["../../../src/debug.ts"]
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
3. Add tsconfig.json with snap-engine path mappings
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
