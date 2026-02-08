<script lang="ts">
    import { Engine } from "@snapengine-asset-base/svelte";
    import { Item, ItemContainer as Container } from "@drop-and-snap/svelte";
</script>

<Engine id="drag-drop-demo-canvas">
<div class="gallery">
    <!-- Vertical Column -->
    <div class="demo-box">
        <h3>Vertical Column</h3>
        <div class="container-wrapper">
            <Container config={{ direction: "column", groupID: "vertical-group" }}>
                <Item><p>Item 1</p></Item>
                <Item><p>Item 2</p></Item>
                <Item><p>Item 3</p></Item>
                <Item><p>Item 4</p></Item>
            </Container>
        </div>
    </div>

    <!-- Horizontal Row -->
    <div class="demo-box">
        <h3>Horizontal Row</h3>
        <div class="container-wrapper" style="min-height: 60px;">
            <Container config={{ direction: "row", groupID: "horizontal-group" }}>
                <Item><p>Item 1</p></Item>
                <Item><p>Item 2</p></Item>
                <Item><p>Item 3</p></Item>
                <Item><p>Item 4</p></Item>
            </Container>
        </div>
    </div>

    <!-- Horizontal Double Row -->
    <div class="demo-box">
        <h3>Horizontal Double Row</h3>
        <div class="container-wrapper">
            <Container config={{ direction: "row", groupID: "double-row-group" }}>
                <Item><p>Item 1</p></Item>
                <Item><p>Item 2</p></Item>
                <Item><p>Item 3</p></Item>
                <Item><p>Item 4</p></Item>
                <Item><p>Item 5</p></Item>
                <Item><p>Item 6</p></Item>
                <Item><p>Item 7</p></Item>
                <Item><p>Item 8</p></Item>
            </Container>
        </div>
    </div>

    <!-- Different Sizes -->
    <div class="demo-box">
        <h3>Different Sizes</h3>
        <div class="container-wrapper">
            <Container config={{ direction: "row", groupID: "sizes-group" }}>
                <Item><p style="width: 60px;">Small</p></Item>
                <Item><p style="width: 100px;">Medium</p></Item>
                <Item><p style="width: 140px;">Large</p></Item>
                <Item><p style="width: 60px;">Tall</p></Item>
                <Item><p style="width: 30px;">Short</p></Item>
            </Container>
        </div>
    </div>

    <!-- Multiple Drop Areas -->
    <div class="demo-box">
        <h3>Multiple Drop Areas</h3>
        <div class="areas-wrapper">
            <div class="area">
                <h4>Area 1</h4>
                <Container config={{ direction: "column", groupID: "multi-drop-group" }}>
                    <Item><p>Item A</p></Item>
                    <Item><p>Item B</p></Item>
                    <Item><p>Item C</p></Item>
                </Container>
            </div>
            <div class="area">
                <h4>Area 2</h4>
                <Container config={{ direction: "column", groupID: "multi-drop-group" }}>
                    <Item><p>Item X</p></Item>
                    <Item><p>Item Y</p></Item>
                    <Item><p>Item Z</p></Item>
                </Container>
            </div>
        </div>
    </div>
</div>
</Engine>

<style lang="scss">
    @import "../../../../app.scss";

    .gallery {
      width: 100%;
      height: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: var(--size-16);
      justify-content: center;
      align-content: center;
      overflow-y: auto;
      padding: var(--size-16);
      box-sizing: border-box;
      pointer-events: auto;
    }

    .demo-box {
        border: 1px solid var(--color-border, #ccc);
        padding: 16px;
        border-radius: 8px;
        background: var(--color-surface, #fff);
        width: 400px;
        --item-height: 40px;
    }
    h3 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 1.1em;
    }

    .container-wrapper {
        border: 1px dashed var(--color-border, #ccc);
        padding: 8px;
        min-height: 100px;
    }

    .areas-wrapper {
        display: flex;
        gap: 16px;
    }
    .area {
        flex: 1;
        border: 1px dashed var(--color-border, #ccc);
        padding: 8px;
        min-height: 150px;
    }
    h4 {
        margin: 0 0 8px 0;
        font-size: 0.9em;
        color: #666;
    }
</style>
