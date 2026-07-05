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
  Item as ItemObject,
  type ItemSnapshotMetadata,
} from "@snap-engine/snapsort";
import { useSnapSortEngine } from "./Engine";
import { ContainerObjectContext } from "./Container";

export const ItemObjectContext = createContext<ItemObject | null>(null);

export interface ItemProps {
  children: ReactNode;
  className?: string;
  itemObject?: ItemObject | null;
  metadata?: ItemSnapshotMetadata;
  style?: CSSProperties;
}

export const Item = forwardRef<ItemObject, ItemProps>(function SnapSortItem(
  { children, className = "", itemObject = null, metadata = {}, style },
  ref,
) {
  const engine = useSnapSortEngine();
  const container = useContext(ContainerObjectContext);
  const itemDomRef = useRef<HTMLDivElement>(null);
  const ownsItemRef = useRef(itemObject == null);
  const itemRef = useRef<ItemObject | null>(itemObject);
  if (!itemRef.current) {
    itemRef.current = new ItemObject(engine, null);
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
        className={`snapsort-item ${className}`.trim()}
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
