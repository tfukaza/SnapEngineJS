import type { Engine } from "./engine";

export type KeyframeList = Record<string, PropertyIndexedKeyframes[string]>;

const INITIAL_VARIABLE_CHANNEL_COUNT = 2;
const VARIABLE_CHANNEL_GROWTH_FACTOR = 2;
const VARIABLE_CHANNEL_PREFIX = "--snap-var-";

const registeredCustomProperties = new Set<string>();
const variableChannelPools = new WeakMap<Element, VariableChannelPool>();
let sharedAnimationTarget: HTMLDivElement | null = null;

interface VariableChannel {
  id: number;
  propertyName: string;
}

interface VariableChannelPool {
  channels: VariableChannel[];
  freeChannels: VariableChannel[];
}

interface CssPropertyRegistry {
  registerProperty?: (property: {
    name: string;
    syntax: string;
    inherits: boolean;
    initialValue: string;
  }) => void;
}

function styleSharedAnimationTarget(target: HTMLElement) {
  target.style.position = "absolute";
  target.style.width = "0";
  target.style.height = "0";
  target.style.overflow = "hidden";
  target.style.opacity = "0";
  target.style.pointerEvents = "none";
}

function getSharedAnimationTarget(engine?: Engine): HTMLElement {
  if (engine?.containerElement) {
    return engine.containerElement;
  }

  if (!sharedAnimationTarget) {
    sharedAnimationTarget = document.createElement("div");
    styleSharedAnimationTarget(sharedAnimationTarget);
    document.body.appendChild(sharedAnimationTarget);
  }
  return sharedAnimationTarget;
}

function registerNumericCustomProperty(name: string): void {
  if (registeredCustomProperties.has(name)) {
    return;
  }

  const css = globalThis.CSS as CssPropertyRegistry | undefined;
  if (!css?.registerProperty) {
    throw new Error(
      "CSS.registerProperty is required to animate custom variables.",
    );
  }

  try {
    css.registerProperty({
      name,
      syntax: "<number>",
      inherits: false,
      initialValue: "0",
    });
  } catch (error) {
    if ((error as { name?: string }).name !== "InvalidModificationError") {
      throw new Error(`Failed to register animation variable ${name}.`);
    }
  }

  registeredCustomProperties.add(name);
}

function getVariableChannelPool(target: Element): VariableChannelPool {
  let pool = variableChannelPools.get(target);
  if (!pool) {
    pool = {
      channels: [],
      freeChannels: [],
    };
    variableChannelPools.set(target, pool);
  }
  return pool;
}

function createVariableChannel(pool: VariableChannelPool): VariableChannel {
  const id = pool.channels.length;
  const channel = {
    id,
    propertyName: `${VARIABLE_CHANNEL_PREFIX}${id}`,
  };
  registerNumericCustomProperty(channel.propertyName);
  pool.channels.push(channel);
  pool.freeChannels.unshift(channel);
  return channel;
}

function growVariableChannelPool(
  pool: VariableChannelPool,
  requiredFreeCount: number,
) {
  const currentCapacity = pool.channels.length;
  let nextCapacity =
    currentCapacity === 0 ? INITIAL_VARIABLE_CHANNEL_COUNT : currentCapacity;

  while (nextCapacity - currentCapacity < requiredFreeCount) {
    nextCapacity *= VARIABLE_CHANNEL_GROWTH_FACTOR;
  }

  while (pool.channels.length < nextCapacity) {
    createVariableChannel(pool);
  }
}

function acquireVariableChannels(
  target: Element,
  count: number,
): VariableChannel[] {
  if (count === 0) {
    return [];
  }

  const pool = getVariableChannelPool(target);

  if (pool.freeChannels.length < count) {
    growVariableChannelPool(pool, count - pool.freeChannels.length);
  }

  const channels: VariableChannel[] = [];
  for (let i = 0; i < count; i++) {
    const channel = pool.freeChannels.pop();
    if (!channel) {
      throw new Error("Failed to acquire animation variable channel.");
    }
    channels.push(channel);
  }
  return channels;
}

function releaseVariableChannels(target: Element, channels: VariableChannel[]) {
  const pool = getVariableChannelPool(target);
  const style = (target as Element & { style?: CSSStyleDeclaration }).style;
  for (const channel of channels) {
    // A non-persistent animation commits its final styles before releasing its
    // channels. Clear the internal property so the next animation that
    // acquires this channel cannot sample that terminal value while its new
    // Web Animation is still pending.
    style?.removeProperty(channel.propertyName);
    pool.freeChannels.push(channel);
  }
}

export interface KeyframeProperty {
  offset?: (number | string)[];
  easing?: string | string[];
  duration?: number | number[];
  delay?: number;
  tick?: (value: Record<string, number>) => void;
  start?: () => void;
  finish?: () => void;
  persist?: boolean;
}

export interface keyframeProperty extends KeyframeProperty {}

export interface AnimationInterface {
  play(): void;
  pause(): void;
  cancel(): void;
  reverse(): void;
  calculateFrame(currentTime: number): boolean;
  currentTime: number;
  progress: number;
  requestDelete: boolean;
}

interface NormalizedKeyframeProperty {
  offset: number[];
  easing: string[];
  duration: number[];
  totalDuration: number;
  delay: number;
  tick?: (value: Record<string, number>) => void;
  start?: () => void;
  finish?: () => void;
  persist: boolean;
  hasExplicitOffset: boolean;
}

interface KeyframeBuildResult {
  cssKeyframe: PropertyIndexedKeyframes;
  variableProperties: Record<string, string>;
  variableChannels: VariableChannel[];
  hasVariable: boolean;
}

const DEFAULT_KEYFRAME_PROPERTY = {
  duration: 1000,
  delay: 0,
  easing: "linear",
  persist: false,
} as const;

function getKeyframeCount(keyframe: KeyframeList): number {
  let count = 0;
  for (const value of Object.values(keyframe)) {
    count = Math.max(count, Array.isArray(value) ? value.length : 1);
  }
  return count;
}

function createDefaultOffsets(keyframeCount: number): number[] {
  if (keyframeCount <= 1) {
    return [0];
  }

  const offsets: number[] = [];
  for (let i = 0; i < keyframeCount; i++) {
    offsets.push(i / (keyframeCount - 1));
  }
  return offsets;
}

function normalizeOffset(offset: number | string): number {
  if (typeof offset === "number") {
    return offset;
  }

  const value = Number.parseFloat(offset);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid animation offset: ${offset}`);
  }
  return offset.trim().endsWith("%") ? value / 100 : value;
}

function normalizeList<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? [...value] : [value];
}

function normalizeKeyframeProperty(
  keyframe: KeyframeList,
  property: KeyframeProperty,
): NormalizedKeyframeProperty {
  const hasExplicitOffset = property.offset != null;
  const offset = hasExplicitOffset
    ? property.offset!.map(normalizeOffset)
    : createDefaultOffsets(getKeyframeCount(keyframe));
  const easing = normalizeList(
    property.easing ?? DEFAULT_KEYFRAME_PROPERTY.easing,
  );
  const duration = normalizeList(
    property.duration ?? DEFAULT_KEYFRAME_PROPERTY.duration,
  );
  const totalDuration = duration.reduce((sum, value) => sum + value, 0);
  const desiredEasingLength = Math.max(1, offset.length - 1);

  if (easing.length < desiredEasingLength) {
    const lastEasing =
      easing[easing.length - 1] ?? DEFAULT_KEYFRAME_PROPERTY.easing;
    while (easing.length < desiredEasingLength) {
      easing.push(lastEasing);
    }
  }

  return {
    offset,
    easing,
    duration,
    totalDuration,
    delay: property.delay ?? DEFAULT_KEYFRAME_PROPERTY.delay,
    tick: property.tick,
    start: property.start,
    finish: property.finish,
    persist: property.persist ?? DEFAULT_KEYFRAME_PROPERTY.persist,
    hasExplicitOffset,
  };
}

function normalizeVariableValues(
  value: PropertyIndexedKeyframes[string],
  length: number,
): number[] {
  const values = Array.isArray(value) ? value : [value];
  const numbers = values.map((entry) => Number(entry ?? 0));
  const last = numbers[numbers.length - 1] ?? 0;
  while (numbers.length < length) {
    numbers.push(last);
  }
  return numbers;
}

function createKeyframeBuildResult(
  target: Element,
  keyframe: KeyframeList,
  keyframeLength: number,
): KeyframeBuildResult {
  const cssKeyframe: KeyframeList = {};
  const variables: Record<string, number[]> = {};
  const variableProperties: Record<string, string> = {};
  const variableEntries = Object.entries(keyframe).filter(([key]) =>
    key.startsWith("$"),
  );
  const variableChannels = acquireVariableChannels(
    target,
    variableEntries.length,
  );
  let variableIndex = 0;

  try {
    for (const [key, value] of Object.entries(keyframe)) {
      if (!key.startsWith("$")) {
        cssKeyframe[key] = value;
        continue;
      }

      const channel = variableChannels[variableIndex];
      variableIndex++;
      variables[key] = normalizeVariableValues(value, keyframeLength);
      variableProperties[key] = channel.propertyName;
      cssKeyframe[channel.propertyName] = variables[key].map(String);

      // play() can leave a Web Animation pending until the browser's next
      // animation update. AnimationObject may still be sampled in the same
      // SnapEngine frame, so give the channel a deterministic starting value
      // instead of exposing a value committed by its previous owner.
      const style = (target as Element & { style?: CSSStyleDeclaration }).style;
      style?.setProperty(channel.propertyName, String(variables[key][0] ?? 0));
    }
  } catch (error) {
    releaseVariableChannels(target, variableChannels);
    throw error;
  }

  return {
    cssKeyframe: cssKeyframe as PropertyIndexedKeyframes,
    variableProperties,
    variableChannels,
    hasVariable: Object.keys(variables).length > 0,
  };
}

/**
 * Wrapper around the Web Animations API with support for custom variables.
 *
 * Provides keyframe-based animations for CSS properties and custom variables (prefixed with $).
 * Custom variables are useful for animating non-CSS properties via the tick callback.
 *
 * Features:
 * - CSS property animations
 * - Custom variable animations (e.g., $value, $progress)
 * - Per-keyframe easing functions
 * - Callbacks on each frame and completion
 */
class AnimationObject implements AnimationInterface {
  #target: Element;
  #keyframe: KeyframeList;
  #property: NormalizedKeyframeProperty;
  #variableProperties: Record<string, string>;
  #variableChannels: VariableChannel[];
  #animation: Animation;
  #hasVariable: boolean;
  requestDelete: boolean;

  constructor(
    target: Element | null,
    keyframe: KeyframeList,
    property?: KeyframeProperty,
    engine?: Engine,
  );
  constructor(
    target: Element | null,
    keyframe: KeyframeList,
    property: KeyframeProperty = {},
    engine?: Engine,
  ) {
    this.#target = target ?? getSharedAnimationTarget(engine);
    this.#keyframe = keyframe;
    this.#property = normalizeKeyframeProperty(keyframe, property);

    const keyframeBuild = createKeyframeBuildResult(
      this.#target,
      this.#keyframe,
      this.#property.offset.length,
    );
    const cssKeyframe = keyframeBuild.cssKeyframe;
    this.#variableProperties = keyframeBuild.variableProperties;
    this.#variableChannels = keyframeBuild.variableChannels;
    this.#hasVariable = keyframeBuild.hasVariable;

    try {
      if (this.#property.hasExplicitOffset) {
        cssKeyframe.offset = this.#property.offset;
      }

      const animationProperty: KeyframeEffectOptions = {
        delay: this.#property.delay,
        fill: "both",
      };

      if (this.#property.duration.length > 1) {
        cssKeyframe.duration = this.#property.duration;
      } else {
        animationProperty.duration = this.#property.duration[0];
      }

      if (this.#property.easing.length > 1) {
        cssKeyframe.easing = this.#property.easing;
      } else {
        animationProperty.easing = this.#property.easing[0];
      }

      this.#animation = new Animation(
        new KeyframeEffect(this.#target, cssKeyframe, animationProperty),
      );
    } catch (error) {
      this.#releaseVariableChannels();
      throw error;
    }
    this.requestDelete = false;
    this.#animation.onfinish = () => {
      this.#property.finish?.();
      this.#commitStyles();
      if (this.#property.persist) {
        this.#animation.pause();
      } else {
        this.#animation.cancel();
        this.#releaseVariableChannels();
        this.requestDelete = true;
      }
    };
  }

  pause() {
    this.#animation.pause();
  }

  play() {
    this.#animation.play();
    this.#property.start?.();
  }

  cancel() {
    this.#animation.cancel();
    this.#releaseVariableChannels();
    this.requestDelete = true;
  }

  reverse() {
    this.#animation.reverse();
  }

  calculateFrame(_: number): boolean {
    const alpha = this.#animation.effect!.getComputedTiming().progress;
    if (alpha == null) {
      return false;
    }
    if (this.#hasVariable) {
      this.#property.tick?.(this.#calculateVariableValues(alpha));
    } else {
      this.#property.tick?.({});
    }
    return false;
  }

  #calculateVariableValues(_: number): Record<string, number> {
    // This design triggers a getComputedStyle call
    // for every frame for every variable, but according to Chrome DevTools benchmark,
    // on a low end mobile device it only had ~9ms overhead per frame.
    // For most practical purposes this approach is acceptable,
    // arguably even preferable since we can take advantage of browser
    // animation APIs.
    const style = getComputedStyle(this.#target);
    const values: Record<string, number> = {};
    for (const [key, propertyName] of Object.entries(
      this.#variableProperties,
    )) {
      values[key] = Number(style.getPropertyValue(propertyName));
    }
    return values;
  }

  #commitStyles() {
    try {
      this.#animation.commitStyles();
    } catch {
      // Ignore error
    }
  }

  #releaseVariableChannels() {
    if (this.#variableChannels.length > 0) {
      releaseVariableChannels(this.#target, this.#variableChannels);
      this.#variableChannels = [];
    }
  }

  get currentTime(): number {
    return Number(this.#animation.currentTime ?? 0);
  }

  set currentTime(time: number) {
    this.#animation.currentTime = time;
  }

  get progress(): number {
    return this.#animation.effect!.getComputedTiming().progress ?? 0;
  }

  set progress(progress: number) {
    this.currentTime =
      (this.#property.totalDuration + this.#property.delay) * progress;
  }
}

/**
 * Container for managing multiple animations as a sequence.
 *
 * Allows grouping multiple AnimationObject instances to control them together.
 * All animations in the sequence share the same playback state.
 */
class SequenceObject implements AnimationInterface {
  #animations: AnimationInterface[];

  requestDelete: boolean;

  constructor() {
    this.#animations = [];
    this.requestDelete = false;
  }

  add(animation: AnimationInterface) {
    this.#animations.push(animation);
  }

  play() {
    for (const animation of this.#animations) {
      animation.play();
    }
  }

  pause() {
    for (const animation of this.#animations) {
      animation.pause();
    }
  }

  cancel() {
    for (const animation of this.#animations) {
      animation.cancel();
    }
    this.requestDelete = true;
  }

  reverse() {
    for (const animation of this.#animations) {
      animation.reverse();
    }
  }

  calculateFrame(currentTime: number): boolean {
    let result = false;
    for (const animation of this.#animations) {
      result = animation.calculateFrame(currentTime) || result;
    }
    return result;
  }

  get currentTime(): number {
    return this.#animations[0]?.currentTime ?? 0;
  }

  set currentTime(time: number) {
    for (const animation of this.#animations) {
      animation.currentTime = time;
    }
  }

  get progress(): number {
    return this.#animations[0]?.progress ?? 0;
  }

  set progress(progress: number) {
    for (const animation of this.#animations) {
      animation.progress = progress;
    }
  }
}

export { AnimationObject, SequenceObject };
