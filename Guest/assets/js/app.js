// assets/js/app.js
import { renderHeader } from './components/header.js';
import { renderFooter } from './components/footer.js';
import { showToast } from './components/toast.js';
import { setBusy } from './components/loader.js';
import { HomePage } from './pages/home.js';
import { PackagesPage, initLuxuryPackages } from './pages/packages.js';
import { MyBookingsPage } from './pages/myBookings.js';
import { AuthPage } from './pages/auth.js';
import { RegisterPage } from './pages/register.js';
import { ForgotPasswordPage } from './pages/forgotPassword.js';
import { RoomsPage } from './pages/rooms.js';
import { WeatherPage } from './pages/weather.js';
import { CheckoutPage } from './pages/checkout.js';
import { AboutPage } from './pages/about.js';
import { TermsPage } from './pages/terms.js';
import { AdminDashboardPage, initAdminDashboard } from './pages/adminDashboard.js';
import { AdminBookingsPage, initAdminBookings } from './pages/adminBookings.js';
import { AdminUsersPage, initAdminUsers } from './pages/adminUsers.js';
import { AdminAuditPage, initAdminAudit } from './pages/adminAudit.js';
import { getAuthState } from './utils/state.js';
import { initSmoothScroll, destroySmoothScroll, scrollToTop } from './utils/smoothScroll.js';
import { initHomepageScrollAnimations, cleanupScrollAnimations } from './utils/scrollAnimation.js';
import './utils/auth.js'; // Initialize auth system
import './components/aiChat.js'; // AI Chat functionality
import { createDevAccountModal, shouldShowDevModal } from './components/devAccountModal.js';
import { createInterfaceSelector } from './components/interfaceSelector.js';

// Global variables for smooth scrolling and animations
let lenisInstance = null;
let scrollAnimations = null;

const routes = {
  '/': HomePage,
  '/packages': PackagesPage,
  '/rooms': MyBookingsPage, // My Bookings page (with Re-Edit feature)
  '/auth': AuthPage,
  '/register': RegisterPage,
  '/forgot-password': ForgotPasswordPage,
  '/weather': WeatherPage,
  '/checkout': CheckoutPage,
  '/about': AboutPage,
  '/terms': TermsPage,
  '/admin': AdminDashboardPage,
  '/admin/bookings': AdminBookingsPage,
  '/admin/users': AdminUsersPage,
  '/admin/audit': AdminAuditPage
};

function updateAdminVisibility(){
  // Admin features disabled - keeping function for compatibility but no-op
  const adminLinks = document.querySelectorAll('.admin-only');
  adminLinks.forEach(node => {
    node.hidden = true;
  });
}

async function router(){
  const hashPath = location.hash.replace('#','') || '/';
  const path = hashPath.split('?')[0]; // Extract path without query params
  
  // Scroll to top when navigating
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Cleanup previous scroll animations
  if (scrollAnimations) {
    cleanupScrollAnimations(scrollAnimations);
    scrollAnimations = null;
  }
  
  // Handle auth modal globally
  if(path === '/auth'){
    const authModalHTML = await AuthPage();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = authModalHTML;
    const authModal = tempDiv.firstElementChild;
    document.body.appendChild(authModal);
    return;
  }
  
  // Handle register modal globally
  if(path === '/register'){
    const registerModalHTML = await RegisterPage();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = registerModalHTML;
    const registerModal = tempDiv.firstElementChild;
    document.body.appendChild(registerModal);
    return;
  }
  
  // Handle forgot password modal globally
  if(path === '/forgot-password'){
    const forgotPasswordModalHTML = await ForgotPasswordPage();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = forgotPasswordModalHTML;
    const forgotPasswordModal = tempDiv.firstElementChild;
    document.body.appendChild(forgotPasswordModal);
    return;
  }
  
  const Page = routes[path] || (() => {
    const section = document.createElement('section');
    section.className = 'container';
    section.innerHTML = '<h2>Not Found</h2>';
    return section;
  });
  const main = document.getElementById('main');
  setBusy(true);
  try{
    const out = await Page();
    if(typeof out === 'string'){
      main.innerHTML = out;
    } else if(out instanceof Node){
      main.innerHTML = '';
      main.appendChild(out);
    } else {
      main.innerHTML = '';
    }
    
    // Initialize scroll animations for homepage (excluding section-why)
    if (path === '/' || path === '') {
      setTimeout(() => {
        scrollAnimations = initHomepageScrollAnimations();
      }, 100); // Small delay to ensure DOM is ready
    }
    
    // Initialize luxury packages for packages page
    if (path === '/packages') {
      setTimeout(() => {
        initLuxuryPackages();
      }, 100); // Small delay to ensure DOM is ready
    }
    
    // Initialize calendar page for weather page
    if (path === '/weather') {
      setTimeout(() => {
        if (window.initCalendarPage) {
          window.initCalendarPage();
        }
      }, 100); // Small delay to ensure DOM is ready
    }
    
    // Initialize admin pages
    if (path === '/admin') {
      setTimeout(() => {
        initAdminDashboard();
      }, 100);
    }
    
    if (path === '/admin/bookings') {
      setTimeout(() => {
        initAdminBookings();
      }, 100);
    }
    
    if (path === '/admin/users') {
      setTimeout(() => {
        initAdminUsers();
      }, 100);
    }
    
    if (path === '/admin/audit') {
      setTimeout(() => {
        initAdminAudit();
      }, 100);
    }
  }catch(err){
    console.error(err);
    showToast('Something went wrong loading this page.', 'error');
    main.innerHTML = `<section class="container"><h2>Error</h2><p>Please try again.</p></section>`;
  }finally{
    setBusy(false);
    updateAdminVisibility();
  }
}

function onReady(){
  renderHeader();
  renderFooter();
  
  // Initialize dev mode interface selector
  createInterfaceSelector();
  
  // Show dev account modal if in development
  if (shouldShowDevModal()) {
    setTimeout(() => {
      createDevAccountModal();
    }, 500); // Small delay for smoother UX
  }
  
  // Make auth state globally available
  window.getAuthState = getAuthState;
  
  // Make showToast globally available
  window.showToast = showToast;
  
  // Initialize smooth scrolling
  lenisInstance = initSmoothScroll();
  
  document.querySelector('.nav-toggle')?.addEventListener('click', () => {
    const menu = document.getElementById('primary-menu');
    const toggle = document.querySelector('.nav-toggle');
    const expanded = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(expanded));
    
    // Change icon based on menu state
    if(expanded) {
      toggle.textContent = '×';
    } else {
      toggle.textContent = '☰';
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('primary-menu');
    const toggle = document.querySelector('.nav-toggle');
    if(menu && toggle && !toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    }
  });
  
  // Close menu when clicking on a menu link
  document.getElementById('primary-menu')?.addEventListener('click', (e) => {
    if(e.target.tagName === 'A') {
      const menu = document.getElementById('primary-menu');
      const toggle = document.querySelector('.nav-toggle');
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = '☰';
    }
  });

  // Scroll to top for all anchor links
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
      // Small delay to allow hash change to process first
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  });
  window.addEventListener('hashchange', router);
  router();

  // Back to top behavior
  const backToTop = document.getElementById('back-to-top');
  if(backToTop){
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      backToTop.hidden = y < 320; // adjust reveal threshold if desired
    };
    // We'll bind click after scroller is initialized below
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Use Lenis smooth scrolling if available, otherwise fallback to native
  if(backToTop){
    backToTop.addEventListener('click', () => {
      if (lenisInstance) {
        scrollToTop();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  // AI Notification functionality
  initAINotification();

  // Lazy reveal for sections (exclude hero, why, footer)
  initSectionLazyLoad();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (lenisInstance) {
    destroySmoothScroll();
  }
  if (scrollAnimations) {
    cleanupScrollAnimations(scrollAnimations);
  }
});

// Optimized lazy reveal for sections - reduced animation complexity
function initSectionLazyLoad(){
  const sections = Array.from(document.querySelectorAll('main > section'));
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -5% 0px', threshold: 0.1 });
  sections.forEach(s => {
    s.classList.add('lazy-in');
    io.observe(s);
  });
}

// AI Notification functionality
function initAINotification(){
  let notificationInterval;
  let isNotificationVisible = false;
  
  function showAINotification(){
    const notification = document.getElementById('ai-notification');
    if(notification && !isNotificationVisible){
      notification.style.display = 'block';
      isNotificationVisible = true;
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        hideAINotification();
      }, 5000);
    }
  }
  
  function hideAINotification(){
    const notification = document.getElementById('ai-notification');
    if(notification){
      notification.style.display = 'none';
      isNotificationVisible = false;
    }
  }
  
  // Global function for close button
  window.closeAINotification = hideAINotification;
  
  // Show notification every 1 minute
  function startNotificationInterval(){
    notificationInterval = setInterval(() => {
      showAINotification();
    }, 60000);
  }
  
  // Show notification immediately on site load
  setTimeout(() => {
    showAINotification();
    startNotificationInterval();
  }, 2000);
  
  // Pause notifications when user is interacting with the page
  let userActivityTimeout;
  function resetNotificationTimer(){
    clearTimeout(userActivityTimeout);
    userActivityTimeout = setTimeout(() => {
      if(notificationInterval){
        clearInterval(notificationInterval);
        startNotificationInterval();
      }
    }, 30000); // Resume after 30 seconds of inactivity
  }
  
  // Listen for user activity
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetNotificationTimer, true);
  });
}