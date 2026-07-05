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
  ContainerEuclidean as ContainerEuclideanObject,
  ContainerInsertion as ContainerInsertionObject,
  ContainerProgressive as ContainerProgressiveObject,
  type ContainerBase,
  type ContainerCallbacks,
  type ContainerConfig,
  type ItemBase,
} from "@snap-engine/snapsort";
import { flushSync } from "react-dom";
import { useSnapSortEngine } from "./Engine";
import { useSnapSortAwaitMutation } from "./useSnapSortAwaitMutation";

type ContainerObjectClass =
  | typeof ContainerEuclideanObject
  | typeof ContainerInsertionObject
  | typeof ContainerProgressiveObject;

export const ContainerObjectContext = createContext<ContainerBase | null>(null);

export interface ContainerProps {
  children?: ReactNode;
  className?: string;
  config: ContainerConfig;
  containerObject?: ContainerBase | null;
  locked?: boolean;
  metadata?: Record<string, unknown>;
  style?: CSSProperties;
}

function wrapReactMutationCallbacks(
  callbacks: ContainerCallbacks | undefined,
): ContainerCallbacks {
  if (!callbacks) return {};

  const wrappedCallbacks: ContainerCallbacks = { ...callbacks };
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
  return wrappedCallbacks;
}

function createContainerComponent(
  ContainerClass: ContainerObjectClass,
  algorithmClassName: string,
) {
  return forwardRef<ContainerBase, ContainerProps>(function SnapSortContainer(
    {
      children,
      className = "",
      config,
      containerObject = null,
      locked = true,
      metadata = {},
      style,
    },
    ref,
  ) {
    const engine = useSnapSortEngine();
    const parentContainer = useContext(ContainerObjectContext);
    const containerDomRef = useRef<HTMLDivElement>(null);
    const ownsContainerRef = useRef(containerObject == null);
    const containerRef = useRef<ContainerBase | null>(containerObject);
    if (!containerRef.current) {
      containerRef.current = new ContainerClass(engine, null, { ...config });
    }
    const container = containerRef.current;
    const direction = config.direction ?? "column";
    const mainAxisAlign = config.mainAxisAlign ?? "start";
    const defaultAwaitMutation = useSnapSortAwaitMutation();
    container.locked = locked;
    container.metadata = metadata;
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
      parentContainer?.addItem(container as unknown as ItemBase);
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
          className={`snapsort-container ${algorithmClassName} ${className}`.trim()}
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
  });
}

export const ContainerEuclidean = createContainerComponent(
  ContainerEuclideanObject,
  "snapsort-container-euclidean",
);

export const ContainerProgressive = createContainerComponent(
  ContainerProgressiveObject,
  "snapsort-container-progressive",
);

export const ContainerInsertion = createContainerComponent(
  ContainerInsertionObject,
  "snapsort-container-insertion",
);

export const Container = ContainerEuclidean;
