// Packages Slider Component
export function initPackagesSlider(sectionId, packages) {
  const slider = document.getElementById(`${sectionId}-slider`);
  if (!slider || !packages || packages.length === 0) return;

  const track = slider.querySelector('.packages-slider-track');
  const slides = Array.from(track.querySelectorAll('.package-slide'));
  const prevBtn = slider.querySelector('.packages-slider-prev');
  const nextBtn = slider.querySelector('.packages-slider-next');
  const dotsContainer = slider.querySelector('.packages-slider-dots');

  let currentIndex = 0;
  let autoSlideInterval = null;
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let isSliding = false;
  let dragOffset = 0;
  let initialTransform = 0;
  
  const autoSlideDelay = 5000; // 5 seconds
  const slideCooldown = 1000; // 1 second cooldown
  const dragThreshold = 50; // 50px minimum drag to trigger slide

  // Create navigation dots
  function createDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement('button');
      dot.className = 'packages-slider-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => {
        goToSlide(i);
        stopAutoSlide();
        startAutoSlide();
      });
      dotsContainer.appendChild(dot);
    }
  }

  // Update dots
  function updateDots() {
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('.packages-slider-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  // Go to specific slide
  function goToSlide(index, direction = null) {
    if (isSliding || index === currentIndex) return;
    
    isSliding = true;
    const oldIndex = currentIndex;
    currentIndex = index;

    const newSlide = slides[currentIndex];
    const oldSlide = slides[oldIndex];

    // Determine direction
    if (!direction) {
      direction = (currentIndex > oldIndex) ? 'next' : 'prev';
    }

    // Position new slide
    newSlide.style.transform = direction === 'next' ? 'translateX(100%)' : 'translateX(-100%)';
    newSlide.style.opacity = '1';
    newSlide.style.visibility = 'visible';
    newSlide.style.zIndex = '2';

    // Trigger reflow
    newSlide.offsetHeight;

    // Animate slides
    requestAnimationFrame(() => {
      newSlide.style.transform = 'translateX(0)';
      oldSlide.style.transform = direction === 'next' ? 'translateX(-100%)' : 'translateX(100%)';

      setTimeout(() => {
        oldSlide.style.opacity = '0';
        oldSlide.style.visibility = 'hidden';
        oldSlide.style.zIndex = '0';
        oldSlide.style.transform = 'translateX(0)';

        setTimeout(() => {
          isSliding = false;
        }, slideCooldown - 800);
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

  // Auto-slide
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

  // Mouse drag functionality
  function handleMouseDown(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    isDragging = true;
    startX = e.clientX;
    currentX = e.clientX;
    dragOffset = 0;
    initialTransform = 0;
    slider.style.cursor = 'grabbing';
    stopAutoSlide();
    
    // Add dragging class to current slide
    const currentSlide = slides[currentIndex];
    currentSlide.classList.add('dragging');
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    currentX = e.clientX;
    dragOffset = currentX - startX;
    
    // Apply transform in real-time
    const currentSlide = slides[currentIndex];
    const dragPercent = (dragOffset / slider.offsetWidth) * 100;
    
    // Add resistance at boundaries
    let resistanceFactor = 1;
    if ((currentIndex === 0 && dragOffset > 0) || 
        (currentIndex === slides.length - 1 && dragOffset < 0)) {
      resistanceFactor = 0.3; // 70% resistance
    }
    
    currentSlide.style.transform = `translateX(${dragPercent * resistanceFactor}%)`;
    currentSlide.style.transition = 'none'; // Disable transition during drag
  }

  function handleMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    slider.style.cursor = 'grab';
    
    const currentSlide = slides[currentIndex];
    currentSlide.classList.remove('dragging');
    currentSlide.classList.add('snapping');
    
    const diff = startX - currentX;
    
    if (Math.abs(diff) > dragThreshold) {
      // Trigger slide change
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

  function handleMouseLeave() {
    if (isDragging) {
      isDragging = false;
      slider.style.cursor = 'grab';
      
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

  // Touch support
  let touchStartX = 0;
  
  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    stopAutoSlide();
  }

  function handleTouchEnd(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > dragThreshold) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    
    startAutoSlide();
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

  // Mouse events
  slider.addEventListener('mousedown', handleMouseDown);
  slider.addEventListener('mousemove', handleMouseMove);
  slider.addEventListener('mouseup', handleMouseUp);
  slider.addEventListener('mouseleave', handleMouseLeave);

  // Touch events
  track.addEventListener('touchstart', handleTouchStart, { passive: true });
  track.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Pause on hover
  slider.addEventListener('mouseenter', stopAutoSlide);
  slider.addEventListener('mouseleave', () => {
    if (!isDragging) startAutoSlide();
  });

  // Initialize
  createDots();
  if (slides.length > 0) {
    slides[0].style.opacity = '1';
    slides[0].style.visibility = 'visible';
  }
  startAutoSlide();
  slider.style.cursor = 'grab';
}

