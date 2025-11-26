import { TransformProperty } from "./object";

/**
 * Retrieves the position and dimensions of a DOM element in multiple coordinate spaces.
 *
 * Returns coordinates in world space (accounting for camera transform), camera space,
 * and screen space, along with transformed dimensions.
 *
 * @param engine - The engine instance containing camera information.
 * @param dom - The HTML element to measure.
 * @returns An object containing position and size in various coordinate systems.
 *
 * @example
 * ```typescript
 * const props = getDomProperty(engine, myElement);
 * console.log(props.x, props.y); // World coordinates
 * console.log(props.screenX, props.screenY); // Screen coordinates
 * ```
 */
function getDomProperty(engine: any, dom: HTMLElement) {
  const rect = dom.getBoundingClientRect();
  if (engine.camera == null) {
    return {
      height: rect.height,
      width: rect.width,
      x: rect.left,
      y: rect.top,
      cameraX: rect.left,
      cameraY: rect.top,
      screenX: rect.left,
      screenY: rect.top,
    };
  }
  const [cameraX, cameraY] = engine.camera.getCameraFromScreen(
    rect.left,
    rect.top,
  );
  const [worldX, worldY] = engine.camera.getWorldFromCamera(cameraX, cameraY);
  const [cameraWidth, cameraHeight] =
    engine.camera.getCameraDeltaFromWorldDelta(rect.width, rect.height);
  const [worldWidth, worldHeight] = engine.camera.getWorldDeltaFromCameraDelta(
    cameraWidth,
    cameraHeight,
  );

  return {
    height: worldHeight,
    width: worldWidth,
    x: worldX,
    y: worldY,
    cameraX: cameraX,
    cameraY: cameraY,
    screenX: rect.left,
    screenY: rect.top,
  };
}

/**
 * Converts a transform object into a CSS transform string.
 *
 * Generates a translate3d and scale transformation for hardware acceleration.
 *
 * @param transform - The transform properties to convert.
 * @returns A CSS transform string.
 *
 * @example
 * ```typescript
 * const transform = { x: 10, y: 20, scaleX: 1.5, scaleY: 1.5 };
 * const css = generateTransformString(transform);
 * // Returns: "translate3d(10px, 20px, 0px) scale(1.5, 1.5) "
 * ```
 */
function generateTransformString(transform: TransformProperty) {
  const string = `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scaleX}, ${transform.scaleY}) `;
  return string;
}

/**
 * Parses a CSS transform string to extract position values.
 *
 * @param transform - A CSS transform string to parse.
 * @returns An object with x and y coordinates.
 *
 * @example
 * ```typescript
 * const result = parseTransformString("translate3d(10px, 20px, 0px)");
 * // Returns: { x: 10, y: 20 }
 * ```
 */
function parseTransformString(transform: string) {
  const transformValues = transform.split("(")[1].split(")")[0].split(",");
  return {
    x: parseFloat(transformValues[0]),
    y: parseFloat(transformValues[1]),
    scaleX: parseFloat(transformValues[3]) || 1,
    scaleY: parseFloat(transformValues[4]) || 1,
  };
}

/**
 * Converts a string from camelCase to kebab-case.
 * @param str The string to be converted.
 * @returns The converted string.
 */
function camelCaseToKebab(str: string) {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function getDomStyle(dom: HTMLElement | SVGElement) {
  const existingStyleString = dom.style.cssText;
  if (existingStyleString == "") {
    return {};
  }
  return existingStyleString
    .split(";")
    .map((item) => {
      const [key, value] = item.split(":");
      return { [key]: value };
    })
    .reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});
}

/**
 * Applies CSS styles to a DOM element.
 *
 * @param dom - The HTML or SVG element to style.
 * @param style - An object containing CSS property-value pairs.
 *
 * @example
 * ```typescript
 * setDomStyle(element, { color: 'red', fontSize: '16px' });
 * ```
 */
function setDomStyle(
  dom: HTMLElement | SVGElement,
  style: { [key: string]: string },
) {
  Object.assign(dom.style, style);
}

interface CallbackInterface extends Record<KeyType, Function | null> {}

/**
 * Creates a proxy for event callbacks that automatically binds them to an object.
 *
 * When a callback function is assigned to the proxy, it's automatically bound to the
 * specified object, ensuring the correct `this` context during event handling.
 *
 * @param object - The object to bind callbacks to.
 * @param dict - The callback dictionary to proxy.
 * @param secondary - Optional secondary callback dictionary for fallback.
 * @returns A proxy that handles callback binding automatically.
 *
 * @example
 * ```typescript
 * const callbacks = { onClick: null };
 * const proxy = EventProxyFactory(myObject, callbacks);
 * proxy.onClick = function() { console.log(this); }; // Automatically bound to myObject
 * ```
 */
function EventProxyFactory<BindObject, Callback extends object>(
  object: BindObject,
  dict: Callback,
  secondary: Callback | null = null,
): Callback {
  return new Proxy(dict, {
    set: (
      target: Callback,
      prop: keyof Callback & KeyType,
      value: Function | null,
    ) => {
      if (value == null) {
        target[prop] = null as any;
      } else {
        target[prop] = value.bind(object);
      }
      return true;
    },
    get: (
      target: Callback & CallbackInterface,
      prop: keyof Callback & KeyType,
    ) => {
      // console.log(
      //   object,
      //   "target[prop]",
      //   target[prop],
      //   "secondary[prop]",
      //   secondary?.[prop],
      // );
      // console.trace();
      return (...args: any[]) => {
        // if (target[prop] != null && typeof target[prop] === "function") {
        //   console.log("target[prop]", target[prop]);
        // }
        // console.log("target[prop]", target[prop]);
        // console.log("secondary[prop]", secondary?.[prop]);
        // console.trace();
        target[prop]?.(...args);
        (secondary as Callback & CallbackInterface)?.[prop]?.(...args);
      };
    },
  });
}

export {
  setDomStyle,
  EventProxyFactory,
  getDomProperty,
  generateTransformString,
  parseTransformString,
};
