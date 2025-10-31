// main.js
import { ThemeManager } from "./themeManager.js";
import { CategoryRenderer } from "./categoryRenderer.js";

function initThemeManager() {
  const btn = document.getElementById("themeToggle");
  if (btn) {
    window.themeManager = new ThemeManager();

  } else {

    setTimeout(initThemeManager, 100);
  }
}

document.addEventListener("DOMContentLoaded", () => {  
  // Initialize theme manager
  initThemeManager();

  window.categoryRenderer = new CategoryRenderer();
});
