<script lang="ts">
  import { tick } from "svelte";
  import { ContainerInsertion } from "@snap-engine/snapsort-svelte";
  import type {
    ContainerCallbacks,
    GhostCreateEvent,
    ItemInsertEvent,
  } from "@snap-engine/snapsort";
  import FileExplorerNode from "./FileExplorerNode.svelte";
  import type { FileExplorerNodeData } from "./FileExplorerNode.svelte";

  const initialTree: FileExplorerNodeData[] = [
    {
      id: "website-tree-src",
      name: "src",
      kind: "folder",
      open: true,
      children: [
        {
          id: "website-tree-routes",
          name: "routes",
          kind: "folder",
          open: true,
          children: [
            { id: "website-tree-snapsort", name: "snapsort", kind: "folder", open: false },
            { id: "website-tree-layout", name: "+layout.svelte", kind: "file" },
          ],
        },
        { id: "website-tree-engine", name: "engine.svelte.ts", kind: "file", active: true },
      ],
    },
    {
      id: "website-tree-docs",
      name: "docs",
      kind: "folder",
      open: true,
      children: [
        { id: "website-tree-intro", name: "introduction.mdx", kind: "file" },
        { id: "website-tree-reference", name: "reference.mdx", kind: "file" },
      ],
    },
    { id: "website-tree-package", name: "package.json", kind: "file" },
  ];

  const fileTreeAnimation = {
    duration: 260,
    timing_function: "cubic-bezier(0.2, 0, 0, 1)",
  };

  let tree = $state<FileExplorerNodeData[]>(structuredClone(initialTree));
  let treeRenderVersion = $state(0);

  function cloneNode(node: FileExplorerNodeData): FileExplorerNodeData {
    return {
      ...node,
      children: node.children?.map(cloneNode),
    };
  }

  function extractNode(
    nodes: FileExplorerNodeData[],
    nodeId: string,
  ): { nodes: FileExplorerNodeData[]; node: FileExplorerNodeData | null } {
    let removed: FileExplorerNodeData | null = null;
    const nextNodes: FileExplorerNodeData[] = [];

    for (const node of nodes) {
      if (node.id === nodeId) {
        removed = cloneNode(node);
        continue;
      }

      if (node.children) {
        const result = extractNode(node.children, nodeId);
        if (result.node) {
          removed = result.node;
          nextNodes.push({ ...node, children: result.nodes });
          continue;
        }
      }

      nextNodes.push(cloneNode(node));
    }

    return { nodes: nextNodes, node: removed };
  }

  function containsNode(node: FileExplorerNodeData, nodeId: string): boolean {
    if (node.id === nodeId) return true;
    return node.children?.some((child) => containsNode(child, nodeId)) ?? false;
  }

  function insertNode(
    nodes: FileExplorerNodeData[],
    containerId: string,
    index: number,
    nodeToInsert: FileExplorerNodeData,
  ): FileExplorerNodeData[] {
    if (containerId === "root") {
      const nextNodes = nodes.map(cloneNode);
      nextNodes.splice(Math.max(0, Math.min(index, nextNodes.length)), 0, nodeToInsert);
      return nextNodes;
    }

    return nodes.map((node) => {
      if (node.id === containerId) {
        const children = node.children?.map(cloneNode) ?? [];
        children.splice(Math.max(0, Math.min(index, children.length)), 0, nodeToInsert);
        return { ...node, open: true, children };
      }

      return {
        ...node,
        children: node.children
          ? insertNode(node.children, containerId, index, nodeToInsert)
          : undefined,
      };
    });
  }

  function toggleNodeOpen(
    nodes: FileExplorerNodeData[],
    nodeId: string,
  ): FileExplorerNodeData[] {
    return nodes.map((node) => {
      if (node.id === nodeId && node.kind === "folder") {
        return { ...node, open: node.open === false };
      }

      return {
        ...node,
        children: node.children ? toggleNodeOpen(node.children, nodeId) : undefined,
      };
    });
  }

  function toggleFolderOpen(nodeId: string) {
    tree = toggleNodeOpen(tree, nodeId);
    treeRenderVersion += 1;
  }

  function handleInsert(event: ItemInsertEvent) {
    const itemId = event.itemMetadata.itemId;
    const containerId = event.containerMetadata.containerId;
    if (typeof itemId !== "string" || typeof containerId !== "string") return;

    const extracted = extractNode(tree, itemId);
    if (!extracted.node) return;
    if (containsNode(extracted.node, containerId)) return;

    tree = insertNode(extracted.nodes, containerId, event.index, extracted.node);
    treeRenderVersion += 1;
  }

  function createFileTreeGhost(event: GhostCreateEvent): HTMLElement {
    const ghostElement = document.createElement("div");
    const ghostRect = event.ghostRect;
    const insetLeft = ghostRect?.insetLeft ?? 0;
    const insetRight = ghostRect?.insetRight ?? 0;
    const width = ghostRect
      ? Math.max(0, ghostRect.width - insetLeft - insetRight)
      : 0;

    ghostElement.dataset.snapsortGhost = "insertion";
    ghostElement.style.position = "absolute";
    ghostElement.style.width = `${width}px`;
    ghostElement.style.height = "0px";
    ghostElement.style.borderTop = "3px solid currentColor";
    ghostElement.style.color = "#1d4ed8";
    ghostElement.style.pointerEvents = "none";
    ghostElement.style.boxSizing = "border-box";

    return ghostElement;
  }

  const callbacks: ContainerCallbacks = {
    onItemInsert: handleInsert,
    createItemGhost: createFileTreeGhost,
    awaitMutation: tick,
  };
</script>

<div class="file-explorer-card">
  <div class="file-window">
    <div class="file-window-bar">
      <span></span>
      <span></span>
      <span></span>
    </div>
    {#key treeRenderVersion}
      <ContainerInsertion
        className="code-tree"
        config={{
          direction: "column",
          groupID: "website-file-explorer",
          name: "website-file-explorer-root",
          callbacks,
          animation: {
            reorder: fileTreeAnimation,
            drop: fileTreeAnimation,
          },
        }}
        locked={true}
        metadata={{
          containerId: "root",
          insertionDepth: 0,
          insertionMarkerInsetLeft: 8,
          insertionMarkerInsetRight: 8,
        }}
      >
        {#each tree as node (node.id)}
          <FileExplorerNode {node} {callbacks} onToggleFolder={toggleFolderOpen} />
        {/each}
      </ContainerInsertion>
    {/key}
  </div>
</div>

<style>
  .file-explorer-card {
    min-width: 0;
    height: 100%;
  }

  .file-window {
    display: flex;
    flex-direction: column;
    min-height: 300px;
    height: 100%;
    overflow: hidden;
    border: 1px solid #d9dde2;
    border-radius: var(--ui-radius);
    background: #ffffff;
    color: #202427;
  }

  .file-window-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-bottom: 1px solid #e5e7eb;
    background: #f4f6f8;
    flex: 0 0 auto;
  }

  .file-window-bar span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c5ccd4;
  }

  :global(.code-tree),
  :global(.snapsort-container.tree-folder) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0 !important;
    padding: 0;
  }

  :global(.code-tree) {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
    min-height: 560px;
    padding: 8px 0 12px;
    box-sizing: border-box;
    overflow: hidden;
  }

  :global(.snapsort-container.tree-folder) {
    width: 100%;
    margin: 0 !important;
    border: 0 !important;
    outline: 0 !important;
    background: transparent;
  }

  :global(.snapsort-item.tree-row),
  :global(.tree-folder > .tree-row) {
    --indent-size: 14px;
    width: 100%;
    min-height: 24px;
    margin: 0 !important;
    padding: 3px 8px 3px calc(8px + (var(--depth, 0) * var(--indent-size)));
    display: grid !important;
    grid-template-columns: 18px 18px minmax(0, 1fr);
    align-items: center !important;
    border: 1px solid transparent;
    border-radius: 0;
    box-sizing: border-box;
    background: transparent;
    color: #1f2937;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    justify-content: initial !important;
    justify-items: stretch;
    font-size: 14px;
    font-weight: 500;
    line-height: normal;
    position: relative;
    touch-action: none;
  }

  :global(.snapsort-item.tree-row:hover),
  :global(.tree-folder > .tree-row:hover) {
    background: #eef4ff;
  }

  :global(.snapsort-item.tree-row.active),
  :global(.tree-folder.active > .tree-row) {
    background: #dbeafe;
    color: #0f172a;
  }

  :global(.snapsort-item.tree-row[data-snapsort-dragging="true"]),
  :global(.tree-folder[data-snapsort-dragging="true"] > .tree-row) {
    background: #bfdbfe;
    border-color: #3b82f6;
    opacity: 0.78;
    cursor: grabbing;
  }

  :global(.indent) {
    position: absolute;
    left: calc(14px + ((var(--depth, 0) - 1) * var(--indent-size)));
    top: 0;
    bottom: 0;
    width: 1px;
    background-image: linear-gradient(#d4dbe7, #d4dbe7);
    background-size: 1px 100%;
    background-repeat: repeat-y;
    background-position: 0 0;
    opacity: min(var(--depth, 0), 1);
    pointer-events: none;
  }

  :global(.chevron),
  :global(.chevron-spacer) {
    width: 16px;
    height: 16px;
    position: relative;
    display: inline-block;
  }

  :global(button.chevron) {
    appearance: none;
    border: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
    color: inherit;
    cursor: pointer;
  }

  :global(.chevron)::before {
    content: "";
    position: absolute;
    left: 5px;
    top: 4px;
    width: 6px;
    height: 6px;
    border-right: 1.5px solid #64748b;
    border-bottom: 1.5px solid #64748b;
    transform: rotate(-45deg);
  }

  :global(.chevron.open)::before {
    left: 4px;
    top: 3px;
    transform: rotate(45deg);
  }

  :global(.folder-icon),
  :global(.file-icon) {
    width: 16px;
    height: 16px;
    position: relative;
    display: inline-block;
  }

  :global(.folder-icon)::before {
    content: "";
    position: absolute;
    left: 1px;
    top: 6px;
    width: 14px;
    height: 9px;
    border-radius: 1px;
    background: #d99a22;
  }

  :global(.folder-icon)::after {
    content: "";
    position: absolute;
    left: 2px;
    top: 3px;
    width: 7px;
    height: 4px;
    border-radius: 1px 1px 0 0;
    background: #e5b24a;
  }

  :global(.file-icon)::before {
    content: "";
    position: absolute;
    left: 3px;
    top: 1px;
    width: 10px;
    height: 14px;
    border: 1px solid #8aa6c1;
    border-radius: 1px;
    background: #ffffff;
    box-sizing: border-box;
  }

  :global(.file-icon)::after {
    content: "";
    position: absolute;
    left: 5px;
    top: 5px;
    width: 6px;
    height: 1px;
    background: #8aa6c1;
    box-shadow:
      0 3px 0 #8aa6c1,
      0 6px 0 #8aa6c1;
  }

  :global(.row-name) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 500;
  }

  :global([data-snapsort-ghost="insertion"]) {
    color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
  }
</style>
