export function openModal(contentHtml){
  const root = document.getElementById('modal-root');
  if(!root) return;
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="card">${contentHtml}</div>`;
  
  function close(){ 
    wrap.remove(); 
    document.removeEventListener('keydown', onKey);
    // Restore background scrolling
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Re-enable Lenis smooth scrolling when modal is closed
    const lenisInstance = window.lenisInstance || document.querySelector('.lenis')?.lenis;
    if (lenisInstance) {
      lenisInstance.start();
    }
  }
  
  function onKey(e){ if(e.key === 'Escape') close(); }
  
  wrap.addEventListener('click', (e) => { if(e.target === wrap) close(); });
  
  // Prevent background scrolling when modal is open
  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
  
  // Disable Lenis smooth scrolling when modal is open
  const lenisInstance = window.lenisInstance || document.querySelector('.lenis')?.lenis;
  if (lenisInstance) {
    lenisInstance.stop();
  }
  
  // Prevent scroll events from bubbling to background
  wrap.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: false });
  
  // Prevent middle mouse scroll from affecting background
  wrap.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
    }
  });
  
  document.addEventListener('keydown', onKey);
  root.appendChild(wrap);
  return { close };
}


