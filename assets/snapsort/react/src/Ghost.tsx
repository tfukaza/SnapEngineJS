import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from "react";
import type { GhostInsertEvent } from "@snap-engine/snapsort";

export interface GhostProps extends HTMLAttributes<HTMLDivElement> {
  event: GhostInsertEvent;
}

export const Ghost = forwardRef<HTMLDivElement, GhostProps>(function Ghost(
  { children, className = "", event, id = "spacer", style, ...divProps },
  ref,
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const original = event.original.dragSnapshot?.box ?? event.original.currentDomProperty;
  const ghostItem = event.ghostItem;
  const width = event.ghostRect?.width ?? original.width;
  const height = event.ghostRect?.height ?? original.height;

  useImperativeHandle(ref, () => elementRef.current as HTMLDivElement, []);

  const bindGhostElement = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element;
      if (element) {
        ghostItem.element = element;
      } else if (ghostItem.element) {
        ghostItem.destroyDom(false);
      }
    },
    [ghostItem],
  );

  return (
    <div
      {...divProps}
      id={id}
      className={className}
      data-snapsort-ghost-entry={event.kind}
      ref={bindGhostElement}
      style={{
        boxSizing: "border-box",
        height,
        margin: `${original.margin.top}px ${original.margin.right}px ${original.margin.bottom}px ${original.margin.left}px`,
        width,
        ...style,
      }}
    >
      {children}
    </div>
  );
});
