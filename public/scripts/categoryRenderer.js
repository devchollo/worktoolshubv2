// =============================
// Enhanced Category Renderer with Search Dropdown
// =============================
import { toolCategories } from "./toolCategories.js";

export class CategoryRenderer {
  constructor() {
    this.container = document.getElementById("categoriesGrid");
    this.searchInput = document.getElementById("toolSearch");
    this.filteredCategories = Object.keys(toolCategories);
    this.searchResults = [];
    this.selectedIndex = -1;
    this.init();
  }

  init() {
    if (!this.container) return;
    this.render();
    this.bindEvents();
    this.createSearchDropdown();
  }

  createSearchDropdown() {
    // Create dropdown container - append to body to avoid overflow issues
    const dropdown = document.createElement("div");
    dropdown.id = "searchDropdown";
    dropdown.className = "search-dropdown";
    dropdown.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      max-height: 300px;
      overflow-y: auto;
      z-index: 9999;
      display: none;
      min-width: 300px;
    `;

    // Append to body instead of search container to avoid overflow issues
    document.body.appendChild(dropdown);
    this.searchDropdown = dropdown;
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
            .map(
              (tool) =>
                `<li class="tool-item"><a href="${
                  tool.path
                }" target="_self" style="text-decoration: none; color: inherit;" ${
                  tool.internal ? 'data-internal="true"' : ""
                }>${tool.name} ${
                  tool.internal
                    ? '<span style="background: #fbbf24; color: #92400e; font-size: 10px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">Internal</span>'
                    : ""
                }
                ${
              tool.pending
                ? '<span style="background: #21795bff; color: #b9b9b9ff; font-size: 10px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">Coming Soon</span>'
                : ""
            }
                </a></li>`
            )
            .join("")}
      </ul>
    `;

    return card;
  }

  renderSearchDropdown(results) {
    if (results.length === 0) {
      this.searchDropdown.style.display = "none";
      return;
    }

    // Position dropdown relative to search input
    this.positionDropdown();
console.log("Results array:", results);
    const html = results
      .map(
        (tool, index) => `
      <div class="search-result-item ${
        index === this.selectedIndex ? "selected" : ""
      }" 
           data-index="${index}" 
           data-path="${tool.path}"
           ${tool.internal ? 'data-internal="true"' : ""}
           ${tool.pending ? 'data-pending="true"' : ""}
           style="
             padding: 12px 16px;
             cursor: pointer;
             border-bottom: 1px solid #f3f4f6;
             transition: background-color 0.15s ease;
             display: flex;
             align-items: center;
             gap: 12px;
             ${index === this.selectedIndex ? "background-color: #f3f4f6;" : ""}
           "
           onmouseover="this.style.backgroundColor='#f9fafb'"
           onmouseout="this.style.backgroundColor='${
             index === this.selectedIndex ? "#f3f4f6" : "transparent"
           }'">
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: linear-gradient(135deg, ${
            tool.categoryColor
          }, ${this.darkenColor(tool.categoryColor)});
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">
          ${tool.categoryIcon}
        </div>
        <div>
          <div style="font-weight: 600; color: #111827; margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
            ${tool.name}
            ${
              tool.internal
                ? '<span style="background: #fbbf24; color: #92400e; font-size: 10px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">INTERNAL</span>'
                : ""
            } ${
              tool.pending
                ? '<span style="background: #fbbf24; color: #92400e; font-size: 10px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">INTERNAL</span>'
                : ""
            } 
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            in ${tool.categoryName}
          </div>
        </div>
      </div>
    `
      )
      .join("");

    this.searchDropdown.innerHTML = html;
    this.searchDropdown.style.display = "block";

    // Add click handlers to navigate to the tool's path
    this.searchDropdown
      .querySelectorAll(".search-result-item")
      .forEach((item) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const path = e.currentTarget.dataset.path;
          const isInternal = e.currentTarget.hasAttribute("data-internal");

          console.log("Path:", path);
          console.log("Is internal:", isInternal);
          console.log("window.auth exists:", !!window.auth);

          if (isInternal && window.auth) {
            console.log("Calling checkInternalAccess...");
            const hasAccess = window.auth.checkInternalAccess(path);
            console.log("checkInternalAccess returned:", hasAccess);

            if (!hasAccess) {
              return;
            }
          }
          console.log("Navigating to:", path);
          window.location.href = path;
        });
      });
  }

  positionDropdown() {
    if (!this.searchInput) return;

    const rect = this.searchInput.getBoundingClientRect();

    this.searchDropdown.style.left = rect.left + "px";
    this.searchDropdown.style.top = rect.bottom + 2 + "px"; // Only 2px gap
    this.searchDropdown.style.width = rect.width + "px";
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

    // Input event for live search
    this.searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value;
      this.performSearch(searchTerm);
      // Don't filter categories when showing search dropdown
      if (!searchTerm.trim()) {
        this.filterCategories(searchTerm);
      }
    });

    // Keyboard navigation
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.navigateDropdown(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.navigateDropdown(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.handleEnterKey(e.target.value);
      } else if (e.key === "Escape") {
        this.hideDropdown();
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) {
        this.hideDropdown();
      }
    });

    // Show dropdown when focusing on input
    this.searchInput.addEventListener("focus", () => {
      if (this.searchResults.length > 0) {
        this.positionDropdown();
        this.searchDropdown.style.display = "block";
      }
    });

    // Reposition dropdown on window resize or scroll
    window.addEventListener("resize", () => {
      if (this.searchDropdown.style.display === "block") {
        this.positionDropdown();
      }
    });

    window.addEventListener("scroll", () => {
      if (this.searchDropdown.style.display === "block") {
        this.positionDropdown();
      }
    });
  }

  performSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    this.searchResults = [];

    if (!term) {
      this.hideDropdown();
      // Show all categories when search is empty
      this.filteredCategories = Object.keys(toolCategories);
      this.render();
      return;
    }

    // Search through all individual tools
    Object.entries(toolCategories).forEach(([categoryKey, category]) => {
      category.tools.forEach((tool) => {
        const score = this.calculateMatchScore(tool.name, term);
        if (score > 0.2) {
          // Lower threshold for more results
          this.searchResults.push({
            name: tool.name,
            path: tool.path,
            internal: tool.internal || false,
            pending: tool.pending || false,
            categoryName: category.name,
            categoryIcon: category.icon,
            categoryColor: category.color,
            score: score,
          });
        }
      });
    });

    // Sort by relevance score (highest first)
    this.searchResults.sort((a, b) => b.score - a.score);

    // Limit to top 8 results
    this.searchResults = this.searchResults.slice(0, 8);

    this.selectedIndex = -1;
    this.renderSearchDropdown(this.searchResults);

    // Keep categories visible and filter them based on search
    this.filterCategories(term);
  }

  navigateDropdown(direction) {
    if (this.searchResults.length === 0) return;

    this.selectedIndex += direction;

    if (this.selectedIndex < 0) {
      this.selectedIndex = this.searchResults.length - 1;
    } else if (this.selectedIndex >= this.searchResults.length) {
      this.selectedIndex = 0;
    }

    this.renderSearchDropdown(this.searchResults);
  }

  handleEnterKey(searchTerm) {
    if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
      const selectedTool = this.searchResults[this.selectedIndex];

      // Check if the selected tool is internal
      if (selectedTool.internal && window.auth) {
        if (!window.auth.checkInternalAccess(selectedTool.path)) {
          return; // Don't navigate, modal will show
        }
      }

      // Navigate to selected result only if not internal or if authenticated
      window.location.href = selectedTool.path;
    } else if (searchTerm.trim()) {
      // Find best match and navigate
      this.handleSearchSubmit(searchTerm);
    }
  }

  hideDropdown() {
    this.searchDropdown.style.display = "none";
    this.selectedIndex = -1;
    // Categories are always visible now, no need to show/hide them
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
      // Could implement a search results page here
      console.log(`No close match found for: ${searchTerm}`);
    }
  }

  calculateMatchScore(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (textLower === queryLower) return 1;

    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 0.9;

    // Contains query gets good score
    if (textLower.includes(queryLower)) return 0.8;

    // Word-based matching
    const textWords = textLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    let matches = 0;

    queryWords.forEach((qWord) => {
      const wordMatch = textWords.find(
        (tWord) =>
          tWord.includes(qWord) ||
          qWord.includes(tWord) ||
          this.levenshteinDistance(tWord, qWord) <= 2
      );
      if (wordMatch) matches++;
    });

    return matches / Math.max(textWords.length, queryWords.length);
  }

  // Simple Levenshtein distance for fuzzy matching
  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }
}
