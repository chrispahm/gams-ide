import {
  Fragment,
  cloneVNode,
  computed,
  defineComponent,
  h,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  reactive,
  ref,
  watch
} from "./chunk-V634PGSD.js";

// node_modules/vue3-carousel/dist/carousel.es.js
var defaultConfigs = {
  itemsToShow: 1,
  itemsToScroll: 1,
  modelValue: 0,
  transition: 300,
  autoplay: 0,
  snapAlign: "center",
  wrapAround: false,
  throttle: 16,
  pauseAutoplayOnHover: false,
  mouseDrag: true,
  touchDrag: true,
  dir: "ltr",
  breakpoints: void 0,
  i18n: {
    ariaNextSlide: "Navigate to next slide",
    ariaPreviousSlide: "Navigate to previous slide",
    ariaNavigateToSlide: "Navigate to slide {slideNumber}",
    ariaGallery: "Gallery",
    itemXofY: "Item {currentSlide} of {slidesCount}",
    iconArrowUp: "Arrow pointing upwards",
    iconArrowDown: "Arrow pointing downwards",
    iconArrowRight: "Arrow pointing to the right",
    iconArrowLeft: "Arrow pointing to the left"
  }
};
var carouselProps = {
  // count of items to showed per view
  itemsToShow: {
    default: defaultConfigs.itemsToShow,
    type: Number
  },
  // count of items to be scrolled
  itemsToScroll: {
    default: defaultConfigs.itemsToScroll,
    type: Number
  },
  // control infinite scrolling mode
  wrapAround: {
    default: defaultConfigs.wrapAround,
    type: Boolean
  },
  // control max drag
  throttle: {
    default: defaultConfigs.throttle,
    type: Number
  },
  // control snap position alignment
  snapAlign: {
    default: defaultConfigs.snapAlign,
    validator(value) {
      return ["start", "end", "center", "center-even", "center-odd"].includes(value);
    }
  },
  // sliding transition time in ms
  transition: {
    default: defaultConfigs.transition,
    type: Number
  },
  // an object to store breakpoints
  breakpoints: {
    default: defaultConfigs.breakpoints,
    type: Object
  },
  // time to auto advance slides in ms
  autoplay: {
    default: defaultConfigs.autoplay,
    type: Number
  },
  // pause autoplay when mouse hover over the carousel
  pauseAutoplayOnHover: {
    default: defaultConfigs.pauseAutoplayOnHover,
    type: Boolean
  },
  // slide number number of initial slide
  modelValue: {
    default: void 0,
    type: Number
  },
  // toggle mouse dragging.
  mouseDrag: {
    default: defaultConfigs.mouseDrag,
    type: Boolean
  },
  // toggle mouse dragging.
  touchDrag: {
    default: defaultConfigs.touchDrag,
    type: Boolean
  },
  // control snap position alignment
  dir: {
    default: defaultConfigs.dir,
    validator(value) {
      return ["rtl", "ltr"].includes(value);
    }
  },
  // aria-labels and additional text labels
  i18n: {
    default: defaultConfigs.i18n,
    type: Object
  },
  // an object to pass all settings
  settings: {
    default() {
      return {};
    },
    type: Object
  }
};
function getMaxSlideIndex({ config, slidesCount }) {
  const { snapAlign, wrapAround, itemsToShow = 1 } = config;
  if (wrapAround) {
    return Math.max(slidesCount - 1, 0);
  }
  let output;
  switch (snapAlign) {
    case "start":
      output = slidesCount - itemsToShow;
      break;
    case "end":
      output = slidesCount - 1;
      break;
    case "center":
    case "center-odd":
      output = slidesCount - Math.ceil((itemsToShow - 0.5) / 2);
      break;
    case "center-even":
      output = slidesCount - Math.ceil(itemsToShow / 2);
      break;
    default:
      output = 0;
      break;
  }
  return Math.max(output, 0);
}
function getMinSlideIndex({ config, slidesCount }) {
  const { wrapAround, snapAlign, itemsToShow = 1 } = config;
  let output = 0;
  if (wrapAround || itemsToShow > slidesCount) {
    return output;
  }
  switch (snapAlign) {
    case "start":
      output = 0;
      break;
    case "end":
      output = itemsToShow - 1;
      break;
    case "center":
    case "center-odd":
      output = Math.floor((itemsToShow - 1) / 2);
      break;
    case "center-even":
      output = Math.floor((itemsToShow - 2) / 2);
      break;
    default:
      output = 0;
      break;
  }
  return output;
}
function getNumberInRange({ val, max, min }) {
  if (max < min) {
    return val;
  }
  return Math.min(Math.max(val, min), max);
}
function getSlidesToScroll({ config, currentSlide, slidesCount }) {
  const { snapAlign, wrapAround, itemsToShow = 1 } = config;
  let output = currentSlide;
  switch (snapAlign) {
    case "center":
    case "center-odd":
      output -= (itemsToShow - 1) / 2;
      break;
    case "center-even":
      output -= (itemsToShow - 2) / 2;
      break;
    case "end":
      output -= itemsToShow - 1;
      break;
  }
  if (wrapAround) {
    return output;
  }
  return getNumberInRange({
    val: output,
    max: slidesCount - itemsToShow,
    min: 0
  });
}
function getSlidesVNodes(vNode) {
  if (!vNode)
    return [];
  return vNode.reduce((acc, node) => {
    var _a;
    if (node.type === Fragment) {
      return [...acc, ...getSlidesVNodes(node.children)];
    }
    if (((_a = node.type) === null || _a === void 0 ? void 0 : _a.name) === "CarouselSlide") {
      return [...acc, node];
    }
    return acc;
  }, []);
}
function mapNumberToRange({ val, max, min = 0 }) {
  if (val > max) {
    return mapNumberToRange({ val: val - (max + 1), max, min });
  }
  if (val < min) {
    return mapNumberToRange({ val: val + (max + 1), max, min });
  }
  return val;
}
function throttle(fn, limit) {
  let inThrottle;
  if (!limit) {
    return fn;
  }
  return function(...args) {
    const self = this;
    if (!inThrottle) {
      fn.apply(self, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
function debounce(fn, delay) {
  let timerId;
  return function(...args) {
    if (timerId) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      fn(...args);
      timerId = null;
    }, delay);
  };
}
function i18nFormatter(string = "", values = {}) {
  return Object.entries(values).reduce((acc, [key, value]) => acc.replace(`{${key}}`, String(value)), string);
}
var ARIAComponent = defineComponent({
  name: "ARIA",
  setup() {
    const config = inject("config", reactive(Object.assign({}, defaultConfigs)));
    const currentSlide = inject("currentSlide", ref(0));
    const slidesCount = inject("slidesCount", ref(0));
    return () => h("div", {
      class: ["carousel__liveregion", "carousel__sr-only"],
      "aria-live": "polite",
      "aria-atomic": "true"
    }, i18nFormatter(config.i18n["itemXofY"], {
      currentSlide: currentSlide.value + 1,
      slidesCount: slidesCount.value
    }));
  }
});
var Carousel = defineComponent({
  name: "Carousel",
  props: carouselProps,
  setup(props, { slots, emit, expose }) {
    var _a;
    const root = ref(null);
    const slides = ref([]);
    const slideWidth = ref(0);
    const slidesCount = ref(0);
    const config = reactive(Object.assign({}, defaultConfigs));
    let __defaultConfig = Object.assign({}, defaultConfigs);
    let breakpoints;
    const currentSlideIndex = ref((_a = props.modelValue) !== null && _a !== void 0 ? _a : 0);
    const prevSlideIndex = ref(0);
    const middleSlideIndex = ref(0);
    const maxSlideIndex = ref(0);
    const minSlideIndex = ref(0);
    let autoplayTimer;
    let transitionTimer;
    provide("config", config);
    provide("slidesCount", slidesCount);
    provide("currentSlide", currentSlideIndex);
    provide("maxSlide", maxSlideIndex);
    provide("minSlide", minSlideIndex);
    provide("slideWidth", slideWidth);
    function initDefaultConfigs() {
      breakpoints = Object.assign({}, props.breakpoints);
      __defaultConfig = Object.assign(Object.assign(Object.assign({}, __defaultConfig), props), { i18n: Object.assign(Object.assign({}, __defaultConfig.i18n), props.i18n), breakpoints: void 0 });
      bindConfigs(__defaultConfig);
    }
    function updateBreakpointsConfigs() {
      if (!breakpoints || !Object.keys(breakpoints).length)
        return;
      const breakpointsArray = Object.keys(breakpoints).map((key) => Number(key)).sort((a, b) => +b - +a);
      let newConfig = Object.assign({}, __defaultConfig);
      breakpointsArray.some((breakpoint) => {
        const isMatched = window.matchMedia(`(min-width: ${breakpoint}px)`).matches;
        if (isMatched) {
          newConfig = Object.assign(Object.assign({}, newConfig), breakpoints[breakpoint]);
        }
        return isMatched;
      });
      bindConfigs(newConfig);
    }
    function bindConfigs(newConfig) {
      Object.entries(newConfig).forEach(([key, val]) => config[key] = val);
    }
    const handleWindowResize = debounce(() => {
      updateBreakpointsConfigs();
      updateSlideWidth();
    }, 16);
    function updateSlideWidth() {
      if (!root.value)
        return;
      const rect = root.value.getBoundingClientRect();
      slideWidth.value = rect.width / config.itemsToShow;
    }
    function updateSlidesData() {
      if (slidesCount.value <= 0)
        return;
      middleSlideIndex.value = Math.ceil((slidesCount.value - 1) / 2);
      maxSlideIndex.value = getMaxSlideIndex({ config, slidesCount: slidesCount.value });
      minSlideIndex.value = getMinSlideIndex({ config, slidesCount: slidesCount.value });
      if (!config.wrapAround) {
        currentSlideIndex.value = getNumberInRange({
          val: currentSlideIndex.value,
          max: maxSlideIndex.value,
          min: minSlideIndex.value
        });
      }
    }
    onMounted(() => {
      nextTick(() => updateSlideWidth());
      setTimeout(() => updateSlideWidth(), 1e3);
      updateBreakpointsConfigs();
      initAutoplay();
      window.addEventListener("resize", handleWindowResize, { passive: true });
      emit("init");
    });
    onUnmounted(() => {
      if (transitionTimer) {
        clearTimeout(transitionTimer);
      }
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
      }
      window.removeEventListener("resize", handleWindowResize, {
        passive: true
      });
    });
    let isTouch = false;
    const startPosition = { x: 0, y: 0 };
    const endPosition = { x: 0, y: 0 };
    const dragged = reactive({ x: 0, y: 0 });
    const isHover = ref(false);
    const isDragging = ref(false);
    const handleMouseEnter = () => {
      isHover.value = true;
    };
    const handleMouseLeave = () => {
      isHover.value = false;
    };
    function handleDragStart(event) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
        return;
      }
      isTouch = event.type === "touchstart";
      if (!isTouch) {
        event.preventDefault();
      }
      if (!isTouch && event.button !== 0 || isSliding.value) {
        return;
      }
      startPosition.x = isTouch ? event.touches[0].clientX : event.clientX;
      startPosition.y = isTouch ? event.touches[0].clientY : event.clientY;
      document.addEventListener(isTouch ? "touchmove" : "mousemove", handleDragging, true);
      document.addEventListener(isTouch ? "touchend" : "mouseup", handleDragEnd, true);
    }
    const handleDragging = throttle((event) => {
      isDragging.value = true;
      endPosition.x = isTouch ? event.touches[0].clientX : event.clientX;
      endPosition.y = isTouch ? event.touches[0].clientY : event.clientY;
      const deltaX = endPosition.x - startPosition.x;
      const deltaY = endPosition.y - startPosition.y;
      dragged.y = deltaY;
      dragged.x = deltaX;
    }, config.throttle);
    function handleDragEnd() {
      const direction = config.dir === "rtl" ? -1 : 1;
      const tolerance = Math.sign(dragged.x) * 0.4;
      const draggedSlides = Math.round(dragged.x / slideWidth.value + tolerance) * direction;
      if (draggedSlides && !isTouch) {
        const captureClick = (e) => {
          e.stopPropagation();
          window.removeEventListener("click", captureClick, true);
        };
        window.addEventListener("click", captureClick, true);
      }
      slideTo(currentSlideIndex.value - draggedSlides);
      dragged.x = 0;
      dragged.y = 0;
      isDragging.value = false;
      document.removeEventListener(isTouch ? "touchmove" : "mousemove", handleDragging, true);
      document.removeEventListener(isTouch ? "touchend" : "mouseup", handleDragEnd, true);
    }
    function initAutoplay() {
      if (!config.autoplay || config.autoplay <= 0) {
        return;
      }
      autoplayTimer = setInterval(() => {
        if (config.pauseAutoplayOnHover && isHover.value) {
          return;
        }
        next();
      }, config.autoplay);
    }
    function resetAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
      initAutoplay();
    }
    const isSliding = ref(false);
    function slideTo(slideIndex) {
      const currentVal = config.wrapAround ? slideIndex : getNumberInRange({
        val: slideIndex,
        max: maxSlideIndex.value,
        min: minSlideIndex.value
      });
      if (currentSlideIndex.value === currentVal || isSliding.value) {
        return;
      }
      emit("slide-start", {
        slidingToIndex: slideIndex,
        currentSlideIndex: currentSlideIndex.value,
        prevSlideIndex: prevSlideIndex.value,
        slidesCount: slidesCount.value
      });
      isSliding.value = true;
      prevSlideIndex.value = currentSlideIndex.value;
      currentSlideIndex.value = currentVal;
      transitionTimer = setTimeout(() => {
        if (config.wrapAround) {
          const mappedNumber = mapNumberToRange({
            val: currentVal,
            max: maxSlideIndex.value,
            min: 0
          });
          if (mappedNumber !== currentSlideIndex.value) {
            currentSlideIndex.value = mappedNumber;
            emit("loop", {
              currentSlideIndex: currentSlideIndex.value,
              slidingToIndex: slideIndex
            });
          }
        }
        emit("update:modelValue", currentSlideIndex.value);
        emit("slide-end", {
          currentSlideIndex: currentSlideIndex.value,
          prevSlideIndex: prevSlideIndex.value,
          slidesCount: slidesCount.value
        });
        isSliding.value = false;
        resetAutoplay();
      }, config.transition);
    }
    function next() {
      slideTo(currentSlideIndex.value + config.itemsToScroll);
    }
    function prev() {
      slideTo(currentSlideIndex.value - config.itemsToScroll);
    }
    const nav = { slideTo, next, prev };
    provide("nav", nav);
    provide("isSliding", isSliding);
    const slidesToScroll = computed(() => getSlidesToScroll({
      config,
      currentSlide: currentSlideIndex.value,
      slidesCount: slidesCount.value
    }));
    provide("slidesToScroll", slidesToScroll);
    const trackStyle = computed(() => {
      const direction = config.dir === "rtl" ? -1 : 1;
      const xScroll = slidesToScroll.value * slideWidth.value * direction;
      return {
        transform: `translateX(${dragged.x - xScroll}px)`,
        transition: `${isSliding.value ? config.transition : 0}ms`,
        margin: config.wrapAround ? `0 -${slidesCount.value * slideWidth.value}px` : "",
        width: `100%`
      };
    });
    function restartCarousel() {
      initDefaultConfigs();
      updateBreakpointsConfigs();
      updateSlidesData();
      updateSlideWidth();
      resetAutoplay();
    }
    Object.keys(carouselProps).forEach((prop) => {
      if (["modelValue"].includes(prop))
        return;
      watch(() => props[prop], restartCarousel);
    });
    watch(() => props["modelValue"], (val) => {
      if (val === currentSlideIndex.value) {
        return;
      }
      slideTo(Number(val));
    });
    watch(slidesCount, updateSlidesData);
    emit("before-init");
    initDefaultConfigs();
    const data = {
      config,
      slidesCount,
      slideWidth,
      next,
      prev,
      slideTo,
      currentSlide: currentSlideIndex,
      maxSlide: maxSlideIndex,
      minSlide: minSlideIndex,
      middleSlide: middleSlideIndex
    };
    expose({
      updateBreakpointsConfigs,
      updateSlidesData,
      updateSlideWidth,
      initDefaultConfigs,
      restartCarousel,
      slideTo,
      next,
      prev,
      nav,
      data
    });
    const slotSlides = slots.default || slots.slides;
    const slotAddons = slots.addons;
    const slotsProps = reactive(data);
    return () => {
      const slidesElements = getSlidesVNodes(slotSlides === null || slotSlides === void 0 ? void 0 : slotSlides(slotsProps));
      const addonsElements = (slotAddons === null || slotAddons === void 0 ? void 0 : slotAddons(slotsProps)) || [];
      slidesElements.forEach((el, index) => el.props.index = index);
      let output = slidesElements;
      if (config.wrapAround) {
        const slidesBefore = slidesElements.map((el, index) => cloneVNode(el, {
          index: -slidesElements.length + index,
          isClone: true,
          key: `clone-before-${index}`
        }));
        const slidesAfter = slidesElements.map((el, index) => cloneVNode(el, {
          index: slidesElements.length + index,
          isClone: true,
          key: `clone-after-${index}`
        }));
        output = [...slidesBefore, ...slidesElements, ...slidesAfter];
      }
      slides.value = slidesElements;
      slidesCount.value = Math.max(slidesElements.length, 1);
      const trackEl = h("ol", {
        class: "carousel__track",
        style: trackStyle.value,
        onMousedownCapture: config.mouseDrag ? handleDragStart : null,
        onTouchstartPassiveCapture: config.touchDrag ? handleDragStart : null
      }, output);
      const viewPortEl = h("div", { class: "carousel__viewport" }, trackEl);
      return h("section", {
        ref: root,
        class: {
          carousel: true,
          "is-sliding": isSliding.value,
          "is-dragging": isDragging.value,
          "is-hover": isHover.value,
          "carousel--rtl": config.dir === "rtl"
        },
        dir: config.dir,
        "aria-label": config.i18n["ariaGallery"],
        tabindex: "0",
        onMouseenter: handleMouseEnter,
        onMouseleave: handleMouseLeave
      }, [viewPortEl, addonsElements, h(ARIAComponent)]);
    };
  }
});
var IconName;
(function(IconName2) {
  IconName2["arrowUp"] = "arrowUp";
  IconName2["arrowDown"] = "arrowDown";
  IconName2["arrowRight"] = "arrowRight";
  IconName2["arrowLeft"] = "arrowLeft";
})(IconName || (IconName = {}));
var icons = {
  arrowUp: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
  arrowDown: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
  arrowRight: "M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z",
  arrowLeft: "M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
};
function isIconName(candidate) {
  return candidate in IconName;
}
var Icon = (props) => {
  const config = inject("config", reactive(Object.assign({}, defaultConfigs)));
  const iconName = String(props.name);
  const iconI18n = `icon${iconName.charAt(0).toUpperCase() + iconName.slice(1)}`;
  if (!iconName || typeof iconName !== "string" || !isIconName(iconName)) {
    return;
  }
  const path = icons[iconName];
  const pathEl = h("path", { d: path });
  const iconTitle = config.i18n[iconI18n] || props.title || iconName;
  const titleEl = h("title", iconTitle);
  return h("svg", {
    class: "carousel__icon",
    viewBox: "0 0 24 24",
    role: "img",
    "aria-label": iconTitle
  }, [titleEl, pathEl]);
};
Icon.props = { name: String, title: String };
var Navigation = (props, { slots, attrs }) => {
  const { next: slotNext, prev: slotPrev } = slots || {};
  const config = inject("config", reactive(Object.assign({}, defaultConfigs)));
  const maxSlide = inject("maxSlide", ref(1));
  const minSlide = inject("minSlide", ref(1));
  const currentSlide = inject("currentSlide", ref(1));
  const nav = inject("nav", {});
  const { dir, wrapAround, i18n } = config;
  const isRTL = dir === "rtl";
  const prevButton = h("button", {
    type: "button",
    class: [
      "carousel__prev",
      !wrapAround && currentSlide.value <= minSlide.value && "carousel__prev--disabled",
      attrs === null || attrs === void 0 ? void 0 : attrs.class
    ],
    "aria-label": i18n["ariaPreviousSlide"],
    onClick: nav.prev
  }, (slotPrev === null || slotPrev === void 0 ? void 0 : slotPrev()) || h(Icon, { name: isRTL ? "arrowRight" : "arrowLeft" }));
  const nextButton = h("button", {
    type: "button",
    class: [
      "carousel__next",
      !wrapAround && currentSlide.value >= maxSlide.value && "carousel__next--disabled",
      attrs === null || attrs === void 0 ? void 0 : attrs.class
    ],
    "aria-label": i18n["ariaNextSlide"],
    onClick: nav.next
  }, (slotNext === null || slotNext === void 0 ? void 0 : slotNext()) || h(Icon, { name: isRTL ? "arrowLeft" : "arrowRight" }));
  return [prevButton, nextButton];
};
var Pagination = () => {
  const config = inject("config", reactive(Object.assign({}, defaultConfigs)));
  const maxSlide = inject("maxSlide", ref(1));
  const minSlide = inject("minSlide", ref(1));
  const currentSlide = inject("currentSlide", ref(1));
  const nav = inject("nav", {});
  const isActive = (slide) => mapNumberToRange({
    val: currentSlide.value,
    max: maxSlide.value,
    min: 0
  }) === slide;
  const children = [];
  for (let slide = minSlide.value; slide < maxSlide.value + 1; slide++) {
    const button = h("button", {
      type: "button",
      class: {
        "carousel__pagination-button": true,
        "carousel__pagination-button--active": isActive(slide)
      },
      "aria-label": i18nFormatter(config.i18n["ariaNavigateToSlide"], {
        slideNumber: slide + 1
      }),
      onClick: () => nav.slideTo(slide)
    });
    const item = h("li", { class: "carousel__pagination-item", key: slide }, button);
    children.push(item);
  }
  return h("ol", { class: "carousel__pagination" }, children);
};
var Slide = defineComponent({
  name: "CarouselSlide",
  props: {
    index: {
      type: Number,
      default: 1
    },
    isClone: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { slots }) {
    const config = inject("config", reactive(Object.assign({}, defaultConfigs)));
    const currentSlide = inject("currentSlide", ref(0));
    const slidesToScroll = inject("slidesToScroll", ref(0));
    const isSliding = inject("isSliding", ref(false));
    const isActive = () => props.index === currentSlide.value;
    const isPrev = () => props.index === currentSlide.value - 1;
    const isNext = () => props.index === currentSlide.value + 1;
    const isVisible = () => {
      const min = Math.floor(slidesToScroll.value);
      const max = Math.ceil(slidesToScroll.value + config.itemsToShow - 1);
      return props.index >= min && props.index <= max;
    };
    return () => {
      var _a;
      return h("li", {
        style: { width: `${100 / config.itemsToShow}%` },
        class: {
          carousel__slide: true,
          "carousel__slide--clone": props.isClone,
          "carousel__slide--visible": isVisible(),
          "carousel__slide--active": isActive(),
          "carousel__slide--prev": isPrev(),
          "carousel__slide--next": isNext(),
          "carousel__slide--sliding": isSliding.value
        },
        "aria-hidden": !isVisible()
      }, (_a = slots.default) === null || _a === void 0 ? void 0 : _a.call(slots));
    };
  }
});
export {
  Carousel,
  Icon,
  Navigation,
  Pagination,
  Slide
};
/*! Bundled license information:

vue3-carousel/dist/carousel.es.js:
  (**
   * Vue 3 Carousel 0.3.1
   * (c) 2023
   * @license MIT
   *)
*/
//# sourceMappingURL=vue3-carousel.js.map
