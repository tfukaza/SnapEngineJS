<script lang="ts">
    import { onMount, tick } from "svelte";
    import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
    import Node from "../../../../../svelte/src/lib/node_ui/Node.svelte";
    import { NodeComponent } from "../../../../../../src/asset/node_ui/node";
    import EmojiConnector from "./EmojiConnector.svelte";
    import EmojiLine from "./EmojiLine.svelte";
    import { getEngine } from "../../../../../svelte/src/lib/engine.svelte";

    type EmojiNode = {
        id: string;
        glyph: string;
        label: string;
        color: string;
        connectorName: string;
        node: NodeComponent;
    };

    type WordNode = {
        id: string;
        headline: string;
        connectorName: string;
        node: NodeComponent;
    };

    const engine = getEngine("emoji-word-connectors");

    const emojiData = [
        {
            id: "emoji-fire",
            glyph: "🔥",
            label: "Heat",
            color: "var(--color-secondary-1)",
        },
        {
            id: "emoji-rocket",
            glyph: "🚀",
            label: "Velocity",
            color: "var(--color-secondary-2)",
        },
        {
            id: "emoji-sparkles",
            glyph: "✨",
            label: "Delight",
            color: "var(--color-secondary-3)",
        },
        {
            id: "emoji-wave",
            glyph: "🌊",
            label: "Flow",
            color: "var(--color-secondary-4)",
        },
    ];

    const wordData = [
        {
            id: "word-interactivity",
            headline: "Interactivity",
        },
        {
            id: "word-engine",
            headline: "Engine",
        },
        {
            id: "word-web",
            headline: "for the Web",
        },
    ];

    const emojiNodes: EmojiNode[] = emojiData.map((item) => ({
        ...item,
        connectorName: `${item.id}-connector`,
        node: new NodeComponent(engine, null, { lockPosition: true }),
    }));

    const wordNodes: WordNode[] = wordData.map((item) => ({
        ...item,
        connectorName: `${item.id}-connector`,
        node: new NodeComponent(engine, null, { lockPosition: true }),
    }));

    const defaultConnections = [
        // { emoji: "emoji-fire", word: "word-interactivity" },
        // { emoji: "emoji-rocket", word: "word-engine" },
        // { emoji: "emoji-sparkles", word: "word-web" }
    ];

    function positionNodes() {
        const leftX = -260;
        const rightX = 80;
        const topY = -150;
        const emojiGap = 110;
        const wordGap = 120;

        emojiNodes.forEach((item, index) => {
            item.node.worldPosition = [leftX, topY + index * emojiGap];
            item.node.writeTransform();
        });

        wordNodes.forEach((item, index) => {
            item.node.worldPosition = [rightX, topY + index * wordGap + 30];
            item.node.writeTransform();
        });
    }

    async function connectDefaults() {
        await tick();
        defaultConnections.forEach(({ emoji, word }) => {
            const source = emojiNodes.find((node) => node.id === emoji);
            const target = wordNodes.find((node) => node.id === word);
            if (!source || !target) return;
            const sourceConnector = source.node.getConnector(
                source.connectorName,
            );
            const targetConnector = target.node.getConnector(
                target.connectorName,
            );
            if (sourceConnector && targetConnector) {
                sourceConnector.connectToConnector(targetConnector, null);
            }
        });
    }

    onMount(() => {
        positionNodes();
        connectDefaults();
    });
</script>

<div class="emoji-word-connectors">
    <Canvas id="emoji-word-canvas" {engine} debug={false}>
        <div class="emoji-column">
            {#each emojiNodes as item (item.id)}
                <div class="emoji-chip">
                    <Node
                        nodeObject={item.node}
                        LineSvelteComponent={EmojiLine}
                        className="emoji-node"
                    >
                        <EmojiConnector
                            name={item.connectorName}
                            maxConnectors={0}
                            allowDragOut={true}
                            colliderRadius={0}
                            color={item.color}
                        />
                    </Node>
                    <p>{item.glyph}</p>
                </div>
            {/each}
        </div>
        <div></div>
        <div class="word-column">
            {#each wordNodes as item (item.id)}
                <div class="word-chip">
                    <Node
                        nodeObject={item.node}
                        LineSvelteComponent={EmojiLine}
                        className="word-node"
                    >
                        <EmojiConnector
                            name={item.connectorName}
                            maxConnectors={1}
                            allowDragOut={false}
                            colliderRadius={8}
                        />
                    </Node>
                    <p>{item.headline}</p>
                </div>
            {/each}
        </div>
    </Canvas>
</div>

<style lang="scss">
    .emoji-word-connectors {
        height: 100%;
        width: 100%;
        user-select: none;
    }

    :global(.emoji-word-connectors #snap-canvas) {
        display: grid;
        overflow: visible !important;
        grid-template-columns: auto 1fr auto;
        // gap: 10px;
        height: 100%;
        width: 100%;
        position: relative;
        overflow: hidden;
        align-items: center;
    }

    .emoji-column,
    .word-column {
        // position: absolute;
        // top: 50%;
        // transform: translateY(-50%);
        // display: flex;
        // flex-direction: column;
        // gap: 0.85rem;
    }

    .emoji-column {
    }

    .word-column {
    }

    :global(.emoji-node),
    :global(.word-node) {
        position: relative !important;
        transform: none !important;
        padding: 0;
        background: transparent;
        border: none;
        box-shadow: none;
    }

    .emoji-chip,
    .word-chip {
        display: flex;
        flex-direction: row-reverse;
        width: 100%;
        position: relative;
        align-items: center;
        gap: var(--size-8);
        // align-items: center;
        // justify-content: space-between;
        // border-radius: var(--size-6);
        // border: 1px solid rgba(0, 0, 0, 0.08);
        // padding: 0.55rem 0.85rem;
        // background: rgba(255, 255, 255, 0.75);
        // backdrop-filter: blur(12px);
        // gap: 0.5rem;
    }

    // .emoji-chip :global(svg) {
    //     transform: none !important;
    //     top: 50%;
    //     right: 0;
    //     z-index: -1;
    // }

    .word-chip {
        flex-direction: row;
        padding: var(--size-4) 0;

        p {
            font-size: 10px;
        }
        // justify-content: flex-start;
    }

    .word-chip :global(.emoji-connector) {
        // order: 0;
        // margin-right: 0.75rem;
        // transform: translate(-50%, -50%);
    }

    .emoji-chip :global(.emoji-connector) {
        // order: 2;
        // margin-left: auto;
        // transform: translate(-50%, -50%);
    }
</style>
