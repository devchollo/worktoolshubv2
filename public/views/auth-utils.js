// auth-utils.js - Include this in your tool pages
class AuthUtils {
  constructor() {
    this.API_BASE = "https://worktoolshubv2.onrender.com/api";
    this.token = localStorage.getItem("adminToken");
    this.user = null;
  }

  // Check if user is authenticated
  async isAuthenticated() {
    if (!this.token) return false;

    try {
      const response = await fetch(`${this.API_BASE}/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: this.token }),
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        return true;
      }
    } catch (error) {
      console.error("Auth verification failed:", error);
    }

    this.clearAuth();
    return false;
  }

  // Check if user can access a specific tool
  async checkToolAccess(toolName) {
    if (!(await this.isAuthenticated())) {
      return { hasAccess: false, requiresAuth: true };
    }

    try {
      const response = await fetch(`${this.API_BASE}/auth/check-tool-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ tool: toolName }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Tool access check failed:", error);
    }

    return { hasAccess: false, requiresAuth: true };
  }

  // Redirect to auth page with return URL
  redirectToAuth(toolName = null, toolDescription = null, toolPath = null) {
    const currentUrl = toolPath || window.location.href;
    let authUrl = `/auth.html?redirect=${encodeURIComponent(currentUrl)}`;

    if (toolName) {
      authUrl += `&tool=${encodeURIComponent(
        toolName
      )}&description=${encodeURIComponent(toolDescription || "")}`;
    }

    window.location.href = authUrl;
  }

  // Get authenticated headers for API requests
  getAuthHeaders() {
    if (!this.token) return null;

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  }

  // Clear authentication
  clearAuth() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    this.token = null;
    this.user = null;
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

    this.clearAuth();
    window.location.href = "/";
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
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            this.user.name
          )}`
        }" 
             alt="${this.user.name}" 
             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1e293b;">${this.user.name}</div>
          <div style="font-size: 0.875rem; color: #64748b;">${
            this.user.role
          }</div>
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
          <button onclick="authUtils.logout()" 
                  style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
            Logout
          </button>
        </div>
      </div>
    `;
    }
  }

  async initToolAuth(toolName, toolDescription = null, options = {}) {
    const {
      redirectIfUnauthorized = true, 
      showUserInfo = true,
      userInfoContainerId = "user-info",
      onAuthSuccess = null,
      onAuthFailed = null,
    } = options;

    // Check if the tool requires authentication
    try {
      const toolInfoResponse = await fetch(
        `${this.API_BASE}/auth/tool-info/${toolName}`
      );
      const toolInfo = await toolInfoResponse.json();

      if (!toolInfo.requiresAuth) {
        // Tool is public, no auth needed
        if (onAuthSuccess) onAuthSuccess({ isPublic: true, authenticated: false });
        return { success: true, isPublic: true, authenticated: false };
      }
    } catch (error) {
      console.warn("Could not fetch tool info, assuming protected");
    }

    // Check authentication and access
    const accessCheck = await this.checkToolAccess(toolName);

    if (accessCheck.hasAccess) {
      if (showUserInfo && this.user) {
        this.showUserInfo(userInfoContainerId);
      }
      if (onAuthSuccess) onAuthSuccess({ user: this.user, authenticated: true });
      return { success: true, user: this.user, authenticated: true };
    } else {
      // User does NOT have access - ALWAYS redirect for internal tools
      if (onAuthFailed) onAuthFailed(accessCheck);
      if (redirectIfUnauthorized) {
        this.redirectToAuth(toolName, toolDescription);
      }
      return { success: false, authenticated: false, ...accessCheck };
    }
  }
}

// Create global instance
const authUtils = new AuthUtils();