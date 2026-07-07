import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ItemObjectContext } from "./Item";

export interface HandleProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const Handle = forwardRef<HTMLDivElement, HandleProps>(function Handle(
  { children, className = "", style },
  ref,
) {
  const item = useContext(ItemObjectContext);
  const handleRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => handleRef.current as HTMLDivElement, []);

  useEffect(() => {
    const handleElement = handleRef.current;
    if (!item || !handleElement) return;

    item.addInputAlias(handleElement);
    return () => {
      item.removeInputAlias(handleElement);
    };
  }, [item]);

  return (
    <div
      ref={handleRef}
      className={`snapsort-handle ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
});
