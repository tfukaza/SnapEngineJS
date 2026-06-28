import {
  Connector,
  Engine as SnapLineEngine,
  Node,
  Select,
} from "@snap-engine/snapline-react";
import {
  Container,
  Engine as SnapSortEngine,
  Item,
} from "@snap-engine/snapsort-react";
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
  const path = window.location.pathname;
  if (path === "/snapsort") {
    return <SnapSortDemo />;
  }

  return <SnapLineDemo />;
}

function SnapLineDemo() {
  return (
    <main className="snapline-demo">
      <SnapLineEngine id="node-ui-demo-canvas" className="snapline-canvas">
        <div id="node-ui-demo">
          <div id="sl-background" />
          <Select />
          <SimpleNode title="Node A" x={120} y={120} />
          <SimpleNode title="Node B" x={440} y={170} />
          <SimpleNode title="Node C" x={280} y={360} />
        </div>
      </SnapLineEngine>
    </main>
  );
}

const tasks = [
  { id: "react-task-1", label: "Design API", detail: "Adapter exports" },
  { id: "react-task-2", label: "Wire demo", detail: "React route" },
  { id: "react-task-3", label: "Test drag", detail: "Browser coverage" },
  { id: "react-task-4", label: "Review docs", detail: "Package shape" },
];

function SnapSortDemo() {
  return (
    <main className="snapsort-react-demo">
      <SnapSortEngine id="snapsort-react-demo-canvas" className="snapsort-react-canvas">
        <section className="snapsort-react-board" aria-label="SnapSort React demo">
          <Container
            className="snapsort-react-list"
            config={{ direction: "column", groupID: "react-snapsort" }}
            locked={true}
          >
            {tasks.map((task) => (
              <Item
                className="snapsort-react-card"
                key={task.id}
                metadata={{ itemId: task.id }}
              >
                <strong>{task.label}</strong>
                <span>{task.detail}</span>
              </Item>
            ))}
          </Container>
        </section>
      </SnapSortEngine>
    </main>
  );
}
