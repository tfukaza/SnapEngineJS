import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  Container as ContainerObject,
  type ContainerConfig,
  type Item,
} from "@snap-engine/snapsort";
import { flushSync } from "react-dom";
import { useSnapSortEngine } from "./Engine";
import { useSnapSortAwaitMutation } from "./useSnapSortAwaitMutation";

export const ContainerObjectContext = createContext<ContainerObject | null>(
  null,
);

export interface ContainerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  className?: string;
  config: ContainerConfig;
  containerObject?: ContainerObject | null;
  itemId?: string;
  locked?: boolean;
  /** Consumer-owned selection flag — see `Item.selected` in `@snap-engine/snapsort`. Only meaningful when `locked` is `false`. */
  selected?: boolean;
  metadata?: Record<string, unknown>;
}

export const Container = forwardRef<ContainerObject, ContainerProps>(
  function SnapSortContainer(
    {
      children,
      className = "",
      config,
      containerObject = null,
      itemId,
      locked = true,
      selected = false,
      metadata = {},
      style,
      ...divProps
    },
    ref,
  ) {
    const engine = useSnapSortEngine();
    const parentContainer = useContext(ContainerObjectContext);
    const containerDomRef = useRef<HTMLDivElement>(null);
    const ownsContainerRef = useRef(containerObject == null);
    const containerRef = useRef<ContainerObject | null>(containerObject);
    if (!containerRef.current) {
      containerRef.current = new ContainerObject(engine, parentContainer, {
        ...config,
      });
    }
    const container = containerRef.current;
    const resolvedItemId =
      itemId ?? (typeof metadata.itemId === "string" ? metadata.itemId : undefined);
    const direction = config.direction ?? "column";
    const mainAxisAlign = config.mainAxisAlign ?? "start";
    const flushCommittedMutation = useSnapSortAwaitMutation();
    const flushMutation = useCallback(
      (mutation: () => void) => {
        flushSync(mutation);
        // A state mutation can mount new Item/Container adapters. Flush once
        // more so their attachment effects run before core resumes its layout
        // reads, while remaining in the same pre-paint transaction.
        flushCommittedMutation();
      },
      [flushCommittedMutation],
    );
    container.itemId = resolvedItemId;
    container.locked = locked;
    container.selected = selected;
    container.metadata = metadata;
    container.config.mode = config.mode ?? container.config.mode;
    container.config.strategy = config.strategy ?? container.config.strategy;
    container.config.groupID = config.groupID ?? container.config.groupID;
    container.config.name = config.name ?? container.config.name;
    container.config.animation = config.animation ?? container.config.animation;
    container.config.disableFlip =
      config.disableFlip ?? container.config.disableFlip;
    container.config.callbacks = {
      ...container.config.callbacks,
      ...config.callbacks,
      // Commit the actual consumer mutation before SnapSort reads final
      // geometry and installs FLIP's inverse transform.
      flushMutation,
    };
    container.direction = direction;
    container.mainAxisAlign = mainAxisAlign;
    container.wrap = config.wrap ?? "auto";
    container.stretchItems = config.stretchItems ?? false;
    container.dropArea = config.dropArea ?? false;
    container.noDrop = config.noDrop ?? false;

    useImperativeHandle(ref, () => container, [container]);

    const setContainerElement = useCallback(
      (element: HTMLDivElement | null) => {
        containerDomRef.current = element;
        if (element) {
          container.element = element;
        }
      },
      [container],
    );

    useEffect(() => {
      if (parentContainer && container.parent !== parentContainer) {
        parentContainer.addItem(container as unknown as Item);
      }
      return () => {
        if (ownsContainerRef.current) {
          container.destroy();
        }
      };
    }, [container, parentContainer]);

    return (
      <ContainerObjectContext.Provider value={container}>
        <div
          {...divProps}
          ref={setContainerElement}
          className={`snapsort-container snapsort-mode-${container.mode} ${className}`.trim()}
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: direction,
            flexWrap: "wrap",
            justifyContent:
              mainAxisAlign === "center" ? "center" : "flex-start",
            position: "relative",
            ...style,
          }}
        >
          {children}
        </div>
      </ContainerObjectContext.Provider>
    );
  },
);
