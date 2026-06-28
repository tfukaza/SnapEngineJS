import { Connector, Engine, Node, Select } from "@snap-engine/snapline-react";
import "../demo.css";

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
  return (
    <main className="snapline-demo">
      <Engine id="node-ui-demo-canvas" className="snapline-canvas">
        <div id="node-ui-demo">
          <div id="sl-background" />
          <Select />
          <SimpleNode title="Node A" x={120} y={120} />
          <SimpleNode title="Node B" x={440} y={170} />
          <SimpleNode title="Node C" x={280} y={360} />
        </div>
      </Engine>
    </main>
  );
}
