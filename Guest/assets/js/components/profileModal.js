// Profile Modal Component
export function openProfileModal() {
  const authUser = localStorage.getItem('auth_user');
  if (!authUser) {
    return;
  }
  
  const user = JSON.parse(authUser);
  
  const modal = document.createElement('div');
  modal.className = 'profile-modal-overlay';
  modal.id = 'profile-modal-overlay';
  
  modal.innerHTML = `
    <div class="profile-modal">
      <button class="profile-modal-close" onclick="closeProfileModal()">×</button>
      <div class="profile-modal-header">
        <div class="profile-avatar">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h2>${user.firstName} ${user.lastName}</h2>
        <p class="profile-email">${user.email}</p>
      </div>
      
      <div class="profile-modal-body">
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-icon">🏆</div>
            <div class="profile-stat-content">
              <span class="profile-stat-value">${user.loyalty_points || 0}</span>
              <span class="profile-stat-label">Loyalty Points</span>
            </div>
          </div>
          
          <div class="profile-stat">
            <div class="profile-stat-icon">📅</div>
            <div class="profile-stat-content">
              <span class="profile-stat-value">${user.total_bookings || 0}</span>
              <span class="profile-stat-label">Total Bookings</span>
            </div>
          </div>
        </div>
        
        <div class="profile-info-section">
          <h3>Account Information</h3>
          <div class="profile-info-item">
            <span class="profile-info-label">Member Since</span>
            <span class="profile-info-value">${formatMemberSince(user.member_since)}</span>
          </div>
        </div>
        
        <div class="profile-action-section">
          <button class="profile-logout-btn" onclick="window.kinaAuth.logout()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeProfileModal();
    }
  });
}

function formatMemberSince(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

window.closeProfileModal = function() {
  const modal = document.getElementById('profile-modal-overlay');
  if (modal) {
    modal.remove();
  }
};

