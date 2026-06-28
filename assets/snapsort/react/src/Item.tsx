import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ItemEuclidean as ItemEuclideanObject,
  ItemProgressive as ItemProgressiveObject,
  type ItemBase,
  type ItemMetadata,
} from "@snap-engine/snapsort";
import { useSnapSortEngine } from "./Engine";
import { ContainerObjectContext } from "./Container";

type ItemObjectClass = typeof ItemEuclideanObject | typeof ItemProgressiveObject;

export interface ItemProps {
  children: ReactNode;
  className?: string;
  itemObject?: ItemBase | null;
  metadata?: ItemMetadata;
  style?: CSSProperties;
}

function createItemComponent(
  ItemClass: ItemObjectClass,
  algorithmClassName: string,
) {
  return forwardRef<ItemBase, ItemProps>(function SnapSortItem(
    {
      children,
      className = "",
      itemObject = null,
      metadata = {},
      style,
    },
    ref,
  ) {
    const engine = useSnapSortEngine();
    const container = useContext(ContainerObjectContext);
    const itemDomRef = useRef<HTMLDivElement>(null);
    const ownsItemRef = useRef(itemObject == null);
    const itemRef = useRef<ItemBase | null>(itemObject);
    if (!itemRef.current) {
      itemRef.current = new ItemClass(engine, null);
    }
    const item = itemRef.current;
    item.metadata = metadata;
    const itemKey = metadata.itemId ?? null;

    useImperativeHandle(ref, () => item, [item]);

    useEffect(() => {
      if (itemDomRef.current) {
        item.element = itemDomRef.current;
      }
      container?.addItem(item);
      return () => {
        if (ownsItemRef.current) {
          item.destroy();
        }
      };
    }, [container, item]);

    return (
      <div
        ref={itemDomRef}
        className={`snapsort-item ${algorithmClassName} ${className}`.trim()}
        data-snapsort-item-key={itemKey ?? undefined}
        style={{
          alignItems: "center",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 4,
          ...style,
        }}
      >
        {children}
      </div>
    );
  });
}

export const ItemEuclidean = createItemComponent(
  ItemEuclideanObject,
  "snapsort-item-euclidean",
);

export const ItemProgressive = createItemComponent(
  ItemProgressiveObject,
  "snapsort-item-progressive",
);

export const Item = ItemEuclidean;
