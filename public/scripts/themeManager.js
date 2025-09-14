// =============================
// Theme Management
// =============================
console.log("📦 ThemeManager file loaded"); // top of themeManager.js
export class ThemeManager {
  constructor() {
    console.log("ThemeManager ctor — document.readyState:", document.readyState);
    this.theme =
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    this.init();
  }

  init() {
    this.applyTheme();
    this.bindEvents();
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.theme);
    this.updateToggleButton();
  }

  updateToggleButton() {
    const icon = document.getElementById("themeIcon");
    const text = document.getElementById("themeText");

    if (!icon || !text) return; // ✅ prevents crashes

    if (this.theme === "dark") {
      icon.textContent = "☀️";
      text.textContent = "Light Mode";
    } else {
      icon.textContent = "🌙";
      text.textContent = "Dark Mode";
    }
  }

  toggle() {
    this.theme = this.theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", this.theme);
    this.applyTheme();

    console.log("🎨 Theme toggled:", this.theme);
  }

  bindEvents() {
    const toggleBtn = document.getElementById("themeToggle");
    console.log("🔍 themeToggle exists?", document.getElementById("themeToggle"));

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => this.toggle());
    }

    // Auto-adjust if system preference changes (only if no manual choice stored)
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
          this.theme = e.matches ? "dark" : "light";
          this.applyTheme();
        }
      });
  }
}
