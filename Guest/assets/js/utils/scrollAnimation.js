// assets/js/utils/scrollAnimation.js
// Scroll-triggered animations using Intersection Observer API

/**
 * Initialize scroll animations for elements with specific selectors
 * @param {string} selector - CSS selector for elements to animate
 * @param {Object} options - Animation options
 */
export function initScrollAnimations(selector, options = {}) {
  const elements = document.querySelectorAll(selector);
  if (elements.length === 0) return null;

  const {
    threshold = 0.1,                      // Trigger when 10% visible
    rootMargin = '0px 0px -10% 0px',     // Trigger slightly before entering viewport
    triggerOnce = true,                   // Only animate once
    animationClass = 'is-visible'         // Class to add when visible
  } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(animationClass);
          if (triggerOnce) {
            observer.unobserve(entry.target);
          }
        } else if (!triggerOnce) {
          entry.target.classList.remove(animationClass);
        }
      });
    },
    { threshold, rootMargin }
  );
  
  elements.forEach(element => {
    // Add initial animation class
    element.classList.add('scroll-animate');
    observer.observe(element);
  });

  return observer;
}

/**
 * Initialize scroll animations for homepage sections (excluding section-why)
 */
export function initHomepageScrollAnimations() {
  const observers = {};

  // Gallery features
  observers.galleryFeatures = initScrollAnimations('#section-gallery .feature', {
    threshold: 0.15,
    rootMargin: '0px 0px -10% 0px',
    triggerOnce: true
  });

  // Video section
  observers.videoSection = initScrollAnimations('#section-video', {
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px',
    triggerOnce: true
  });

  // Weather section
  observers.weatherSection = initScrollAnimations('#section-weather', {
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px',
    triggerOnce: true
  });

  // CTA section
  observers.ctaSection = initScrollAnimations('#section-cta', {
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px',
    triggerOnce: true
  });

  return observers;
}

/**
 * Add scroll animation to a specific element
 * @param {HTMLElement} element - Element to animate
 * @param {Object} options - Animation options
 * @returns {IntersectionObserver} Observer instance
 */
export function addScrollAnimationToElement(element, options = {}) {
  if (!element) return null;

  const {
    threshold = 0.1,
    rootMargin = '0px 0px -10% 0px',
    triggerOnce = true,
    animationClass = 'is-visible'
  } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(animationClass);
          if (triggerOnce) {
            observer.unobserve(entry.target);
          }
        } else if (!triggerOnce) {
          entry.target.classList.remove(animationClass);
        }
      });
    },
    { threshold, rootMargin }
  );

  element.classList.add('scroll-animate');
  observer.observe(element);

  return observer;
}

/**
 * Remove scroll animation from element
 * @param {HTMLElement} element - Element to stop animating
 * @param {IntersectionObserver} observer - Observer instance
 */
export function removeScrollAnimationFromElement(element, observer) {
  if (element && observer) {
    observer.unobserve(element);
    element.classList.remove('scroll-animate', 'is-visible');
  }
}

/**
 * Cleanup all scroll animation observers
 * @param {Object} observers - Object containing observer instances
 */
export function cleanupScrollAnimations(observers) {
  if (!observers) return;
  
  Object.values(observers).forEach(observer => {
    if (observer && typeof observer.disconnect === 'function') {
      observer.disconnect();
    }
  });
}
