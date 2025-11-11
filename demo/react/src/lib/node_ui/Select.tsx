import { useContext, useEffect, useRef } from "react";
import { RectSelectComponent } from "../../../../../src/index";
import { EngineContext } from "../Canvas";

export default function SelectReact() {
  const engine = useContext(EngineContext);
  const selectDOM = useRef<HTMLDivElement>(null);
  const selectRef = useRef<RectSelectComponent | null>(null);

  useEffect(() => {
    if (!engine) {
      console.warn("Select: No engine found in context");
      return;
    }

    selectRef.current = new RectSelectComponent(engine.global, null);

    if (selectDOM.current) {
      selectRef.current.element = selectDOM.current;
    }

    return () => {
      // Cleanup if needed
      selectRef.current = null;
    };
  }, [engine]);

  return (
    <div
      id="select-container"
      ref={selectDOM}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        backgroundColor: "rgba(0, 0, 0, 0.103)",
      }}
    />
  );
}
