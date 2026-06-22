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
- **Components:** ContainerEuclidean, ItemEuclidean, ContainerProgressive, ItemProgressive
- **Classes:** ContainerBase, ContainerEuclidean, ContainerProgressive, ItemBase, ItemEuclidean, ItemProgressive
- **Status:** ✅ Active

### 3. snapline/
- **Packages:** `@snap-engine/snapline`, `@snap-engine/snapline-svelte`
- **Purpose:** Node-based graph UI
- **Components:** Node, Connector, Line, Select
- **Classes:** NodeComponent, ConnectorComponent, LineComponent, RectSelectComponent
- **Status:** 📋 Work In Progress

### 4. snapzap/
- **Packages:** `@snap-engine/snapzap-*`
- **Purpose:** Reserved for future enhancements
- **Status:** 📋 Placeholder

## Design Principles

### Separation of Concerns
- **Core packages:** Framework-agnostic TypeScript, extends @snap-engine/core
- **Framework packages:** Thin wrappers for React, Svelte, etc.
- **No build step:** Raw source exported, not built bundles

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
