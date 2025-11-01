import { setAuthState } from '../utils/state.js';
import { showToast } from '../components/toast.js';
import { AuthManager } from '../utils/auth.js';

export async function AuthPage(){
  window.kinaLogin = async (e) => {
    e.preventDefault();
    const form = e.target.closest('form');
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value.trim();
    
    if(!email || !password){
      showToast('Please fill in all fields','error'); 
      return; 
    }
    
    // Use the auth manager for login
    const result = await window.kinaAuth.login(email, password);
    
    if (result.success) {
      showToast('Login successful! Welcome back, ' + result.user.firstName + '!', 'success');
      window.kinaCloseModal();
      
      // Clear all booking-related intents and redirect to packages page
      setTimeout(() => {
        // Clear all booking intents from sessionStorage
        sessionStorage.removeItem('bookingIntent');
        sessionStorage.removeItem('calendarIntent');
        sessionStorage.removeItem('bookingModalIntent');
        
        console.log('[Auth] Cleared all booking intents, redirecting to packages page');
        
        // Redirect to packages page
        location.hash = '#/packages';
      }, 1000);
    } else {
      showToast(result.message, 'error');
    }
  };

  window.kinaShowRegister = () => {
    // Remove any existing modals
    document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
    // Small delay to ensure cleanup
    setTimeout(() => {
      location.hash = '#/register';
    }, 10);
  };

  window.kinaShowLogin = () => {
    // Remove any existing modals
    document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
    // Small delay to ensure cleanup
    setTimeout(() => {
      location.hash = '#/auth';
    }, 10);
  };

  window.kinaShowForgotPassword = () => {
    // Remove any existing modals
    document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
    // Small delay to ensure cleanup
    setTimeout(() => {
      location.hash = '#/forgot-password';
    }, 10);
  };

  window.kinaCloseModal = () => {
    // Remove all auth modals
    document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
    // Navigate back to home
    location.hash = '#/';
  };

  window.kinaForgotPassword = (e) => {
    e.preventDefault();
    const form = e.target.closest('form');
    const email = form.querySelector('input[name="email"]').value.trim();
    
    if(!email){
      showToast('Please enter your email address','error'); 
      return; 
    }
    
    showToast('Password reset instructions have been sent to your email.', 'success');
    window.kinaShowLogin();
  };

  window.kinaTogglePassword = (inputId) => {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      button.style.color = '#666';
    } else {
      input.type = 'password';
      button.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
      button.style.color = '#333';
    }
  };

  window.kinaGoogleSignIn = () => {
    showToast('Google Sign-In is only available for users who have already registered with their Gmail account.', 'info');
  };

  return `
  <div class="auth-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;">
    <div class="auth-modal-content" style="background: white; border-radius: 20px; max-width: 450px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25); position: relative;">
      <!-- Close button -->
      <button onclick="kinaCloseModal()" style="position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; background: transparent; border: none; color: white; cursor: pointer; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; opacity: 0.8; font-weight: 900; font-size: 24px; z-index: 1;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'; this.style.opacity='1'" onmouseout="this.style.backgroundColor='transparent'; this.style.opacity='0.8'">×</button>
      
      <!-- Header -->
      <div class="auth-header" style="background: linear-gradient(135deg, var(--color-accent) 0%, #2c5aa0 100%); padding: 24px 32px 20px; border-radius: 20px 20px 0 0; text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('images/kina1.jpg') center/cover; opacity: 0.1; z-index: 0;"></div>
        <div style="position: relative; z-index: 1;">
          <h2 style="color: white; font-size: 28px; margin: 0 0 8px;">Welcome to Kina Resort</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Sign in to access your account</p>
        </div>
      </div>
      
      <!-- Login Form -->
      <div class="auth-login-form" style="padding: 24px; display: block;">
        <form onsubmit="kinaLogin(event)" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">Email Address</label>
            <input type="email" name="email" required placeholder="Enter your email" style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">Password</label>
            <div style="position: relative;">
              <input type="password" name="password" id="login-password" required placeholder="Enter your password" style="width: 100%; padding: 14px 50px 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
              <button type="button" onclick="kinaTogglePassword('login-password')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #333; transition: color 0.2s ease;" onmouseover="this.style.color='#ffd21c'" onmouseout="this.style.color='#333'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
            </div>
          </div>
          <div style="text-align: right; margin-top: -4px;">
            <a href="#/forgot-password" onclick="kinaShowForgotPassword()" style="color: #ffd21c; text-decoration: none; font-size: 14px;">Forgot password?</a>
          </div>
          <button type="submit" style="width: 100%; padding: 16px; background: #ffd21c; color: var(--color-text); border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#e6c200'" onmouseout="this.style.background='#ffd21c'">Sign In</button>
          
          <!-- Register Link -->
          <div style="text-align: center; margin-top: 12px;">
            <p style="color: var(--color-muted); margin: 0; font-size: 14px;">
              Don't have an account? 
              <a href="#/register" onclick="kinaShowRegister()" style="color: #ffd21c; text-decoration: none; font-weight: 600;">Create one here</a>
            </p>
          </div>
          
          <!-- Divider -->
          <div style="display: flex; align-items: center; margin: 16px 0;">
            <div style="flex: 1; height: 1px; background: var(--border);"></div>
            <span style="padding: 0 16px; color: var(--color-muted); font-size: 14px;">or</span>
            <div style="flex: 1; height: 1px; background: var(--border);"></div>
          </div>
          
          <!-- Google Sign In -->
          <button type="button" onclick="kinaGoogleSignIn()" style="width: 100%; padding: 14px; background: white; color: var(--color-text); border: 2px solid var(--border); border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px;" onmouseover="this.style.borderColor='#ffd21c'" onmouseout="this.style.borderColor='var(--border)'">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  </div>
  
  <style>
    .auth-modal {
      animation: fadeIn 0.15s ease;
    }
    .auth-modal-content {
      animation: slideUp 0.15s ease;
    }
    .auth-tab-login.active, .auth-tab-register.active {
      color: #ffd21c !important;
      border-bottom-color: #ffd21c !important;
    }
    .auth-tab-login.active {
      color: #ffd21c !important;
      border-bottom: 3px solid #ffd21c !important;
    }
    .auth-tab-register.active {
      color: #ffd21c !important;
      border-bottom: 3px solid #ffd21c !important;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @media (max-width: 480px) {
      .auth-modal {
        padding: 10px;
      }
      .auth-modal-content {
        max-height: 95vh;
      }
      .auth-header {
        padding: 32px 24px 24px !important;
      }
      .auth-login-form, .auth-register-form {
        padding: 24px !important;
      }
      .auth-register-form div[style*="grid-template-columns: 1fr 1fr"] {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
    }
  </style>`;
}
