import { useEffect, useRef, useState } from "react";
import type { LineComponent } from "../../../../../src/index";

interface LineProps {
  line: LineComponent;
}

export default function LineReact({ line }: LineProps) {
  const lineDOM = useRef<SVGSVGElement>(null);
  const [style, setStyle] = useState(
    "position: absolute; overflow: visible; pointer-events: none; will-change: transform; transform: translate3d(0px, 0px, 0);",
  );
  const [, setDx] = useState(0);
  const [, setDy] = useState(0);
  const [, setX0] = useState(line.transform.x);
  const [, setY0] = useState(line.transform.y);
  const [x1, setX1] = useState(0);
  const [y1, setY1] = useState(0);
  const [x2, setX2] = useState(0);
  const [y2, setY2] = useState(0);
  const [x3, setX3] = useState(0);
  const [y3, setY3] = useState(0);

  const renderLine = () => {
    const thisLine: LineComponent = line;
    const newX0 = thisLine.transform.x;
    const newY0 = thisLine.transform.y;
    setX0(newX0);
    setY0(newY0);
    setStyle(
      `position: absolute; overflow: visible; pointer-events: none; will-change: transform; transform: translate3d(${newX0}px, ${newY0}px, 0);`,
    );
    const newDx = thisLine.endWorldX - thisLine.transform.x;
    const newDy = thisLine.endWorldY - thisLine.transform.y;
    setDx(newDx);
    setDy(newDy);
    setX1(Math.abs(newDx / 2));
    setY1(0);
    setX2(newDx - Math.abs(newDx / 2));
    setY2(newDy);
    setX3(newDx);
    setY3(newDy);
  };

  useEffect(() => {
    if (lineDOM.current) {
      line.element = lineDOM.current as unknown as HTMLElement;
      line.callback.afterWrite2 = renderLine;
    }
  }, [line]);

  return (
    <svg
      data-snapline-type="connector-line"
      width="4"
      height="4"
      style={{ ...parseStyle(style), zIndex: 1000 }}
      ref={lineDOM}
    >
      <path
        className="sl-connector-line"
        d={`M 0,0 C ${x1}, ${y1} ${x2}, ${y2} ${x3}, ${y3}`}
        markerEnd="url(#arrow)"
        style={{
          fill: "none",
          stroke: "#545454",
          strokeWidth: 4,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
      <marker id="arrow" viewBox="0 0 24 24" refX="0" refY="12" orient="auto">
        <polygon points="4,4 20,12 4,22" fill="#545454" />
      </marker>
    </svg>
  );
}

// Helper function to parse CSS string to object
function parseStyle(styleString: string): React.CSSProperties {
  const styles: React.CSSProperties = {};
  styleString.split(";").forEach((style) => {
    const [key, value] = style.split(":").map((s) => s.trim());
    if (key && value) {
      // Convert kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      styles[camelKey as keyof React.CSSProperties] = value as any;
    }
  });
  return styles;
}
