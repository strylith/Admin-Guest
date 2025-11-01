import { showToast } from '../components/toast.js';

export async function ForgotPasswordPage(){
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

  window.kinaShowLogin = () => {
    document.querySelector('.auth-modal')?.remove();
    location.hash = '#/auth';
  };

  window.kinaCloseModal = () => {
    // Remove all auth modals
    document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
    // Navigate back to home
    location.hash = '#/';
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
          <h2 style="color: white; font-size: 28px; margin: 0 0 8px;">Reset Your Password</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Enter your email to receive reset instructions</p>
        </div>
      </div>
      
      <!-- Forgot Password Form -->
      <div class="auth-forgot-form" style="padding: 24px; display: block;">
        <form onsubmit="kinaForgotPassword(event)" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">Email Address</label>
            <input type="email" name="email" required placeholder="Enter your email address" style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
            <small style="color: var(--color-muted); font-size: 12px; margin-top: 4px; display: block;">We'll send you a link to reset your password</small>
          </div>
          
          <button type="submit" style="width: 100%; padding: 16px; background: #ffd21c; color: var(--color-text); border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#e6c200'" onmouseout="this.style.background='#ffd21c'">Send Reset Instructions</button>
          
          <!-- Back to Login Link -->
          <div style="text-align: center; margin-top: 12px;">
            <p style="color: var(--color-muted); margin: 0; font-size: 14px;">
              Remember your password? 
              <a href="#/auth" onclick="kinaShowLogin()" style="color: #ffd21c; text-decoration: none; font-weight: 600;">Sign in here</a>
            </p>
          </div>
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
        padding: 20px 24px 16px !important;
      }
      .auth-forgot-form {
        padding: 20px !important;
      }
    }
  </style>`;
}
