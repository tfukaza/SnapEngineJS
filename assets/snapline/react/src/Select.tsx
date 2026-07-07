import { useEffect, useRef, type CSSProperties } from "react";
import { RectSelectComponent } from "@snap-engine/snapline";
import { useSnapLineEngine } from "./Engine";

export interface SelectProps {
  className?: string;
  id?: string;
  style?: CSSProperties;
}

export function Select({
  className,
  id = "select-container",
  style,
}: SelectProps) {
  const engine = useSnapLineEngine();
  const selectDomRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<RectSelectComponent | null>(null);

  if (!selectRef.current) {
    selectRef.current = new RectSelectComponent(engine, null);
  }
  const select = selectRef.current;

  useEffect(() => {
    if (selectDomRef.current) {
      select.element = selectDomRef.current;
    }
    return () => {
      select.destroy();
    };
  }, [select]);

  return (
    <div
      id={id}
      ref={selectDomRef}
      className={className}
      data-snapline-type="selection"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.103)",
        height: 0,
        left: 0,
        position: "absolute",
        top: 0,
        width: 0,
        ...style,
      }}
    />
  );
}
