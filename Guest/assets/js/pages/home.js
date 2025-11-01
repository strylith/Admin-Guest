import { fetchWeatherSummary } from '../utils/api.js';
import { showToast } from '../components/toast.js';
import { initPromoBanner } from '../components/promotionalBanner.js';

export async function HomePage(){
  const tpl = document.getElementById('tpl-home');
  const frag = tpl.content.cloneNode(true);

  // Populate weather
  try{
    const w = await fetchWeatherSummary();
    const root = frag.querySelector('[data-weather-section]');
    if(root){
      root.querySelector('[data-w-temp]').textContent = `${w.current.tempC}°C`;
      root.querySelector('[data-w-cond]').textContent = `${w.current.icon} ${w.current.condition}`;
      root.querySelector('[data-w-loc]').textContent = w.location;
      root.querySelector('[data-w-sugg]').textContent = w.suggestion;
      const future = root.querySelector('[data-w-future]');
      future.innerHTML = w.nextDays.map(d => `
        <div class="chip" aria-label="${d.d} ${d.c}">
          <div style="font-weight:600">${d.d}</div>
          <div>${d.t}°C</div>
          <div style="color:var(--color-muted)">${d.c}</div>
        </div>
      `).join('');
    }
  }catch(e){
    showToast('Unable to load weather right now.', 'error');
  }

  // Lazy load feature images and reveal on scroll
  const features = Array.from(frag.querySelectorAll('.feature'));
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      const el = entry.target;
      if(entry.isIntersecting){
        el.classList.add('is-visible');
        const media = el.querySelector('.feature-media');
        const src = el.getAttribute('data-src');
        if(media && src){ media.style.backgroundImage = `url('${src}')`; }
        obs.unobserve(el);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
  features.forEach(el => io.observe(el));

  // Initialize pool section images
  const poolHero = frag.querySelector('.pool-hero');
  if (poolHero) {
    const src = poolHero.getAttribute('data-src');
    if (src) poolHero.style.backgroundImage = `url('${src}')`;
  }

  const poolGalleryItems = Array.from(frag.querySelectorAll('.pool-gallery-item'));
  poolGalleryItems.forEach(item => {
    const src = item.getAttribute('data-src');
    if (src) item.style.backgroundImage = `url('${src}')`;
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(frag);
  
  // Initialize promotional banner after DOM insertion
  setTimeout(() => {
    initPromoBanner();
  }, 100);

  // Initialize pool section scroll animation
  setTimeout(() => {
    initPoolScrollAnimation();
  }, 150);
  
  return wrapper;
}

// Pool section scroll animation - resets on each view like gallery
function initPoolScrollAnimation() {
  const poolSection = document.getElementById('section-pool');
  if (!poolSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Add visible class when scrolling into view
        entry.target.classList.add('is-visible');
      } else {
        // Remove visible class when scrolling out of view - this resets the animation
        entry.target.classList.remove('is-visible');
      }
    });
  }, {
    threshold: 0.15, // Trigger when 15% of the section is visible
    rootMargin: '0px 0px -50px 0px' // Start slightly before it comes into view
  });

  observer.observe(poolSection);
}


