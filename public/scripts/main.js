// main.js
import { ThemeManager } from "./themeManager.js";
import { toolCategories } from "./toolCategories.js";
import { CategoryRenderer } from "./categoryRenderer.js";
import { Analytics } from "./analytics.js";
import { PerformanceMonitor } from "./performanceMonitor.js";
import { initInternalToolAuth } from './api/auth/internal-auth.js';

function initThemeManager() {
  const btn = document.getElementById("themeToggle");
  if (btn) {
    window.themeManager = new ThemeManager();
    console.log("ThemeManager initialized");
  } else {
    console.warn("Waiting for #themeToggle...");
    setTimeout(initThemeManager, 100);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize authentication system first (before CategoryRenderer)
  console.log("Initializing authentication system...");
  const auth = initInternalToolAuth();
  window.auth = auth;
  
  // Initialize theme manager
  initThemeManager();

  // Initialize category renderer (after auth system is ready)
  console.log("Initializing category renderer...");
  window.categoryRenderer = new CategoryRenderer();
  
  // Initialize analytics and performance monitoring
  window.analytics = new Analytics();
  window.performanceMonitor = new PerformanceMonitor();

  console.log("WorkToolsHub initialized successfully!");
  

  // Add a small delay to ensure everything is rendered, then test
  setTimeout(() => {
    const testLink = document.querySelector('a[data-internal="true"]');
    console.log("Test: Found internal link after render:", testLink);
    if (testLink) {
      console.log("Internal link details:", {
        href: testLink.getAttribute('href'),
        hasDataInternal: testLink.hasAttribute('data-internal'),
        dataInternalValue: testLink.getAttribute('data-internal'),
        textContent: testLink.textContent
      });
    }
  }, 1000);
});