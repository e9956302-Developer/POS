/**
 * Universal Smooth Scroll & Visual Cue Utility
 * Handles scrolling to newly opened sections, detail views, and editors across the application.
 * Supports scrolling inside .main-viewport or any scrollable container as well as window.
 */

export function smoothScrollTo(target, options = {}) {
  const {
    offset = 80, // Compensate for sticky headers/toolbars
    delay = 30,  // Initial delay
    highlight = true,
    highlightClass = "highlight-pulse",
    maxRetries = 15,
    retryInterval = 40
  } = options;

  let retries = 0;

  function executeScroll() {
    let element = null;
    if (typeof target === "string") {
      const cleanId = target.startsWith("#") ? target.slice(1) : target;
      element = document.getElementById(cleanId);
    } else if (target instanceof HTMLElement) {
      element = target;
    }

    if (!element) {
      if (retries < maxRetries) {
        retries++;
        setTimeout(executeScroll, retryInterval);
      }
      return;
    }

    // Identify the scrollable container (in this app, .main-viewport is the primary scroll container)
    let scrollContainer = null;
    const mainViewport = document.querySelector(".main-viewport");

    let parent = element.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY || style.overflow;
      if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
        scrollContainer = parent;
        break;
      }
      parent = parent.parentElement;
    }

    if (!scrollContainer && mainViewport && mainViewport.scrollHeight > mainViewport.clientHeight) {
      scrollContainer = mainViewport;
    }

    if (scrollContainer && typeof scrollContainer.scrollTo === "function") {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const currentScrollTop = scrollContainer.scrollTop;
      const targetTop = currentScrollTop + (elementRect.top - containerRect.top) - offset;

      scrollContainer.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth"
      });
    } else {
      // Fallback for standard window scroll or scrollIntoView
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const targetScrollTop = Math.max(0, absoluteElementTop - offset);

      window.scrollTo({
        top: targetScrollTop,
        behavior: "smooth"
      });

      if (typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    // Provide visual focus cue so user immediately identifies the section
    if (highlight) {
      element.classList.remove(highlightClass);
      // Trigger reflow to restart animation
      void element.offsetWidth;
      element.classList.add(highlightClass);

      setTimeout(() => {
        element.classList.remove(highlightClass);
      }, 2500);
    }
  }

  setTimeout(executeScroll, delay);
}
