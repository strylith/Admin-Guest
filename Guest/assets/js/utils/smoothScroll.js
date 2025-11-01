// assets/js/utils/smoothScroll.js
// Smooth scrolling functionality using Lenis library

let lenisInstance = null;

/**
 * Initialize Lenis smooth scrolling
 */
export function initSmoothScroll() {
  if (typeof Lenis === 'undefined') {
    console.warn('Lenis library not loaded. Smooth scrolling disabled.');
    return null;
  }

  // Destroy existing instance if any
  if (lenisInstance) {
    lenisInstance.destroy();
  }

  // Initialize Lenis with optimized settings
  lenisInstance = new Lenis({
    duration: 1.2,                           // Scroll duration (higher = slower/smoother)
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easing function
    orientation: 'vertical',                  // Scroll direction
    gestureOrientation: 'vertical',          // Gesture direction
    smoothWheel: true,                       // Enable smooth wheel scrolling
    wheelMultiplier: 1,                      // Scroll speed multiplier
    touchMultiplier: 2,                      // Touch scroll speed multiplier
    infinite: false,                         // Disable infinite scroll
  });

  // Animation frame loop to update Lenis
  function raf(time) {
    lenisInstance.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // Add Lenis classes to HTML element
  document.documentElement.classList.add('lenis', 'lenis-smooth');
  
  // Make Lenis instance globally accessible
  window.lenisInstance = lenisInstance;

  return lenisInstance;
}

/**
 * Destroy Lenis instance
 */
export function destroySmoothScroll() {
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
    window.lenisInstance = null;
    document.documentElement.classList.remove('lenis', 'lenis-smooth');
  }
}

/**
 * Get current Lenis instance
 */
export function getLenisInstance() {
  return lenisInstance;
}

/**
 * Scroll to element with smooth animation
 * @param {string|HTMLElement} target - CSS selector or element to scroll to
 * @param {Object} options - Scroll options
 */
export function scrollTo(target, options = {}) {
  if (!lenisInstance) {
    console.warn('Lenis not initialized. Using native scroll.');
    if (typeof target === 'string') {
      const element = document.querySelector(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }

  lenisInstance.scrollTo(target, options);
}

/**
 * Scroll to top with smooth animation
 */
export function scrollToTop() {
  scrollTo(0);
}
