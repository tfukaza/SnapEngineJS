import {
  Connector,
  Node,
  Select,
} from "@snap-engine/snapline-react";
import { Engine as SnapEngine } from "@snap-engine/asset-base-react";
import {
  DropSnapNestedDemo,
  SnapSortComponentsDemo,
  SnapSortDuolingoDemo,
  SnapSortInsertionDemo,
  SnapSortWebsiteCoreDemo,
} from "./snapsort/SnapSortFixtures";
import "../demo.css";
import AssetBaseReactDemo from "./AssetBaseReactDemo";

function SimpleNode({ title, x, y }) {
  return (
    <Node className="card node" x={x} y={y}>
      <div className="node-header">
        <h3>{title}</h3>
      </div>
      <div className="node-body">
        <div className="input-row">
          <div className="connector-wrapper">
            <Connector name="input" maxConnectors={1} allowDragOut={false} />
          </div>
          <span>Input</span>
        </div>
        <div className="output-row">
          <span>Output</span>
          <div className="connector-wrapper">
            <Connector name="output" maxConnectors={-1} allowDragOut={true} />
          </div>
        </div>
      </div>
    </Node>
  );
}

export default function App() {
  const path = window.location.pathname;
  const demo = new URLSearchParams(window.location.search).get("demo");

  if (demo === "camera_control" || demo === "asset_base_react") {
    return <AssetBaseReactDemo />;
  }

  if (
    path === "/snapsort-insertion" ||
    demo === "snapsort_insertion"
  ) {
    return <SnapSortInsertionDemo />;
  }

  if (
    path === "/snapsort-website-core" ||
    demo === "snapsort_website_core"
  ) {
    return <SnapSortWebsiteCoreDemo />;
  }

  if (
    path === "/snapsort-components" ||
    demo === "snapsort_components"
  ) {
    return <SnapSortComponentsDemo />;
  }

  if (demo === "snapsort_duolingo") {
    return <SnapSortDuolingoDemo />;
  }

  if (
    path === "/snapsort" ||
    path === "/drop-snap-nested" ||
    demo === "snapsort" ||
    demo === "drop_snap_nested" ||
    demo === "drag_drop" ||
    demo === "nested_items"
  ) {
    return <DropSnapNestedDemo />;
  }

  return <SnapLineDemo />;
}

function SnapLineDemo() {
  return (
    <main className="snapline-demo">
      <SnapEngine id="node-ui-demo-canvas" className="snapline-canvas">
        <div id="node-ui-demo">
          <div id="sl-background" />
          <Select />
          <SimpleNode title="Node A" x={120} y={120} />
          <SimpleNode title="Node B" x={440} y={170} />
          <SimpleNode title="Node C" x={280} y={360} />
        </div>
      </SnapEngine>
    </main>
  );
}
