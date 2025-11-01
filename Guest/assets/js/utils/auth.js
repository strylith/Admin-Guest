// Simple authentication system for testing
import { setAuthState } from './state.js';
import { login as apiLogin, register as apiRegister } from './api.js';

// API base is centralized in utils/api.js; avoid direct fetches here

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.updateHeaderForLoggedInUser();
        
        // Sync with global auth state
        setAuthState({
          isLoggedIn: true,
          user: this.currentUser,
          role: this.currentUser.role || 'customer'
        });
      } catch (e) {
        // Clear invalid data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  }

  // Test credentials for development
  getTestUsers() {
    return [
      {
        id: 'test1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        password: 'password123',
        memberSince: '2024-01-15',
        loyaltyPoints: 1250,
        totalBookings: 3
      },
      {
        id: 'test2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        password: 'password123',
        memberSince: '2024-03-20',
        loyaltyPoints: 850,
        totalBookings: 2
      }
    ];
  }

  async login(email, password) {
    try {
      const data = await apiLogin(email, password);
      if (data && (data.success === undefined || data.success || data.token || data.user)) {
        // Store token and user
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        this.currentUser = data.user;
        this.updateHeaderForLoggedInUser();
        
        // Sync with global auth state
        setAuthState({
          isLoggedIn: true,
          user: data.user,
          role: data.user.role || 'customer'
        });
        
        return { success: true, user: data.user };
        return { success: true, user: data.user };
      }
      return { success: false, message: data?.error || 'Invalid email or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Failed to connect to server. Make sure backend is running.' };
    }
  }

  async register(userData) {
    try {
      const data = await apiRegister(userData);
      if (data && (data.success === undefined || data.success || data.token || data.user)) {
        // Store token and user
        if (data.token) localStorage.setItem('auth_token', data.token);
        if (data.user) localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        this.currentUser = data.user;
        this.updateHeaderForLoggedInUser();
        
        // Sync with global auth state
        setAuthState({
          isLoggedIn: true,
          user: data.user,
          role: data.user.role || 'customer'
        });
        
        return { success: true, user: data.user };
      }
      return { success: false, message: data?.error || 'Registration failed' };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Failed to connect to server: ' + error.message };
    }
  }

  logout() {
    // Clear Supabase tokens
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('kina_user');
    
    this.currentUser = null;
    this.updateHeaderForLoggedOut();
    
    // Clear global auth state
    setAuthState({
      isLoggedIn: false,
      user: null,
      role: 'guest'
    });
    
    location.hash = '#/';
    location.reload();
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }

  updateHeaderForLoggedInUser() {
    const loginLink = document.querySelector('a[href="#/auth"]');
    if (loginLink && this.currentUser) {
      loginLink.innerHTML = `
        <div class="user-menu" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: white;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="user-name" style="color: white; font-weight: 600;">${this.currentUser.firstName}</span>
        </div>
      `;
      
      // Add click handler to open profile modal
      const userMenu = loginLink.querySelector('.user-menu');
      if (userMenu) {
        userMenu.onclick = (e) => {
          e.preventDefault();
          import('../components/profileModal.js').then(module => {
            module.openProfileModal();
          });
        };
      }
    }
  }

  updateHeaderForLoggedOut() {
    const loginLink = document.querySelector('a[href="#/auth"]');
    if (loginLink) {
      loginLink.innerHTML = 'Login';
      loginLink.onclick = null;
    }
  }
}

// Create global auth instance
window.kinaAuth = new AuthManager();

// Export for use in other modules
export { AuthManager };
