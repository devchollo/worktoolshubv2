// =============================
// Page-Level Authentication Protection
// =============================

class PageAuthProtection {
  constructor() {
    this.cacheKey = 'worktoolshub_auth';
    this.apiUrl = 'https://worktoolshubv2.onrender.com/api/auth/verify-email';
    this.homeUrl = '/';
    this.init();
  }

  init() {
    // Check authentication immediately when script loads
    this.checkPageAccess();
  }

  async checkPageAccess() {
    // First check cached authentication
    const cachedAuth = this.getCachedAuth();
    
    if (cachedAuth && this.isAuthValid(cachedAuth)) {
      // User is authenticated via cache, allow access
      console.log('Access granted via cache');
      return;
    }

    // No valid cache, show authentication modal
    this.showAuthModal();
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
    
    return true;
  }

  clearAuthCache() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.warn('Failed to clear auth cache:', error);
    }
  }

  showAuthModal() {
    // Hide page content while showing modal
    document.body.style.overflow = 'hidden';
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'page-auth-modal';
    modalOverlay.innerHTML = `
      <div class="page-auth-overlay">
        <div class="page-auth-modal">
          <div class="modal-header">
            <h3>Access Required</h3>
          </div>
          <div class="modal-body">
            <p>This tool requires authentication. Please enter your work email address to continue.</p>
            <form id="pageAuthForm">
              <div class="form-group">
                <label for="pageEmailInput">Work Email Address</label>
                <input 
                  type="email" 
                  id="pageEmailInput" 
                  name="email" 
                  required 
                  placeholder="you@company.com"
                  autocomplete="email"
                />
                <div class="error-message" id="pageAuthError"></div>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="pageRememberMe" checked>
                  Remember me (recommended)
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-secondary" id="goBackBtn">Go Back</button>
                <button type="submit" class="btn-primary" id="continueBtn">
                  <span class="btn-text">Continue</span>
                  <span class="btn-loading" style="display: none;">
                    <span class="spinner"></span>
                    Verifying...
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .page-auth-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      }

      .page-auth-modal {
        background: white;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        max-width: 450px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideIn 0.3s ease;
      }

      .modal-header {
        padding: 2rem 2rem 1rem 2rem;
        border-bottom: 1px solid #e5e7eb;
        text-align: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: #1f2937;
      }

      .modal-body {
        padding: 2rem;
      }

      .modal-body p {
        color: #6b7280;
        margin-bottom: 2rem;
        text-align: center;
        line-height: 1.6;
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
        padding: 0.875rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 1rem;
        transition: all 0.2s ease;
        background: #fff;
        box-sizing: border-box;
      }

      .form-group input[type="email"]:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 0.875rem;
        color: #374151;
        margin-top: 1rem;
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
        padding: 0.5rem;
        background: #fef2f2;
        border-radius: 4px;
        border-left: 3px solid #dc2626;
      }

      .error-message.show {
        display: block;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
      }

      .btn-secondary, .btn-primary {
        flex: 1;
        padding: 0.875rem 1.5rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        position: relative;
        text-align: center;
      }

      .btn-secondary {
        background: #f9fafb;
        color: #6b7280;
        border: 2px solid #e5e7eb;
      }

      .btn-secondary:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .btn-primary {
        background: #3b82f6;
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        background: #2563eb;
        transform: translateY(-1px);
      }

      .btn-primary:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      .btn-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideIn {
        from { transform: translateY(20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @media (max-width: 480px) {
        .page-auth-modal {
          width: 95%;
          margin: 1rem;
        }
        
        .form-actions {
          flex-direction: column-reverse;
        }
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(modalOverlay);

    this.bindModalEvents();
  }

  bindModalEvents() {
    const form = document.getElementById('pageAuthForm');
    const goBackBtn = document.getElementById('goBackBtn');
    
    // Go back button
    goBackBtn.addEventListener('click', () => {
      window.location.href = this.homeUrl;
    });

    // Form submission
    form.addEventListener('submit', (e) => this.handleAuth(e));

    // Focus on email input
    setTimeout(() => {
      document.getElementById('pageEmailInput').focus();
    }, 300);
  }

  async handleAuth(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value.trim().toLowerCase();
    const rememberMe = form.querySelector('#pageRememberMe').checked;
    const errorDiv = document.getElementById('pageAuthError');
    const continueBtn = document.getElementById('continueBtn');
    
    // Show loading state
    this.setLoadingState(continueBtn, true);
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
        
        // Hide modal and allow access to page
        this.hideModal();
        
      } else {
        throw new Error('Access denied. This email is not authorized for internal tools.');
      }
      
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoadingState(continueBtn, false);
    }
  }

  async validateEmail(email) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email })
      });

      if (response.ok) {
        const data = await response.json();
        return data.authorized;
      }
      
      return false;
    } catch (error) {
      console.error('Email verification failed:', error);
      throw new Error('Verification service unavailable. Please try again later.');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  cacheAuth(email) {
    const authData = {
      email: email,
      timestamp: Date.now(),
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(authData));
    } catch (error) {
      console.warn('Failed to cache authentication:', error);
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
    const errorDiv = document.getElementById('pageAuthError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
  }

  clearError() {
    const errorDiv = document.getElementById('pageAuthError');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
  }

  hideModal() {
    const modal = document.getElementById('page-auth-modal');
    if (modal) {
      modal.remove();
    }
    document.body.style.overflow = '';
  }
}

// Initialize protection when script loads
new PageAuthProtection();