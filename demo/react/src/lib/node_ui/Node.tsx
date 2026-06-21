import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import { NodeComponent, LineComponent } from "../../../../../src/index";
import { EngineContext } from "../Canvas";
import { NodeObjectContext } from "./Connector";

import LineReact from "./Line";

interface NodeProps {
  className: string;
  // LineComponent?: React.ComponentType<{ line: LineComponent }>;
  // nodeObject?: NodeComponent | null;
  children: React.ReactNode;
}

// TODO: make lines a sibling to node div

// export interface NodeRef {
//   addSetPropCallback(name: string, callback: (prop: any) => void): void;
//   getNodeObject(): NodeComponent | null;
// }

const Node = forwardRef<NodeComponent, NodeProps>(function Node(props, ref) {
  const engine = useContext(EngineContext);
  const nodeDOM = useRef<HTMLDivElement>(null);
  const node = useRef<NodeComponent | null>(null);
  const [nodeObject, setNodeObject] = useState<NodeComponent | null>(null);
  const [lineList, setLineList] = useState<LineComponent[]>([]);

  // const [nodeObject, setNodeObject] = useState<NodeComponent | null>(
  //   propNodeObject || null,
  // );
  // const [lineList, setLineList] = useState<LineComponent[]>([]);

  useImperativeHandle(ref, () => node.current as NodeComponent);

  useEffect(() => {
    if (!engine) {
      console.warn("Node: No engine found in context");
      return;
    }

    // let currentNodeObject = propNodeObject;
    // if (!currentNodeObject) {
    //   currentNodeObject = new NodeComponent(engine, null);
    //   setNodeObject(currentNodeObject);
    // }

    if (!node.current) {
      node.current = new NodeComponent(engine, null);
      setNodeObject(node.current);
    }

    if (nodeDOM.current && node.current) {
      node.current.element = nodeDOM.current;
      node.current.setLineListCallback((lines: LineComponent[]) => {
        setLineList(lines);
      });
    }

    //   // Set initial line list
    //   setLineList(currentNodeObject.getAllOutgoingLines());
    // }

    // return () => {
    //   if (currentNodeObject && !propNodeObject) {
    //     // Only destroy if we created the nodeObject ourselves
    //     currentNodeObject.destroy();
    //   }
    // };
    return () => {
      node.current?.destroy();
      node.current = null;
    };
  }, [engine]);

  // const contextValue = nodeObject || (propNodeObject as NodeComponent);

  return (
    <NodeObjectContext.Provider value={nodeObject}>
      <div
        ref={nodeDOM}
        className={props.className}
        style={{
          position: "absolute",
        }}
      >
        {props.children}
      </div>
      {lineList.map((line) => (
        <LineReact key={line.id} line={line} />
      ))}
    </NodeObjectContext.Provider>
  );
});

// const NodeReact = forwardRef(Node);

// export default NodeReact;
export default Node;
