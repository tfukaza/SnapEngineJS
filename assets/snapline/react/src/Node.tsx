import {
  createContext,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LineComponent, NodeComponent } from "@snap-engine/snapline";
import { useSnapLineEngine } from "./Engine";
import { Line } from "./Line";

export const NodeObjectContext = createContext<NodeComponent | null>(null);

export interface NodeProps {
  children: ReactNode;
  className?: string;
  lineComponent?: ComponentType<{ line: LineComponent }>;
  nodeObject?: NodeComponent | null;
  style?: CSSProperties;
  x?: number;
  y?: number;
}

export const Node = forwardRef<NodeComponent, NodeProps>(function Node(
  {
    children,
    className = "",
    lineComponent: LineRenderer = Line,
    nodeObject = null,
    style,
    x = 0,
    y = 0,
  },
  ref,
) {
  const engine = useSnapLineEngine();
  const nodeDomRef = useRef<HTMLDivElement>(null);
  const ownsNodeRef = useRef(nodeObject == null);
  const nodeRef = useRef<NodeComponent | null>(nodeObject);
  if (!nodeRef.current) {
    nodeRef.current = new NodeComponent(engine, null);
  }
  const node = nodeRef.current;
  const [lineList, setLineList] = useState<LineComponent[]>(
    node.getAllOutgoingLines(),
  );

  useImperativeHandle(ref, () => node, [node]);

  useEffect(() => {
    node.worldTransform = { x, y };
    if (nodeDomRef.current) {
      node.element = nodeDomRef.current;
      node.writeTransform();
    }
    node.setLineListCallback((lines: LineComponent[]) => {
      setLineList([...lines]);
    });
    setLineList([...node.getAllOutgoingLines()]);

    return () => {
      node.setLineListCallback(() => {});
      if (ownsNodeRef.current) {
        node.destroy();
      }
    };
  }, [node, x, y]);

  return (
    <NodeObjectContext.Provider value={node}>
      {lineList.map((line) => (
        <LineRenderer key={line.id} line={line} />
      ))}
      <div
        ref={nodeDomRef}
        data-snapline-type="node"
        className={className}
        style={{
          position: "absolute",
          ...style,
        }}
      >
        {children}
      </div>
    </NodeObjectContext.Provider>
  );
});
