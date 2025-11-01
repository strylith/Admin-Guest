// Helper function to show toast notifications
function showSuccessToast(message) {
  if (window.showToast) {
    window.showToast(message, 'success');
  } else {
    alert(message);
  }
}

// Development-only account selector modal
export function createDevAccountModal() {
  // Pre-configured mock accounts
  const mockAccounts = [
    {
      id: 'admin',
      email: 'admin@kinaresort.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      description: 'Full admin access'
    },
    {
      id: 'customer1',
      email: 'john@example.com',
      password: 'customer123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      description: 'Regular customer account'
    },
    {
      id: 'customer2',
      email: 'jane@example.com',
      password: 'customer123',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'customer',
      description: 'Regular customer with bookings'
    }
  ];

  const modal = document.createElement('div');
  modal.id = 'dev-account-modal';
  modal.className = 'dev-modal-overlay';
  
  modal.innerHTML = `
    <div class="dev-modal-content">
      <div class="dev-modal-header">
        <h2>🔧 Development Mode</h2>
        <p>Select an account to test with or create a new one</p>
      </div>
      
      <div class="dev-modal-body">
        <div class="dev-accounts-section">
          <h3>Quick Login</h3>
          <div class="dev-accounts-grid">
            ${mockAccounts.map(account => `
              <div class="dev-account-card" data-account='${JSON.stringify(account)}'>
                <div class="dev-account-icon">${account.role === 'admin' ? '👤' : '👨'}</div>
                <div class="dev-account-info">
                  <h4>${account.firstName} ${account.lastName}</h4>
                  <p class="dev-account-email">${account.email}</p>
                  <p class="dev-account-desc">${account.description}</p>
                  <span class="dev-account-badge ${account.role}">${account.role}</span>
                </div>
                <button class="dev-select-btn" onclick="devSelectAccount('${account.id}')">
                  Select
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="dev-divider">
          <span>OR</span>
        </div>
        
        <div class="dev-create-section">
          <h3>Create New Test Account</h3>
          <form id="dev-create-account-form" onsubmit="devCreateAccount(event)">
            <div class="dev-form-row">
              <input type="text" name="firstName" placeholder="First Name" required>
              <input type="text" name="lastName" placeholder="Last Name" required>
            </div>
            <div class="dev-form-row">
              <input type="email" name="email" placeholder="Email" required>
              <input type="password" name="password" placeholder="Password" value="test123" required>
            </div>
            <button type="submit" class="dev-create-btn">Create & Login</button>
          </form>
        </div>
      </div>
      
      <div class="dev-modal-footer">
        <button class="dev-continue-guest" onclick="devContinueAsGuest()">
          Continue as Guest (No Login)
        </button>
        <button class="dev-close-btn" onclick="devCloseModal()">
          Skip & Use Normal Login
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Store mock accounts globally for quick access
  window.DEV_MOCK_ACCOUNTS = mockAccounts;
}

// Select and auto-login with mock account
window.devSelectAccount = async function(accountId) {
  const account = window.DEV_MOCK_ACCOUNTS.find(acc => acc.id === accountId);
  if (!account) return;
  
  try {
    // Try to login with existing account
    const { login } = await import('../utils/api.js');
    const data = await login(account.email, account.password);
    
    if (data.success) {
      // Store token and user
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      // Update auth state
      if (window.setAuthState) {
        window.setAuthState({
          isLoggedIn: true,
          user: data.user,
          role: data.user.role || 'customer'
        });
      }
      
      devCloseModal();
      showSuccessToast(`✅ Logged in as ${account.firstName} ${account.lastName}`);
      location.hash = '#/';
      location.reload();
    } else {
      // Account doesn't exist, create it
      await devRegisterAccount(account);
    }
  } catch (error) {
    console.error('Dev login error:', error);
    // Try to register if login fails
    await devRegisterAccount(account);
  }
};

// Register a new account
async function devRegisterAccount(account) {
  try {
    const { register } = await import('../utils/api.js');
    const data = await register({
      email: account.email,
      password: account.password,
      firstName: account.firstName,
      lastName: account.lastName
    });
    
    if (data.success) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      if (window.setAuthState) {
        window.setAuthState({
          isLoggedIn: true,
          user: data.user,
          role: 'customer'
        });
      }
      
      devCloseModal();
      showSuccessToast(`✅ Account created and logged in as ${account.firstName}`);
      location.hash = '#/';
      location.reload();
    } else {
      alert('Failed to create account: ' + data.error);
    }
  } catch (error) {
    console.error('Dev register error:', error);
    alert('Failed to create account. Make sure the backend is running.');
  }
}

// Create new custom test account
window.devCreateAccount = async function(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  const account = {
    email: formData.get('email'),
    password: formData.get('password') || 'test123',
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    role: 'customer'
  };
  
  await devRegisterAccount(account);
};

// Continue without logging in
window.devContinueAsGuest = function() {
  devCloseModal();
  alert('👤 Continuing as guest. You can login anytime from the header.');
};

// Close modal and use normal login
window.devCloseModal = function() {
  const modal = document.getElementById('dev-account-modal');
  if (modal) {
    modal.remove();
  }
  
  // Store preference to not show again this session
  sessionStorage.setItem('dev_modal_dismissed', 'true');
};

// Check if modal should be shown
export function shouldShowDevModal() {
  // Only show in development
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return false;
  }
  
  // Don't show if already dismissed this session
  if (sessionStorage.getItem('dev_modal_dismissed')) {
    return false;
  }
  
  // Don't show if already logged in
  const authToken = localStorage.getItem('auth_token');
  if (authToken) {
    return false;
  }
  
  return true;
}

