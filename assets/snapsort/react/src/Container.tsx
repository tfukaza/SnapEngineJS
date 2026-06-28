import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ContainerEuclidean as ContainerEuclideanObject,
  ContainerProgressive as ContainerProgressiveObject,
  type ContainerBase,
  type ContainerConfig,
  type ItemBase,
} from "@snap-engine/snapsort";
import { useSnapSortEngine } from "./Engine";

type ContainerObjectClass =
  | typeof ContainerEuclideanObject
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
    container.locked = locked;
    container.metadata = metadata;
    if (config.direction) {
      container.direction = config.direction;
    }
    if (config.mainAxisAlign) {
      container.mainAxisAlign = config.mainAxisAlign;
    }
    if (config.dropArea !== undefined) {
      container.dropArea = config.dropArea;
    }
    if (config.noDrop !== undefined) {
      container.noDrop = config.noDrop;
    }

    useImperativeHandle(ref, () => container, [container]);

    useEffect(() => {
      if (containerDomRef.current) {
        container.element = containerDomRef.current;
      }
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
          ref={containerDomRef}
          className={`snapsort-container ${algorithmClassName} ${className}`.trim()}
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: config.direction,
            flexWrap: "wrap",
            justifyContent:
              config.mainAxisAlign === "center" ? "center" : "flex-start",
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

export const Container = ContainerEuclidean;
