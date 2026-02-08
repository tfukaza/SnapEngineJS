<script lang="ts">
    import { onMount, tick } from "svelte";
    import { Engine } from "@snapengine-asset-base/svelte";
    import { Node } from "@snapline/svelte";
    import { NodeComponent } from "@snapline/core";
    import EmojiConnector from "./EmojiConnector.svelte";
    import EmojiLine from "./EmojiLine.svelte";
    import { getEngine } from "@snapengine-asset-base/svelte";
    import { debugState } from "$lib/landing/debugState.svelte";

    export type EmojiWordConnection = {
        emoji: string;
        glyph: string;
        word: string;
        headline: string;
    };

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

    interface Props {
        getConnections?: () => EmojiWordConnection[];
    }

    let { getConnections = $bindable() }: Props = $props();

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

    // Expose API to get current connections
    getConnections = (): EmojiWordConnection[] => {
        const connections: EmojiWordConnection[] = [];
        
        for (const emojiNode of emojiNodes) {
            const connector = emojiNode.node.getConnector(emojiNode.connectorName);
            if (!connector) continue;
            
            // Check outgoing lines to find connected word nodes
            for (const line of connector.outgoingLines) {
                if (!line.target) continue;
                
                // Find which word node this target connector belongs to
                const wordNode = wordNodes.find(w => {
                    const wConnector = w.node.getConnector(w.connectorName);
                    return wConnector === line.target;
                });
                
                if (wordNode) {
                    connections.push({
                        emoji: emojiNode.id,
                        glyph: emojiNode.glyph,
                        word: wordNode.id,
                        headline: wordNode.headline,
                    });
                }
            }
        }
        
        return connections;
    };

    const defaultConnections: { emoji: string; word: string }[] = [
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
    <Engine id="emoji-word-canvas" {engine} debug={debugState.enabled}>
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
        <div class="connector-spacer slot shallow"></div>
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
    </Engine>
</div>

<style lang="scss">
    .emoji-word-connectors {
        height: 100%;
        width: 100%;
        user-select: none;

        --connector-radius: 6px;
    }

    :global(.emoji-word-connectors #snap-canvas) {
        display: grid;
        overflow: visible !important;
        grid-template-columns: auto 1fr auto;
        height: 100%;
        width: 100%;
        position: relative;
        overflow: hidden;
        align-items: center;
    }

    :global(.emoji-node),
    :global(.word-node) {
        position: relative !important;
        transform: none !important;
        padding: 0;
        background: transparent;
        border: none;
        box-shadow: none;
        z-index: 1001;
    }

    .emoji-chip,
    .word-chip {
        display: flex;
        flex-direction: row-reverse;
        width: 100%;
        position: relative;
        align-items: center;
        gap: var(--size-8);
    }

    .word-chip {
        flex-direction: row;
        padding: var(--size-4) 0;

        p {
            font-size: 10px;
        }
    }

    .connector-spacer {
        width: calc(100% + var(--connector-radius) * 2);
        transform: translateX(calc(var(--connector-radius) * -1));
        z-index: -1;
        height: 100%;
        border-radius: var(--ui-radius);
        background-color: var(--color-background-tint);
    }

</style>
