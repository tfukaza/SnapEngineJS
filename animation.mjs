var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _variables, _animation, _varAnimation, _offset, _easing, _duration, _delay, _hasVariable;
let animationFragment = null;
function getAnimationFragment() {
  if (!animationFragment) {
    animationFragment = document.createElement("div");
    animationFragment.style.display = "none";
    document.body.appendChild(animationFragment);
  }
  return animationFragment;
}
class AnimationObject {
  constructor(target, keyframe, property) {
    __publicField(this, "target");
    __publicField(this, "keyframe");
    __publicField(this, "property");
    __privateAdd(this, _variables);
    __privateAdd(this, _animation);
    __privateAdd(this, _varAnimation);
    __privateAdd(this, _offset);
    __privateAdd(this, _easing);
    __privateAdd(this, _duration);
    __privateAdd(this, _delay);
    __privateAdd(this, _hasVariable);
    // #deleteOnFinish: boolean;
    __publicField(this, "requestDelete");
    this.target = target ?? getAnimationFragment();
    this.keyframe = keyframe;
    this.property = property;
    const shouldPersist = this.property.persist ?? false;
    this.property.persist = shouldPersist;
    __privateSet(this, _animation, null);
    if (!this.property.duration) {
      this.property.duration = 1e3;
    }
    if (!this.property.delay) {
      this.property.delay = 0;
    }
    let numKeys = 0;
    for (const [_, value] of Object.entries(this.keyframe)) {
      const len = Array.isArray(value) ? value.length : 1;
      numKeys = Math.max(numKeys, len);
    }
    if (!this.property.offset) {
      __privateSet(this, _offset, []);
      if (numKeys <= 1) {
        __privateGet(this, _offset).push(0);
      } else {
        for (let i = 0; i < numKeys; i++) {
          __privateGet(this, _offset).push(i / (numKeys - 1));
        }
      }
    } else {
      __privateSet(this, _offset, this.property.offset);
    }
    if (!this.property.easing) {
      __privateSet(this, _easing, ["linear"]);
    } else {
      if (Array.isArray(this.property.easing)) {
        __privateSet(this, _easing, this.property.easing);
      } else {
        __privateSet(this, _easing, [this.property.easing]);
      }
    }
    const desiredEasingLength = Math.max(1, __privateGet(this, _offset).length - 1);
    if (__privateGet(this, _easing).length < desiredEasingLength) {
      const lastEasing = __privateGet(this, _easing)[__privateGet(this, _easing).length - 1] ?? "linear";
      while (__privateGet(this, _easing).length < desiredEasingLength) {
        __privateGet(this, _easing).push(lastEasing);
      }
    }
    if (!this.property.duration) {
      __privateSet(this, _duration, [this.property.duration]);
    } else {
      if (Array.isArray(this.property.duration)) {
        __privateSet(this, _duration, this.property.duration);
      } else {
        __privateSet(this, _duration, [this.property.duration]);
      }
    }
    if (!this.property.delay) {
      __privateSet(this, _delay, 0);
    } else {
      __privateSet(this, _delay, this.property.delay);
    }
    __privateSet(this, _variables, {});
    __privateSet(this, _varAnimation, []);
    __privateSet(this, _hasVariable, Object.keys(this.keyframe).filter((key) => {
      return key.startsWith("$");
    }).length > 0);
    let cssKeyframe = {};
    for (const [key, value] of Object.entries(this.keyframe)) {
      if (!key.startsWith("$")) {
        cssKeyframe[key] = value;
      } else {
        __privateGet(this, _variables)[key] = value;
      }
    }
    if (__privateGet(this, _hasVariable) && Object.keys(cssKeyframe).length == 0) {
      cssKeyframe = {};
    }
    if (this.property.offset) {
      cssKeyframe.offset = this.property.offset;
    }
    const animationProperty = {
      delay: __privateGet(this, _delay),
      fill: "both"
    };
    if (__privateGet(this, _duration).length > 1) {
      cssKeyframe.duration = __privateGet(this, _duration);
    } else {
      animationProperty.duration = __privateGet(this, _duration)[0];
    }
    if (__privateGet(this, _easing).length > 1) {
      cssKeyframe.easing = __privateGet(this, _easing);
    } else {
      animationProperty.easing = __privateGet(this, _easing)[0];
    }
    __privateSet(this, _animation, new Animation(
      new KeyframeEffect(this.target, cssKeyframe, animationProperty)
    ));
    this.requestDelete = false;
    __privateGet(this, _animation).onfinish = () => {
      var _a, _b, _c, _d;
      (_b = (_a = this.property).finish) == null ? void 0 : _b.call(_a);
      this.finish();
      if (shouldPersist) {
        (_c = __privateGet(this, _animation)) == null ? void 0 : _c.pause();
      } else {
        (_d = __privateGet(this, _animation)) == null ? void 0 : _d.cancel();
        this.requestDelete = true;
      }
    };
    __privateSet(this, _varAnimation, []);
    if (__privateGet(this, _hasVariable) && __privateGet(this, _easing).length > 1) {
      for (let i = 0; i < __privateGet(this, _offset).length - 1; i++) {
        const intervalKeys = {};
        for (const [key, value] of Object.entries(__privateGet(this, _variables))) {
          intervalKeys[key] = value.slice(i, i + 1);
        }
        const intervalDuration = (__privateGet(this, _offset)[i + 1] - __privateGet(this, _offset)[i]) * this.property.duration;
        const intervalDelay = __privateGet(this, _offset)[i] * this.property.duration + this.property.delay;
        const intervalEasing = __privateGet(this, _easing)[i];
        const animation = new Animation(
          new KeyframeEffect(this.target, intervalKeys, {
            duration: intervalDuration,
            delay: intervalDelay,
            easing: intervalEasing,
            fill: "both"
          })
        );
        animation.onfinish = () => {
          animation.cancel();
        };
        animation.persist();
        __privateGet(this, _varAnimation).push(animation);
      }
    }
  }
  pause() {
    __privateGet(this, _animation).pause();
    for (let i = 0; i < __privateGet(this, _varAnimation).length; i++) {
      __privateGet(this, _varAnimation)[i].pause();
    }
  }
  play() {
    __privateGet(this, _animation).play();
    for (let i = 0; i < __privateGet(this, _varAnimation).length; i++) {
      __privateGet(this, _varAnimation)[i].play();
    }
  }
  cancel() {
    __privateGet(this, _animation).cancel();
    for (let i = 0; i < __privateGet(this, _varAnimation).length; i++) {
      __privateGet(this, _varAnimation)[i].cancel();
    }
  }
  reverse() {
    __privateGet(this, _animation).reverse();
    for (let i = 0; i < __privateGet(this, _varAnimation).length; i++) {
      __privateGet(this, _varAnimation)[i].reverse();
    }
  }
  calculateFrame(_) {
    var _a, _b, _c, _d;
    const alpha = __privateGet(this, _animation).effect.getComputedTiming().progress;
    if (alpha == null) {
      return false;
    }
    const alphaElapsedTime = this.property.duration * alpha + this.property.delay;
    if (__privateGet(this, _hasVariable)) {
      let currentKey = 0;
      for (let i = 0; i < __privateGet(this, _offset).length - 1; i++) {
        if (__privateGet(this, _offset)[i] <= alpha && alpha < __privateGet(this, _offset)[i + 1]) {
          currentKey = i;
          break;
        }
      }
      if (alpha >= 1) {
        currentKey = __privateGet(this, _offset).length - 2;
      }
      let localAlpha = alpha;
      if (__privateGet(this, _easing).length > 1) {
        const currentVarAnimation = __privateGet(this, _varAnimation)[currentKey];
        currentVarAnimation.currentTime = alphaElapsedTime;
        localAlpha = currentVarAnimation.effect.getComputedTiming().progress ?? 0;
      }
      const varValues = {};
      for (const [key, value] of Object.entries(__privateGet(this, _variables))) {
        const varFrom = value[currentKey];
        const varTo = value[currentKey + 1];
        const varValue = varFrom + (varTo - varFrom) * localAlpha;
        varValues[key] = varValue;
      }
      (_b = (_a = this.property).tick) == null ? void 0 : _b.call(_a, varValues);
    } else {
      (_d = (_c = this.property).tick) == null ? void 0 : _d.call(_c, {});
    }
    return false;
  }
  finish() {
    var _a;
    try {
      (_a = __privateGet(this, _animation)) == null ? void 0 : _a.commitStyles();
    } catch (e) {
    }
  }
  set currentTime(time) {
    __privateGet(this, _animation).currentTime = time;
    for (let i = 0; i < __privateGet(this, _varAnimation).length; i++) {
      __privateGet(this, _varAnimation)[i].currentTime = time;
    }
  }
  set progress(progress) {
    this.currentTime = (this.property.duration + this.property.delay) * progress;
  }
}
_variables = new WeakMap();
_animation = new WeakMap();
_varAnimation = new WeakMap();
_offset = new WeakMap();
_easing = new WeakMap();
_duration = new WeakMap();
_delay = new WeakMap();
_hasVariable = new WeakMap();
class SequenceObject {
  constructor() {
    __publicField(this, "animations");
    __publicField(this, "startTime");
    __publicField(this, "endTime");
    __publicField(this, "expired");
    __publicField(this, "requestDelete");
    this.animations = [];
    this.startTime = -1;
    this.endTime = -1;
    this.expired = false;
    this.requestDelete = false;
  }
  add(animation) {
    this.animations.push(animation);
  }
  play() {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].play();
    }
  }
  pause() {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].pause();
    }
  }
  cancel() {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].cancel();
    }
  }
  reverse() {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].reverse();
    }
  }
  calculateFrame(currentTime) {
    let result = false;
    for (let i = 0; i < this.animations.length; i++) {
      result = this.animations[i].calculateFrame(currentTime) || result;
    }
    return result;
  }
  set currentTime(time) {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].currentTime = time;
    }
  }
  set progress(progress) {
    for (let i = 0; i < this.animations.length; i++) {
      this.animations[i].progress = progress;
    }
  }
}
export {
  AnimationObject,
  SequenceObject
};
