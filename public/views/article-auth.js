// article-auth.js - Dedicated authentication for article pages only
// This allows read-only access but disables interactive features for non-authenticated users

class ArticleAuth {
  constructor() {
    this.API_BASE = "https://worktoolshubv2.onrender.com/api";
    this.token = localStorage.getItem("adminToken");
    this.user = null;
    this.isAuthenticated = false;
  }

  // Check if user is authenticated
  async checkAuth() {
    if (!this.token) {
      this.isAuthenticated = false;
      return false;
    }

    try {
      const response = await fetch(`${this.API_BASE}/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: this.token }),
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.isAuthenticated = true;
        return true;
      }
    } catch (error) {
      console.error("Auth verification failed:", error);
    }

    this.isAuthenticated = false;
    return false;
  }

  // Initialize article page with read-only mode for non-authenticated users
  async initArticleAuth(options = {}) {
    const {
      showUserInfo = true,
      userInfoContainerId = "user-info",
      onAuthSuccess = null,
      onAuthFailed = null,
    } = options;

    const isAuthenticated = await this.checkAuth();

    if (isAuthenticated) {
      // User is authenticated - enable all features
      if (showUserInfo && this.user) {
        this.showUserInfo(userInfoContainerId);
      }
      if (onAuthSuccess) onAuthSuccess({ user: this.user, authenticated: true });
      return { success: true, authenticated: true, user: this.user };
    } else {
      // User is NOT authenticated - show read-only notice and disable interactions
      this.enableReadOnlyMode();
      if (onAuthFailed) onAuthFailed({ authenticated: false });
      return { success: true, authenticated: false, readOnly: true };
    }
  }

  // Enable read-only mode (show content but disable interactions)
  enableReadOnlyMode() {
    // Show sign-in notice
    const notice = document.getElementById('signInNotice');
    if (notice) {
      notice.style.display = 'flex';
      notice.innerHTML = '⚠️ Please <a href="/auth.html?redirect=' + 
        encodeURIComponent(window.location.href) + 
        '" target="_self">sign in</a> to interact with this article (upvote, mark helpful, suggest edits)';
    }
    
    // Disable interactive buttons
    const buttonsToDisable = [
      'upvoteBtn',
      'helpfulBtn', 
      'suggestEditBtn'
    ];

    buttonsToDisable.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.title = 'Sign in to use this feature';
      }
    });

    console.log('📖 Article in read-only mode - sign in to interact');
  }

  // Show user info in UI
  showUserInfo(containerId) {
    if (!this.user) return;

    const adminRoles = ["Super Admin", "Admin", "Editor", "Moderator"];
    const canAccessAdmin = adminRoles.includes(this.user.role);

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <img src="${
          this.user.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.name)}`
        }" 
             alt="${this.user.name}" 
             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1e293b;">${this.user.name}</div>
          <div style="font-size: 0.875rem; color: #64748b;">${this.user.role}</div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          ${
            canAccessAdmin
              ? `
            <button onclick="window.open('/tools/admin', '_blank')" 
                    style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
              Admin Panel
            </button>
          `
              : ""
          }
          <button onclick="articleAuth.logout()" 
                  style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
            Logout
          </button>
        </div>
      </div>
    `;
    }
  }

  // Logout
  async logout() {
    try {
      if (this.token) {
        await fetch(`${this.API_BASE}/admin/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: this.token }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;
    
    // Reload page to show read-only mode
    window.location.reload();
  }

  // Check if user can perform an action (returns boolean)
  canInteract() {
    return this.isAuthenticated;
  }

  // Show toast notification for blocked actions
  showAuthRequiredToast() {
    // Check if toast already exists
    if (document.querySelector('.article-auth-toast')) return;

    const toast = document.createElement('div');
    toast.className = 'article-auth-toast';
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-left: 4px solid #f59e0b;
        color: #78350f;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 350px;
        animation: slideIn 0.3s ease;
      ">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">🔒 Sign In Required</div>
        <div style="font-size: 0.875rem;">
          Please <a href="/auth.html?redirect=${encodeURIComponent(window.location.href)}" 
                     style="color: #3b82f6; text-decoration: underline;">sign in</a> 
          to interact with this article.
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Create global instance
const articleAuth = new ArticleAuth();