import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ItemEuclidean as ItemEuclideanObject,
  ItemInsertion as ItemInsertionObject,
  ItemProgressive as ItemProgressiveObject,
  type ItemBase,
  type ItemSnapshotMetadata,
} from "@snap-engine/snapsort";
import { useSnapSortEngine } from "./Engine";
import { ContainerObjectContext } from "./Container";

type ItemObjectClass =
  | typeof ItemEuclideanObject
  | typeof ItemInsertionObject
  | typeof ItemProgressiveObject;

export const ItemObjectContext = createContext<ItemBase | null>(null);

export interface ItemProps {
  children: ReactNode;
  className?: string;
  itemObject?: ItemBase | null;
  metadata?: ItemSnapshotMetadata;
  style?: CSSProperties;
}

function createItemComponent(
  ItemClass: ItemObjectClass,
  algorithmClassName: string,
) {
  return forwardRef<ItemBase, ItemProps>(function SnapSortItem(
    { children, className = "", itemObject = null, metadata = {}, style },
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

    useImperativeHandle(ref, () => item, [item]);

    const setItemElement = useCallback(
      (element: HTMLDivElement | null) => {
        itemDomRef.current = element;
        if (element) {
          item.element = element;
        }
      },
      [item],
    );

    useEffect(() => {
      container?.addItem(item);
      return () => {
        if (ownsItemRef.current) {
          item.destroy();
        }
      };
    }, [container, item]);

    return (
      <ItemObjectContext.Provider value={item}>
        <div
          ref={setItemElement}
          className={`snapsort-item ${algorithmClassName} ${className}`.trim()}
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
      </ItemObjectContext.Provider>
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

export const ItemInsertion = createItemComponent(
  ItemInsertionObject,
  "snapsort-item-insertion",
);

export const Item = ItemEuclidean;
