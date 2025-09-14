
// =============================
// Category Renderer
// =============================
import { toolCategories } from "./toolCategories.js";

export class CategoryRenderer {
  constructor() {
    this.container = document.getElementById("categoriesGrid");
    this.searchInput = document.getElementById("toolSearch");
    this.filteredCategories = Object.keys(toolCategories);
    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = "";

    this.filteredCategories.forEach((categoryKey) => {
      const category = toolCategories[categoryKey];
      const categoryElement = this.createCategoryCard(category, categoryKey);
      this.container.appendChild(categoryElement);
    });
  }

  createCategoryCard(category, key) {
    const card = document.createElement("div");
    card.className = "category-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View ${category.name} tools`);

    card.innerHTML = `
      <div class="category-icon" style="background: linear-gradient(135deg, ${
        category.color
      }, ${this.darkenColor(category.color)})">
          ${category.icon}
      </div>
      <h3 class="category-title">${category.name}</h3>
      <p class="category-description">${category.description}</p>
      <ul class="tool-list">
          ${category.tools
            .map((tool) => `<li class="tool-item">${tool.name}</li>`)
            .join("")}
      </ul>
    `;

    // card.addEventListener("click", () => {
    //   window.location.href = `/category/${key}`;
    // });

    // card.addEventListener("keydown", (e) => {
    //   if (e.key === "Enter" || e.key === " ") {
    //     e.preventDefault();
    //     window.location.href = `/category/${key}`;
    //   }
    // });

    return card;
  }

  darkenColor(color) {
    const colorMap = {
      "#10b981": "#059669",
      "#3b82f6": "#2563eb",
      "#8b5cf6": "#7c3aed",
      "#f59e0b": "#d97706",
      "#ef4444": "#dc2626",
      "#ec4899": "#db2777",
    };
    return colorMap[color] || color;
  }

  bindEvents() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener("input", (e) => {
      this.filterCategories(e.target.value);
    });

    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.handleSearchSubmit(e.target.value);
      }
    });
  }

  filterCategories(searchTerm) {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredCategories = Object.keys(toolCategories);
      this.render();
      return;
    }

    this.filteredCategories = Object.keys(toolCategories).filter(
      (categoryKey) => {
        const category = toolCategories[categoryKey];
        const categoryMatch =
          category.name.toLowerCase().includes(term) ||
          category.description.toLowerCase().includes(term);

        const toolMatch = category.tools.some((tool) =>
          tool.name.toLowerCase().includes(term)
        );

        return categoryMatch || toolMatch;
      }
    );

    this.render();
    console.log("🔍 Search performed:", term, this.filteredCategories);
  }

  handleSearchSubmit(searchTerm) {
    if (!searchTerm.trim()) return;

    let bestMatch = null;
    let bestScore = 0;

    Object.values(toolCategories).forEach((category) => {
      category.tools.forEach((tool) => {
        const score = this.calculateMatchScore(tool.name, searchTerm);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = tool;
        }
      });
    });

    if (bestMatch && bestScore > 0.3) {
      window.location.href = bestMatch.path;
    } else {
      window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
    }
  }

  calculateMatchScore(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    if (textLower === queryLower) return 1;
    if (textLower.includes(queryLower)) return 0.8;

    const textWords = textLower.split(" ");
    const queryWords = queryLower.split(" ");
    let matches = 0;

    queryWords.forEach((qWord) => {
      if (
        textWords.some(
          (tWord) => tWord.includes(qWord) || qWord.includes(tWord)
        )
      ) {
        matches++;
      }
    });

    return matches / Math.max(textWords.length, queryWords.length);
  }
}
