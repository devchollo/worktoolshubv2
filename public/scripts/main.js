// main.js
import { ThemeManager } from "./themeManager.js";
import { toolCategories } from "./toolCategories.js";
import { CategoryRenderer } from "./categoryRenderer.js";
import { Analytics } from "./analytics.js";
import { PerformanceMonitor } from "./performanceMonitor.js";

function initThemeManager() {
  const btn = document.getElementById("themeToggle");
  if (btn) {
    window.themeManager = new ThemeManager();
    console.log("🎨 ThemeManager initialized ✅");
  } else {
    console.warn("⏳ Waiting for #themeToggle...");
    setTimeout(initThemeManager, 100); // keep retrying
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // retry until themeToggle exists
  initThemeManager();

  // the rest can safely init immediately
  window.categoryRenderer = new CategoryRenderer(toolCategories);
  window.analytics = new Analytics();
  window.performanceMonitor = new PerformanceMonitor();

  console.log("🚀 WorkToolsHub initialized successfully!");
});
