import { setAuthState } from '../utils/state.js';
import { showToast } from '../components/toast.js';
import { AuthManager } from '../utils/auth.js';

export async function RegisterPage(){
  // Enable scrolling for registration modal
  setTimeout(() => {
    const authModal = document.querySelector('.auth-modal');
    const authModalContent = document.querySelector('.auth-modal-content');
    
    if (authModal && authModalContent) {
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
      
      // Ensure modal content can scroll with all methods
      authModalContent.style.overflowY = 'auto';
      authModalContent.style.overflowX = 'hidden';
      authModalContent.style.maxHeight = '90vh';
      
      // Set max-height on mobile
      if (window.innerWidth <= 768) {
        authModalContent.style.maxHeight = 'calc(100vh - 20px)';
      }
      
      // Handle middle mouse button drag scrolling
      let lastY = 0;
      let isScrolling = false;
      
      // Store handlers for cleanup
      const wheelHandler = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = authModalContent;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        
        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
          return;
        }
        e.stopPropagation();
      };
      
      const mousedownHandler = (e) => {
        if (e.button === 1) {
          e.preventDefault();
          isScrolling = true;
          lastY = e.clientY;
        }
      };
      
      const mousemoveHandler = (e) => {
        if (isScrolling && e.buttons === 4) {
          e.preventDefault();
          const deltaY = lastY - e.clientY;
          authModalContent.scrollTop += deltaY * 2;
          lastY = e.clientY;
        }
      };
      
      const mouseupHandler = (e) => {
        if (e.button === 1) {
          isScrolling = false;
        }
      };
      
      authModalContent.addEventListener('wheel', wheelHandler, { passive: true });
      authModalContent.addEventListener('mousedown', mousedownHandler);
      authModalContent.addEventListener('mousemove', mousemoveHandler);
      document.addEventListener('mouseup', mouseupHandler);
      
      // Cleanup on modal close
      const originalClose = window.kinaCloseModal || function() {
        document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
        location.hash = '#/';
      };
      
      window.kinaCloseModal = function() {
        document.body.style.overflow = '';
        authModalContent.removeEventListener('wheel', wheelHandler);
        authModalContent.removeEventListener('mousedown', mousedownHandler);
        authModalContent.removeEventListener('mousemove', mousemoveHandler);
        document.removeEventListener('mouseup', mouseupHandler);
        originalClose();
      };
    }
  }, 100);
  
  window.kinaRegister = async (e) => {
    e.preventDefault();
    const form = e.target.closest('form');
    const firstName = form.querySelector('input[name="firstName"]').value.trim();
    const lastName = form.querySelector('input[name="lastName"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value.trim();
    const confirmPassword = form.querySelector('input[name="confirmPassword"]').value.trim();
    const termsAgreed = form.querySelector('input[name="termsAgreed"]').checked;
    const privacyAgreed = form.querySelector('input[name="privacyAgreed"]').checked;
    const cookiesAgreed = form.querySelector('input[name="cookiesAgreed"]').checked;
    const personalInfoAgreed = form.querySelector('input[name="personalInfoAgreed"]').checked;
    
    // Validation
    if(!firstName || !lastName || !email || !password || !confirmPassword){
      showToast('All fields are required','error'); 
      return; 
    }
    
    if(password !== confirmPassword){
      showToast('Passwords do not match','error'); 
      return; 
    }
    
    if(password.length < 8){
      showToast('Password must be at least 8 characters','error'); 
      return; 
    }
    
    if(!termsAgreed || !privacyAgreed || !cookiesAgreed || !personalInfoAgreed){
      showToast('Please agree to all terms and conditions','error'); 
      return; 
    }
    
    // Use the auth manager for registration
    const result = await window.kinaAuth.register({
      firstName,
      lastName,
      email,
      password
    });
    
    if (result.success) {
      showToast('Registration successful! Welcome to Kina Resort, ' + result.user.firstName + '!', 'success');
      window.kinaCloseModal();
      // Redirect to return URL or homepage
      setTimeout(() => {
        const returnParam = new URLSearchParams(location.hash.split('?')[1] || '').get('return');
        location.hash = returnParam || '#/';
      }, 1000);
    } else {
      showToast(result.message, 'error');
    }
  };

  window.kinaShowLogin = () => {
    location.hash = '#/auth';
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

  window.kinaSelectAll = (selectAllCheckbox) => {
    const checkboxes = [
      document.getElementById('termsAgreed'),
      document.getElementById('privacyAgreed'),
      document.getElementById('cookiesAgreed'),
      document.getElementById('personalInfoAgreed')
    ];
    
    checkboxes.forEach(checkbox => {
      if (checkbox) {
        checkbox.checked = selectAllCheckbox.checked;
      }
    });
  };

  return `
  <div class="auth-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: flex-start; z-index: 1000; padding: 40px 20px 20px; overflow-y: auto; -webkit-overflow-scrolling: touch;">
    <div class="auth-modal-content" style="background: white; border-radius: 20px; max-width: 500px; width: 100%; margin: 0 auto; box-shadow: 0 25px 50px rgba(0,0,0,0.25); position: relative;">
      <!-- Close button -->
      <button onclick="kinaCloseModal()" style="position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; background: transparent; border: none; color: white; cursor: pointer; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; opacity: 0.8; font-weight: 900; font-size: 24px; z-index: 1;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'; this.style.opacity='1'" onmouseout="this.style.backgroundColor='transparent'; this.style.opacity='0.8'">×</button>
      
      <!-- Header -->
      <div class="auth-header" style="background: linear-gradient(135deg, var(--color-accent) 0%, #2c5aa0 100%); padding: 40px 32px 32px; border-radius: 20px 20px 0 0; text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('images/kina1.jpg') center/cover; opacity: 0.1; z-index: 0;"></div>
        <div style="position: relative; z-index: 1;">
          <h2 style="color: white; font-size: 28px; margin: 0 0 8px;">Join Kina Resort</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Create your account to get started</p>
        </div>
      </div>
      
      <!-- Register Form -->
      <div class="auth-register-form" style="padding: 32px; display: block;">
        <form onsubmit="kinaRegister(event)" style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Name Fields -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">First Name <span style="color: red;">*</span></label>
              <input type="text" name="firstName" required placeholder="First name" style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
            </div>
            <div>
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">Last Name <span style="color: red;">*</span></label>
              <input type="text" name="lastName" required placeholder="Last name" style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
            </div>
          </div>
          
          <!-- Email Field -->
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">Email Address <span style="color: red;">*</span></label>
            <input type="email" name="email" required placeholder="Enter your email address" style="width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
            <small style="color: var(--color-muted); font-size: 12px; margin-top: 4px; display: block;">We'll send a verification email to this address</small>
          </div>
          
          <!-- Password Fields -->
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">Password <span style="color: red;">*</span></label>
            <div style="position: relative;">
              <input type="password" name="password" id="register-password" required placeholder="Create a strong password" style="width: 100%; padding: 14px 50px 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
              <button type="button" onclick="kinaTogglePassword('register-password')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #333; transition: color 0.2s ease;" onmouseover="this.style.color='#ffd21c'" onmouseout="this.style.color='#333'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
            </div>
            <small style="color: var(--color-muted); font-size: 12px; margin-top: 4px; display: block;">Must be at least 8 characters long</small>
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--color-text);">Confirm Password <span style="color: red;">*</span></label>
            <div style="position: relative;">
              <input type="password" name="confirmPassword" id="register-confirm-password" required placeholder="Confirm your password" style="width: 100%; padding: 14px 50px 14px 16px; border-radius: 12px; border: 1px solid #d1d5db; background: #f9fafb; transition: all 0.2s ease; font-size: 16px; outline: none;" onfocus="this.style.background='white'; this.style.borderColor='#38b6ff'; this.style.boxShadow='0 0 0 3px rgba(56, 182, 255, 0.1)'" onblur="this.style.background='#f9fafb'; this.style.borderColor='#d1d5db'; this.style.boxShadow='none'">
              <button type="button" onclick="kinaTogglePassword('register-confirm-password')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #333; transition: color 0.2s ease;" onmouseover="this.style.color='#ffd21c'" onmouseout="this.style.color='#333'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
            </div>
          </div>
          
          <!-- Agreement Checkboxes -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
            <h4 style="margin: 0 0 16px; color: var(--color-text); font-size: 16px;">Terms & Agreements <span style="color: red;">*</span></h4>
            
            <!-- Select All Checkbox -->
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #ddd;">
              <input type="checkbox" id="selectAll" style="accent-color: #2c5aa0;" onchange="kinaSelectAll(this)">
              <label for="selectAll" style="font-size: 14px; color: var(--color-text); cursor: pointer; line-height: 1.4; font-weight: 600;">
                Select All Agreements
              </label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <input type="checkbox" name="termsAgreed" id="termsAgreed" required style="accent-color: #2c5aa0;">
              <label for="termsAgreed" style="font-size: 14px; color: var(--color-text); cursor: pointer; line-height: 1.4;">
                I agree to the <a href="#/terms" style="color: #2c5aa0; text-decoration: none;">Terms and Conditions</a>
              </label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <input type="checkbox" name="privacyAgreed" id="privacyAgreed" required style="accent-color: #2c5aa0;">
              <label for="privacyAgreed" style="font-size: 14px; color: var(--color-text); cursor: pointer; line-height: 1.4;">
                I agree to the <a href="#/" style="color: #2c5aa0; text-decoration: none;">Privacy Policy</a>
              </label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <input type="checkbox" name="cookiesAgreed" id="cookiesAgreed" required style="accent-color: #2c5aa0;">
              <label for="cookiesAgreed" style="font-size: 14px; color: var(--color-text); cursor: pointer; line-height: 1.4;">
                I agree to the <a href="#/" style="color: #2c5aa0; text-decoration: none;">Cookie Policy</a>
              </label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="checkbox" name="personalInfoAgreed" id="personalInfoAgreed" required style="accent-color: #2c5aa0;">
              <label for="personalInfoAgreed" style="font-size: 14px; color: var(--color-text); cursor: pointer; line-height: 1.4;">
                I consent to the use of my personal information for account management and service delivery
              </label>
            </div>
          </div>
          
          <button type="submit" style="width: 100%; padding: 16px; background: #ffd21c; color: var(--color-text); border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#e6c200'" onmouseout="this.style.background='#ffd21c'">Create Account</button>
          
          <!-- Login Link -->
          <div style="text-align: center; margin-top: 16px;">
            <p style="color: var(--color-muted); margin: 0; font-size: 14px;">
              Already have an account? 
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
      max-height: 90vh;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      cursor: default;
      /* Ensure scrollbar is visible when needed */
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
    }
    
    /* Webkit scrollbar styling */
    .auth-modal-content::-webkit-scrollbar {
      width: 8px;
    }
    
    .auth-modal-content::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 4px;
    }
    
    .auth-modal-content::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      transition: background 0.3s ease;
    }
    
    .auth-modal-content::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.5);
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @media (max-width: 768px) {
      .auth-modal {
        padding: 10px !important;
        padding-top: 20px !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        align-items: flex-start !important;
      }
      .auth-modal-content {
        max-height: calc(100vh - 20px) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        width: 100% !important;
        margin: 0 !important;
      }
      .auth-header {
        padding: 24px 20px 20px !important;
      }
      .auth-header h2 {
        font-size: 24px !important;
      }
      .auth-register-form {
        padding: 20px !important;
      }
      .auth-register-form div[style*="grid-template-columns: 1fr 1fr"] {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
    }
    
    /* Ensure scrolling works on desktop */
    @media (min-width: 769px) {
      .auth-modal {
        align-items: flex-start;
        padding-top: 40px;
        padding-bottom: 40px;
      }
      .auth-modal-content {
        max-height: 90vh;
      }
    }
    
    /* Tablet responsiveness */
    @media (min-width: 481px) and (max-width: 768px) {
      .auth-modal {
        padding: 20px !important;
      }
      .auth-modal-content {
        max-height: 85vh !important;
      }
    }
  </style>`;
}
