// =============================
// Internal Tool Authentication System
// =============================

export class InternalToolAuth {
  constructor() {
    this.modalId = 'auth-modal';
    this.authorizedEmails = []; // Will be populated from API/env
    this.cacheKey = 'worktoolshub_auth';
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    this.init();
  }

  init() {
    this.createModal();
    this.bindEvents();
    this.loadAuthorizedEmails();
  }

  // Load authorized emails from your backend/API
  // async loadAuthorizedEmails() {
  //   try {
  //     // Replace this URL with your actual API endpoint
  //     const response = await fetch('/api/auth/authorized-emails');
  //     if (response.ok) {
  //       const data = await response.json();
  //       this.authorizedEmails = data.emails || [];
  //     }
  //   } catch (error) {
  //     console.error('Failed to load authorized emails:', error);
  //     // Fallback - you can remove this in production
  //     this.authorizedEmails = [
  //       'admin@company.com',
  //       'manager@company.com',
  //       'user@company.com'
  //     ];
  //   }
  // }
  async loadAuthorizedEmails() {
  // Temporary hardcoded list - replace with API call later
  this.authorizedEmails = [
    'ke.sevillejo@newfold.com',
    'manager@yourcompany.com'
  ];
  console.log('Using hardcoded authorized emails (development mode)');
}

  createModal() {
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.innerHTML = `
      <div class="auth-modal-overlay">
        <div class="auth-modal-content">
          <div class="auth-modal-header">
            <h3>Internal Tool Access</h3>
            <button class="auth-modal-close" aria-label="Close modal">&times;</button>
          </div>
          <div class="auth-modal-body">
            <p>This tool is for internal use only. Please enter your work email address to continue.</p>
            <form class="auth-form" id="authForm">
              <div class="form-group">
                <label for="workEmail">Work Email Address</label>
                <input 
                  type="email" 
                  id="workEmail" 
                  name="workEmail" 
                  required 
                  placeholder="you@company.com"
                  autocomplete="email"
                />
                <div class="error-message" id="authError"></div>
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="rememberMe" name="rememberMe" checked>
                  <span class="checkmark"></span>
                  Remember me (recommended)
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelAuth">Cancel</button>
                <button type="submit" class="btn-primary" id="submitAuth">
                  <span class="btn-text">Continue</span>
                  <span class="btn-loading" style="display: none;">
                    <span class="loading-spinner"></span>
                    Verifying...
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Add modal styles
    const styles = document.createElement('style');
    styles.textContent = `
      .auth-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .auth-modal-overlay.show {
        opacity: 1;
        visibility: visible;
      }

      .auth-modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        max-width: 450px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        transform: scale(0.9) translateY(20px);
        transition: transform 0.3s ease;
      }

      .auth-modal-overlay.show .auth-modal-content {
        transform: scale(1) translateY(0);
      }

      .auth-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 1.5rem 0 1.5rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 1.5rem;
      }

      .auth-modal-header h3 {
        margin: 0;
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .auth-modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #64748b;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .auth-modal-close:hover {
        background: #f1f5f9;
        color: #1e293b;
      }

      .auth-modal-body {
        padding: 0 1.5rem 1.5rem 1.5rem;
      }

      .auth-modal-body p {
        color: #64748b;
        margin-bottom: 1.5rem;
        line-height: 1.5;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        color: #374151;
        font-weight: 500;
        font-size: 0.875rem;
      }

      .form-group input[type="email"] {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 1rem;
        transition: all 0.2s ease;
        background: #fff;
      }

      .form-group input[type="email"]:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .checkbox-group {
        margin-bottom: 2rem;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 0.875rem;
        color: #374151;
      }

      .checkbox-label input[type="checkbox"] {
        margin-right: 0.75rem;
        transform: scale(1.1);
      }

      .error-message {
        color: #dc2626;
        font-size: 0.875rem;
        margin-top: 0.5rem;
        display: none;
      }

      .error-message.show {
        display: block;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
      }

      .btn-secondary, .btn-primary {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        position: relative;
      }

      .btn-secondary {
        background: #f8fafc;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }

      .btn-secondary:hover {
        background: #f1f5f9;
        color: #475569;
      }

      .btn-primary {
        background: #3b82f6;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #2563eb;
      }

      .btn-primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .btn-loading {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 480px) {
        .auth-modal-content {
          width: 95%;
          margin: 1rem;
        }
        
        .form-actions {
          flex-direction: column-reverse;
        }
        
        .btn-secondary, .btn-primary {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(modal);
  }

  bindEvents() {
    const modal = document.getElementById(this.modalId);
    const closeBtn = modal.querySelector('.auth-modal-close');
    const cancelBtn = modal.querySelector('#cancelAuth');
    const form = modal.querySelector('#authForm');
    const overlay = modal.querySelector('.auth-modal-overlay');

    // Close modal events
    closeBtn.addEventListener('click', () => this.hideModal());
    cancelBtn.addEventListener('click', () => this.hideModal());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hideModal();
    });

    // Form submission
    form.addEventListener('submit', (e) => this.handleAuth(e));

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalVisible()) {
        this.hideModal();
      }
    });
  }

  // Check if user should access internal tool
  checkInternalAccess(toolPath) {
    // Check if user is already authenticated and cached
    const cached = this.getCachedAuth();
    if (cached && this.isAuthValid(cached)) {
      return true; // Allow access
    }

    // Show authentication modal
    this.showModal(toolPath);
    return false; // Block access until authenticated
  }

  showModal(targetPath = null) {
    this.targetPath = targetPath;
    const modal = document.getElementById(this.modalId);
    const overlay = modal.querySelector('.auth-modal-overlay');
    const emailInput = modal.querySelector('#workEmail');
    
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Focus on email input after animation
    setTimeout(() => {
      emailInput.focus();
    }, 300);
  }

  hideModal() {
    const modal = document.getElementById(this.modalId);
    const overlay = modal.querySelector('.auth-modal-overlay');
    
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    
    // Clear form
    this.clearForm();
  }

  isModalVisible() {
    const modal = document.getElementById(this.modalId);
    return modal.querySelector('.auth-modal-overlay').classList.contains('show');
  }

  async handleAuth(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.workEmail.value.trim().toLowerCase();
    const rememberMe = form.rememberMe.checked;
    const errorDiv = document.getElementById('authError');
    const submitBtn = document.getElementById('submitAuth');
    
    // Show loading state
    this.setLoadingState(submitBtn, true);
    this.clearError();

    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Check against authorized emails
      const isAuthorized = await this.validateEmail(email);
      
      if (isAuthorized) {
        // Cache authentication if remember me is checked
        if (rememberMe) {
          this.cacheAuth(email);
        }
        
        // Hide modal and redirect
        this.hideModal();
        
        if (this.targetPath) {
          window.location.href = this.targetPath;
        }
      } else {
        throw new Error('Access denied. This email is not authorized for internal tools.');
      }
      
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoadingState(submitBtn, false);
    }
  }

  async validateEmail(email) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check against authorized emails list
    return this.authorizedEmails.includes(email);
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  cacheAuth(email) {
    const authData = {
      email: email,
      timestamp: Date.now(),
      expires: Date.now() + this.cacheExpiry
    };
    
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(authData));
    } catch (error) {
      console.warn('Failed to cache authentication:', error);
    }
  }

  getCachedAuth() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to retrieve cached auth:', error);
      return null;
    }
  }

  isAuthValid(authData) {
    if (!authData || !authData.expires) return false;
    
    // Check if expired
    if (Date.now() > authData.expires) {
      this.clearAuthCache();
      return false;
    }
    
    // Check if email is still authorized
    return this.authorizedEmails.includes(authData.email);
  }

  clearAuthCache() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.warn('Failed to clear auth cache:', error);
    }
  }

  setLoadingState(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    
    if (isLoading) {
      btnText.style.display = 'none';
      btnLoading.style.display = 'flex';
      button.disabled = true;
    } else {
      btnText.style.display = 'block';
      btnLoading.style.display = 'none';
      button.disabled = false;
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
  }

  clearError() {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
  }

  clearForm() {
    const form = document.getElementById('authForm');
    if (form) {
      form.reset();
      form.rememberMe.checked = true; // Keep remember me checked by default
      this.clearError();
    }
  }

  // Public method to manually logout
  logout() {
    this.clearAuthCache();
    // Optionally redirect to home page
    window.location.href = '/';
  }
}

// Usage in your tool links
export function initInternalToolAuth() {
  const auth = new InternalToolAuth();
  
  // Add click handlers to internal tool links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-internal="true"]');
    if (link) {
      e.preventDefault();
      const toolPath = link.getAttribute('href');
      
      if (auth.checkInternalAccess(toolPath)) {
        // User is already authenticated, proceed to tool
        window.location.href = toolPath;
      }
      // Otherwise modal will show automatically
    }
  });

  return auth;
}