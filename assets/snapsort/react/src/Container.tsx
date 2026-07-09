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
  Container as ContainerObject,
  type ContainerCallbacks,
  type ContainerConfig,
  type Item,
} from "@snap-engine/snapsort";
import { flushSync } from "react-dom";
import { useSnapSortEngine } from "./Engine";
import { useSnapSortAwaitMutation } from "./useSnapSortAwaitMutation";

export const ContainerObjectContext = createContext<ContainerObject | null>(
  null,
);

export interface ContainerProps {
  children?: ReactNode;
  className?: string;
  config: ContainerConfig;
  containerObject?: ContainerObject | null;
  locked?: boolean;
  /** Consumer-owned selection flag — see `Item.selected` in `@snap-engine/snapsort`. Only meaningful when `locked` is `false`. */
  selected?: boolean;
  metadata?: Record<string, unknown>;
  style?: CSSProperties;
}

/**
 * Wrap the callbacks whose only job is to notify/mutate (no synchronous
 * return value the caller depends on) in flushSync, so a consumer's React
 * state update is committed before SnapSort reads DOM geometry for FLIP.
 * `onDragStart` (can veto by returning `false`), `canDrop` (returns a
 * boolean), and `createGhost` (returns an element) all need their return
 * value read synchronously and are deliberately left unwrapped — and are
 * called far more often per drag, so forcing a React flush on every call
 * would be wasteful.
 */
function wrapReactMutationCallbacks(
  callbacks: ContainerCallbacks | undefined,
): ContainerCallbacks {
  if (!callbacks) return {};

  const wrappedCallbacks: ContainerCallbacks = { ...callbacks };
  if (callbacks.onItemMove) {
    wrappedCallbacks.onItemMove = (event) => {
      flushSync(() => callbacks.onItemMove?.(event));
    };
  }
  if (callbacks.onItemInsert) {
    wrappedCallbacks.onItemInsert = (event) => {
      flushSync(() => callbacks.onItemInsert?.(event));
    };
  }
  if (callbacks.onItemRemove) {
    wrappedCallbacks.onItemRemove = (event) => {
      flushSync(() => callbacks.onItemRemove?.(event));
    };
  }
  if (callbacks.onGhostInsert) {
    wrappedCallbacks.onGhostInsert = (event) => {
      flushSync(() => callbacks.onGhostInsert?.(event));
    };
  }
  if (callbacks.onGhostRemove) {
    wrappedCallbacks.onGhostRemove = (event) => {
      flushSync(() => callbacks.onGhostRemove?.(event));
    };
  }
  if (callbacks.onDragEnd) {
    wrappedCallbacks.onDragEnd = (event) => {
      flushSync(() => callbacks.onDragEnd?.(event));
    };
  }
  if (callbacks.onDropTargetChange) {
    wrappedCallbacks.onDropTargetChange = (event) => {
      flushSync(() => callbacks.onDropTargetChange?.(event));
    };
  }
  return wrappedCallbacks;
}

export const Container = forwardRef<ContainerObject, ContainerProps>(
  function SnapSortContainer(
    {
      children,
      className = "",
      config,
      containerObject = null,
      locked = true,
      selected = false,
      metadata = {},
      style,
    },
    ref,
  ) {
    const engine = useSnapSortEngine();
    const parentContainer = useContext(ContainerObjectContext);
    const containerDomRef = useRef<HTMLDivElement>(null);
    const ownsContainerRef = useRef(containerObject == null);
    const containerRef = useRef<ContainerObject | null>(containerObject);
    if (!containerRef.current) {
      containerRef.current = new ContainerObject(engine, null, { ...config });
    }
    const container = containerRef.current;
    const direction = config.direction ?? "column";
    const mainAxisAlign = config.mainAxisAlign ?? "start";
    const defaultAwaitMutation = useSnapSortAwaitMutation();
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
      ...wrapReactMutationCallbacks(config.callbacks),
      awaitMutation: config.callbacks?.awaitMutation ?? defaultAwaitMutation,
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
      parentContainer?.addItem(container as unknown as Item);
      return () => {
        if (ownsContainerRef.current) {
          container.destroy();
        }
      };
    }, [container, parentContainer]);

    return (
      <ContainerObjectContext.Provider value={container}>
        <div
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
