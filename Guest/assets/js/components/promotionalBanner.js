// Promotional Hero Carousel Component
export function initPromoBanner() {
  const carousel = document.querySelector('.promo-hero-carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.promo-hero-track');
  const slides = Array.from(track.querySelectorAll('.promo-hero-slide'));
  const prevBtn = document.querySelector('.promo-hero-prev');
  const nextBtn = document.querySelector('.promo-hero-next');
  const dotsContainer = document.querySelector('.promo-hero-dots');

  if (!track || slides.length === 0) return;

  let currentIndex = 0;
  let autoSlideInterval = null;
  let touchStartX = 0;
  let touchEndX = 0;
  const autoSlideDelay = 7000; // 7 seconds
  let edgeScrollInterval = null;
  const edgeScrollDelay = 3000; // Slide every 3 seconds when hovering edge
  const edgeZoneWidth = 30; // Width of edge detection zone in pixels (very narrow)
  let isSliding = false; // Cooldown flag to prevent rapid sliding
  const slideCooldown = 1000; // 1 second cooldown between slides
  let isDragging = false; // Mouse drag flag
  let dragStartX = 0;
  let dragCurrentX = 0;
  const dragThreshold = 50; // 50px minimum drag to trigger slide

  // Load collage images and single images lazily
  slides.forEach(slide => {
    // Load collage items
    const collageItems = slide.querySelectorAll('.collage-item');
    collageItems.forEach(item => {
      const src = item.getAttribute('data-src');
      if (src) {
        item.style.backgroundImage = `url('${src}')`;
      }
    });
    
    // Load single image (for Function Hall slide)
    const singleImage = slide.querySelector('.promo-hero-single-image');
    if (singleImage) {
      const src = singleImage.getAttribute('data-src');
      if (src) {
        singleImage.style.backgroundImage = `url('${src}')`;
      }
    }
  });

  // Create navigation dots
  function createDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement('button');
      dot.className = 'promo-hero-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  // Update dots
  function updateDots() {
    const dots = dotsContainer.querySelectorAll('.promo-hero-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  // Move to specific slide with sliding animation
  function goToSlide(index, direction = null) {
    // Check cooldown - prevent rapid sliding
    if (isSliding) {
      return;
    }
    
    const oldIndex = currentIndex;
    currentIndex = index;
    
    if (oldIndex === currentIndex) {
      // First initialization
      slides[currentIndex].style.transform = 'translateX(0)';
      slides[currentIndex].style.opacity = '1';
      slides[currentIndex].style.visibility = 'visible';
      slides[currentIndex].style.zIndex = '1';
      updateDots();
      return;
    }
    
    // Set cooldown flag
    isSliding = true;
    
    const newSlide = slides[currentIndex];
    const oldSlide = slides[oldIndex];
    
    // Determine slide direction if not provided
    if (!direction) {
      if ((currentIndex > oldIndex) || (oldIndex === slides.length - 1 && currentIndex === 0)) {
        direction = 'next';
      } else {
        direction = 'prev';
      }
    }
    
    // Position new slide off-screen based on direction
    if (direction === 'next') {
      newSlide.style.transform = 'translateX(100%)';
    } else {
      newSlide.style.transform = 'translateX(-100%)';
    }
    
    newSlide.style.opacity = '1';
    newSlide.style.visibility = 'visible';
    newSlide.style.zIndex = '2';
    
    // Trigger reflow
    newSlide.offsetHeight;
    
    // Slide in new slide and slide out old slide
    requestAnimationFrame(() => {
      newSlide.style.transform = 'translateX(0)';
      
      if (direction === 'next') {
        oldSlide.style.transform = 'translateX(-100%)';
      } else {
        oldSlide.style.transform = 'translateX(100%)';
      }
      
      // After transition, reset old slide
      setTimeout(() => {
        oldSlide.style.opacity = '0';
        oldSlide.style.visibility = 'hidden';
        oldSlide.style.zIndex = '0';
        oldSlide.style.transform = 'translateX(0)';
        
        // Release cooldown after slide completes
        setTimeout(() => {
          isSliding = false;
        }, slideCooldown - 800); // Cooldown minus transition time
      }, 800);
    });
    
    updateDots();
  }

  // Next slide
  function nextSlide() {
    const next = (currentIndex + 1) % slides.length;
    goToSlide(next, 'next');
  }

  // Previous slide
  function prevSlide() {
    const prev = (currentIndex - 1 + slides.length) % slides.length;
    goToSlide(prev, 'prev');
  }

  // Auto-slide functionality
  function startAutoSlide() {
    stopAutoSlide();
    autoSlideInterval = setInterval(nextSlide, autoSlideDelay);
  }

  function stopAutoSlide() {
    if (autoSlideInterval) {
      clearInterval(autoSlideInterval);
      autoSlideInterval = null;
    }
  }

  // Touch/swipe support
  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoSlide();
  }

  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoSlide();
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  }

  // Event listeners
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      stopAutoSlide();
      startAutoSlide();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      stopAutoSlide();
      startAutoSlide();
    });
  }

  // Edge auto-scroll functionality
  function startEdgeScroll(direction) {
    stopEdgeScroll();
    edgeScrollInterval = setInterval(() => {
      if (direction === 'left') {
        prevSlide();
      } else if (direction === 'right') {
        nextSlide();
      }
    }, edgeScrollDelay);
  }

  function stopEdgeScroll() {
    if (edgeScrollInterval) {
      clearInterval(edgeScrollInterval);
      edgeScrollInterval = null;
    }
  }

  // Mouse move detection for edge scrolling
  function handleMouseMove(e) {
    // If dragging, handle drag movement and exit early
    if (isDragging) {
      currentX = e.clientX;
      dragOffset = currentX - dragStartX;
      
      // Apply transform in real-time
      const currentSlide = slides[currentIndex];
      const dragPercent = (dragOffset / carousel.offsetWidth) * 100;
      
      // Add resistance at boundaries
      let resistanceFactor = 1;
      if ((currentIndex === 0 && dragOffset > 0) || 
          (currentIndex === slides.length - 1 && dragOffset < 0)) {
        resistanceFactor = 0.3; // 70% resistance
      }
      
      currentSlide.style.transform = `translateX(${dragPercent * resistanceFactor}%)`;
      currentSlide.style.transition = 'none'; // Disable transition during drag
      return; // Exit early, don't process edge detection
    }
    
    // Otherwise, process edge detection
    const rect = carousel.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const carouselWidth = rect.width;

    // Check if mouse is in left edge zone
    if (mouseX < edgeZoneWidth && mouseX > 0) {
      stopAutoSlide(); // Stop regular auto-slide
      if (!edgeScrollInterval && !isSliding) {
        // Immediate first slide when entering zone (if not on cooldown)
        prevSlide();
        // Then continue with interval
        startEdgeScroll('left');
      }
      carousel.style.cursor = 'w-resize';
      carousel.classList.add('edge-hover-left');
      carousel.classList.remove('edge-hover-right');
    }
    // Check if mouse is in right edge zone
    else if (mouseX > carouselWidth - edgeZoneWidth && mouseX < carouselWidth) {
      stopAutoSlide(); // Stop regular auto-slide
      if (!edgeScrollInterval && !isSliding) {
        // Immediate first slide when entering zone (if not on cooldown)
        nextSlide();
        // Then continue with interval
        startEdgeScroll('right');
      }
      carousel.style.cursor = 'e-resize';
      carousel.classList.add('edge-hover-right');
      carousel.classList.remove('edge-hover-left');
    }
    // Mouse is in center - stop edge scrolling
    else {
      stopEdgeScroll();
      carousel.style.cursor = 'default';
      carousel.classList.remove('edge-hover-left', 'edge-hover-right');
      if (!autoSlideInterval) {
        startAutoSlide(); // Resume auto-slide if it was stopped
      }
    }
  }

  // Pause auto-slide on hover
  carousel.addEventListener('mouseenter', () => {
    stopAutoSlide();
  });
  
  carousel.addEventListener('mouseleave', () => {
    stopEdgeScroll();
    carousel.style.cursor = 'default';
    carousel.classList.remove('edge-hover-left', 'edge-hover-right');
    startAutoSlide();
  });

  // Mouse move for edge detection
  carousel.addEventListener('mousemove', handleMouseMove);

  // Mouse drag functionality for promotional banner
  function handleDragStart(e) {
    // Don't drag if clicking buttons or links
    if (e.target.closest('button') || e.target.closest('a')) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragCurrentX = e.clientX;
    dragOffset = 0;
    carousel.style.cursor = 'grabbing';
    stopAutoSlide();
    stopEdgeScroll();
    
    // Add dragging class to current slide
    const currentSlide = slides[currentIndex];
    currentSlide.classList.add('dragging');
  }

  function handleDragMove(e) {
    if (!isDragging) return;
    dragCurrentX = e.clientX;
    dragOffset = dragCurrentX - dragStartX;
    
    // Apply transform in real-time
    const currentSlide = slides[currentIndex];
    const dragPercent = (dragOffset / carousel.offsetWidth) * 100;
    
    // Add resistance at boundaries
    let resistanceFactor = 1;
    if ((currentIndex === 0 && dragOffset > 0) || 
        (currentIndex === slides.length - 1 && dragOffset < 0)) {
      resistanceFactor = 0.3; // 70% resistance
    }
    
    currentSlide.style.transform = `translateX(${dragPercent * resistanceFactor}%)`;
    currentSlide.style.transition = 'none'; // Disable transition during drag
  }

  function handleDragEnd(e) {
    if (!isDragging) return;
    
    isDragging = false;
    carousel.style.cursor = 'default';
    
    const currentSlide = slides[currentIndex];
    currentSlide.classList.remove('dragging');
    currentSlide.classList.add('snapping');
    
    const diff = dragStartX - dragCurrentX;
    
    if (Math.abs(diff) > dragThreshold) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    } else {
      // Snap back to original position
      currentSlide.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      currentSlide.style.transform = 'translateX(0)';
      
      setTimeout(() => {
        currentSlide.classList.remove('snapping');
        currentSlide.style.transition = '';
      }, 400);
    }
    
    startAutoSlide();
  }

  function handleDragLeave() {
    if (isDragging) {
      isDragging = false;
      carousel.style.cursor = 'default';
      
      // Snap back to original position
      const currentSlide = slides[currentIndex];
      currentSlide.classList.remove('dragging');
      currentSlide.classList.add('snapping');
      currentSlide.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      currentSlide.style.transform = 'translateX(0)';
      
      setTimeout(() => {
        currentSlide.classList.remove('snapping');
        currentSlide.style.transition = '';
      }, 400);
      
      startAutoSlide();
    }
  }

  // Mouse drag events
  carousel.addEventListener('mousedown', handleDragStart);
  carousel.addEventListener('mousemove', handleDragMove);
  carousel.addEventListener('mouseup', handleDragEnd);
  carousel.addEventListener('mouseleave', handleDragLeave);

  // Touch events
  track.addEventListener('touchstart', handleTouchStart, { passive: true });
  track.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Initialize
  createDots();
  goToSlide(0);
  startAutoSlide();
}

