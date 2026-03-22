export declare interface AnimationInterface {
    play(): void;
    pause(): void;
    cancel(): void;
    reverse(): void;
    calculateFrame(currentTime: number): boolean;
    currentTime: number;
    progress: number;
    requestDelete: boolean;
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
 *
 * @example
 * ```typescript
 * // Animate CSS properties
 * const anim = new AnimationObject(element,
 *   { x: [0, 100], opacity: [1, 0] },
 *   { duration: 1000, easing: 'ease-in-out' }
 * );
 *
 * // Animate custom variables
 * const anim = new AnimationObject(null,
 *   { $value: [0, 100] },
 *   {
 *     duration: 1000,
 *     tick: (vars) => console.log(vars.$value)
 *   }
 * );
 * ```
 */
export declare class AnimationObject implements AnimationInterface {
    #private;
    target: Element;
    keyframe: keyframeList;
    property: keyframeProperty;
    requestDelete: boolean;
    constructor(target: Element | null, keyframe: keyframeList, property: keyframeProperty);
    pause(): void;
    play(): void;
    cancel(): void;
    reverse(): void;
    calculateFrame(_: number): boolean;
    finish(): void;
    set currentTime(time: number);
    set progress(progress: number);
}

declare type cssValue = string | number | string[] | (number | null)[] | null | undefined;

export declare type keyframeList = Record<string, cssValue>;

export declare interface keyframeProperty {
    offset?: (number | string)[];
    easing?: string | string[];
    duration?: number;
    delay?: number;
    tick?: (value: Record<string, number>) => void;
    finish?: () => void;
    persist?: boolean;
}

/**
 * Container for managing multiple animations as a sequence.
 *
 * Allows grouping multiple AnimationObject instances to control them together.
 * All animations in the sequence share the same playback state.
 *
 * @example
 * ```typescript
 * const sequence = new SequenceObject();
 * sequence.add(new AnimationObject(elem1, { x: [0, 100] }, { duration: 1000 }));
 * sequence.add(new AnimationObject(elem2, { y: [0, 100] }, { duration: 1000 }));
 * sequence.play();
 * ```
 */
export declare class SequenceObject implements AnimationInterface {
    animations: AnimationInterface[];
    startTime: number;
    endTime: number;
    expired: boolean;
    requestDelete: boolean;
    constructor();
    add(animation: AnimationInterface): void;
    play(): void;
    pause(): void;
    cancel(): void;
    reverse(): void;
    calculateFrame(currentTime: number): boolean;
    set currentTime(time: number);
    set progress(progress: number);
}

export { }
