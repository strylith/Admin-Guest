export function createInterfaceSelector() {
  // Only show in development
  if (window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return;
  }

  const existingSelector = document.getElementById('interface-selector');
  if (existingSelector) return;

  const selectorHTML = `
    <div id="interface-selector" class="interface-selector collapsed">
      <button class="selector-toggle" onclick="toggleInterfaceSelector()">
        🎯 Dev Mode
      </button>
      
      <div class="selector-content">
        <div class="selector-header">
          <h3>🎯 Interface Selector</h3>
          <p>Choose your view</p>
        </div>
        
        <div class="selector-buttons">
          <button class="interface-btn guest-btn" onclick="goToGuestInterface()">
            <div class="btn-icon">🏖️</div>
            <div class="btn-text">
              <strong>Guest Interface</strong>
              <span>Browse packages & make bookings</span>
            </div>
          </button>
          
          <button class="interface-btn admin-btn" onclick="goToAdminInterface()">
            <div class="btn-icon">🎛️</div>
            <div class="btn-text">
              <strong>Admin Dashboard</strong>
              <span>Manage bookings & users</span>
            </div>
          </button>
        </div>
        
        <div class="current-interface">
          Current: <span id="current-interface-label">Guest</span>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', selectorHTML);
  updateCurrentInterfaceLabel();
}

export function toggleInterfaceSelector() {
  const selector = document.getElementById('interface-selector');
  if (selector) {
    selector.classList.toggle('collapsed');
  }
}

export function goToGuestInterface() {
  window.location.hash = '#/packages';
  updateCurrentInterfaceLabel();
  
  // Show toast if available
  if (window.showToast) {
    window.showToast('Switched to Guest Interface', 'info');
  }
}

export function goToAdminInterface() {
  // Check if logged in
  if (!window.kinaAuth || !window.kinaAuth.isLoggedIn()) {
    if (window.showToast) {
      window.showToast('Please log in first', 'warning');
    }
    window.location.hash = '#/auth';
    return;
  }
  
  window.location.hash = '#/admin';
  updateCurrentInterfaceLabel();
  
  if (window.showToast) {
    window.showToast('Switched to Admin Dashboard', 'info');
  }
}

function updateCurrentInterfaceLabel() {
  const label = document.getElementById('current-interface-label');
  if (!label) return;
  
  const hash = window.location.hash;
  if (hash.includes('/admin')) {
    label.textContent = 'Admin';
    label.style.color = '#fbbf24';
  } else {
    label.textContent = 'Guest';
    label.style.color = '#22c55e';
  }
}

// Make functions global
window.toggleInterfaceSelector = toggleInterfaceSelector;
window.goToGuestInterface = goToGuestInterface;
window.goToAdminInterface = goToAdminInterface;

// Update label on hash change
window.addEventListener('hashchange', updateCurrentInterfaceLabel);

