// public/js/knowledge-base.js
class KnowledgeBase {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.currentSearch = '';
        this.currentFilters = {
            category: '',
            difficulty: '',
            date: '',
            tags: []
        };

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadArticles();
        this.renderArticles();
    }

    bindEvents() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input',
                this.debounce((e) => this.handleSearch(e.target.value), 300)
            );
        }

        // Filter selects
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change',
                (e) => this.handleFilterChange('category', e.target.value)
            );
        }

        const difficultyFilter = document.getElementById('difficultyFilter');
        if (difficultyFilter) {
            difficultyFilter.addEventListener('change',
                (e) => this.handleFilterChange('difficulty', e.target.value)
            );
        }

        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change',
                (e) => this.handleFilterChange('date', e.target.value)
            );
        }

        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change',
                (e) => this.handleSort(e.target.value)
            );
        }

        // Sidebar categories
        document.querySelectorAll('.category-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCategoryClick(e.target.closest('.category-link'));
            });
        });

        // Search tags
        document.querySelectorAll('.search-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                this.handleTagClick(e.target.textContent);
            });
        });

        // AI Assistant events
        this.bindAIEvents();
    }

    bindAIEvents() {
        // AI Assistant toggle
        const aiToggle = document.getElementById('aiToggle');
        if (aiToggle) {
            aiToggle.addEventListener('click', () => {
                this.toggleAIAssistant();
            });
        }

        // AI form submission
        const aiSubmit = document.getElementById('aiSubmit');
        if (aiSubmit) {
            aiSubmit.addEventListener('click', () => {
                this.submitAIQuery();
            });
        }

        // AI input enter key
        const aiInput = document.getElementById('aiInput');
        if (aiInput) {
            aiInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.submitAIQuery();
                }
            });
        }

        // No results AI button
        const noResultsAiBtn = document.getElementById("noResultsAiBtn");
        if (noResultsAiBtn) {
            noResultsAiBtn.addEventListener("click", () => {
                this.showAIAssistant();
                const query = `I didn't find any articles for "${this.currentSearch}". Can you help me with this topic?`;
                const aiInputElement = document.getElementById("aiInput");
                if (aiInputElement) {
                    aiInputElement.value = query;
                }
                this.handleAIQuery(query);
            });
        }

        // Modal event handlers
        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.hideEditModal();
            });
        }

        const cancelEdit = document.getElementById('cancelEdit');
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => {
                this.hideEditModal();
            });
        }

        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    articleId: document.getElementById('editArticleId')?.value,
                    editorName: document.getElementById('editorName')?.value,
                    editType: document.getElementById('editType')?.value,
                    suggestion: document.getElementById('editSuggestion')?.value,
                    timestamp: new Date().toISOString()
                };
                this.submitEditSuggestion(formData);
            });
        }

        // Close modal when clicking overlay
        const editModal = document.getElementById('editModal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target.id === 'editModal') {
                    this.hideEditModal();
                }
            });
        }

        // Close AI panel when clicking outside
        document.addEventListener('click', (e) => {
            const aiAssistant = document.querySelector('.ai-assistant');
            const aiPanel = document.getElementById('aiPanel');

            if (aiPanel && aiPanel.classList.contains('active') &&
                aiAssistant && !aiAssistant.contains(e.target)) {
                this.hideAIAssistant();
            }
        });
    }

    async loadArticles() {
        this.showLoading();

        try {
            const response = await fetch('/api/knowledge-base/articles');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.articles = await response.json();
            this.filteredArticles = [...this.articles];
        } catch (error) {
            console.error('Failed to load articles:', error);
            // Fallback to demo articles if API fails
            this.articles = this.getDemoArticles();
            this.filteredArticles = [...this.articles];
            this.showError('Failed to load articles from server. Showing demo content.');
        }
    }

    getDemoArticles() {
        return [
            {
                _id: 'demo-1',
                id: 'demo-1',
                title: "Advanced React Performance Optimization Techniques",
                excerpt: "Learn how to optimize React applications for better performance using React.memo, useMemo, useCallback, and advanced patterns.",
                content: "Demo content for React optimization...",
                category: "technical",
                difficulty: "advanced",
                tags: ["React", "Performance", "JavaScript", "Optimization"],
                author: "Demo Author",
                date: "2024-01-15",
                views: 1250,
                readTime: "8 min read",
                upvotes: 47,
                helpfulCount: 89
            }
            // Add more demo articles if needed
        ];
    }

    handleSearch(query) {
        this.currentSearch = query.toLowerCase();
        this.applyFilters();
    }

    handleFilterChange(filterType, value) {
        this.currentFilters[filterType] = value;
        this.applyFilters();
    }

    handleSort(sortType) {
        switch (sortType) {
            case 'date':
                this.filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'popular':
                this.filteredArticles.sort((a, b) => b.views - a.views);
                break;
            case 'title':
                this.filteredArticles.sort((a, b) => a.title.localeCompare(b.title));
                break;
            default: // relevance
                this.filteredArticles.sort((a, b) => b.views - a.views);
        }
        this.renderArticles();
    }

    handleCategoryClick(link) {
        // Update active state
        document.querySelectorAll('.category-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Update filter
        const category = link.dataset.category;
        this.currentFilters.category = category;
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = category;
        }
        this.applyFilters();
    }

    handleTagClick(tagText) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = tagText;
            this.handleSearch(tagText);
        }
    }

    applyFilters() {
        this.filteredArticles = this.articles.filter(article => {
            // Search filter
            if (this.currentSearch) {
                const searchMatch =
                    article.title.toLowerCase().includes(this.currentSearch) ||
                    article.excerpt.toLowerCase().includes(this.currentSearch) ||
                    article.tags.some(tag => tag.toLowerCase().includes(this.currentSearch)) ||
                    article.author.toLowerCase().includes(this.currentSearch);

                if (!searchMatch) return false;
            }

            // Category filter
            if (this.currentFilters.category && article.category !== this.currentFilters.category) {
                return false;
            }

            // Difficulty filter
            if (this.currentFilters.difficulty && article.difficulty !== this.currentFilters.difficulty) {
                return false;
            }

            // Date filter
            if (this.currentFilters.date) {
                const articleDate = new Date(article.date);
                const now = new Date();
                let cutoffDate;

                switch (this.currentFilters.date) {
                    case 'week':
                        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    case 'quarter':
                        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                    case 'year':
                        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        break;
                    default:
                        cutoffDate = null;
                }

                if (cutoffDate && articleDate < cutoffDate) {
                    return false;
                }
            }

            return true;
        });

        this.renderArticles();
        this.updateResultsCount();
    }

    renderArticles() {
        const grid = document.getElementById('articlesGrid');
        const noResults = document.getElementById('noResults');

        if (!grid || !noResults) {
            console.error('Required DOM elements not found');
            return;
        }

        if (this.filteredArticles.length === 0) {
            grid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        noResults.style.display = 'none';

        grid.innerHTML = this.filteredArticles.map(article => {
            const articleId = article._id || article.id;
            return `
                <article class="article-card fade-in" data-id="${articleId}">
                    <div class="article-header">
                        <span class="article-category">${this.formatCategory(article.category)}</span>
                    </div>
                    <h3 class="article-title" onclick="window.kbSystem.openArticle('${articleId}')" style="cursor: pointer;">${article.title}</h3>
                    <p class="article-excerpt">${article.excerpt}</p> <p style=padding-top="2rem" class="article-content"> ${article.content}</p>
                    <div class="article-tags">
                        ${article.tags.slice(0, 3).map(tag =>
                            `<span class="article-tag">${tag}</span>`
                        ).join('')}
                    </div>
                    <div class="article-meta">
                        <div>
                            <strong>${article.author}</strong> • ${this.formatDate(article.date)}
                        </div>
                        <div>
                            ${article.readTime} • ${article.views.toLocaleString()} views
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="action-btn upvote-btn ${article.userUpvoted ? 'upvoted' : ''}"
                                data-id="${articleId}" title="Mark as helpful">
                            <span>👍</span>
                            <span>${article.upvotes || 0}</span>
                        </button>
                        <button class="action-btn helpful-btn" data-id="${articleId}" title="This helped me">
                            <span>✅</span>
                            <span>Helped ${article.helpfulCount || 0}</span>
                        </button>
                        <button class="action-btn suggest-edit" data-id="${articleId}" title="Suggest edit">
                            <span>✏️</span>
                            <span>Suggest Edit</span>
                        </button>
                    </div>
                </article>
            `;
        }).join('');

        // Add click handlers for actions
        grid.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.classList.contains('upvote-btn') ? 'upvote' :
                             btn.classList.contains('helpful-btn') ? 'helpful' : 'edit';
                const articleId = btn.dataset.id;
                
                if (action === 'upvote') {
                    this.handleUpvote(articleId);
                } else if (action === 'helpful') {
                    this.handleHelpful(articleId);
                } else if (action === 'edit') {
                    this.showEditModal(articleId);
                }
            });
        });
    }

    toggleAIAssistant() {
        const panel = document.getElementById('aiPanel');
        if (panel) {
            if (panel.classList.contains('active')) {
                this.hideAIAssistant();
            } else {
                this.showAIAssistant();
            }
        }
    }

    showAIAssistant() {
        const panel = document.getElementById('aiPanel');
        if (panel) {
            panel.classList.add('active');
            const aiInput = document.getElementById('aiInput');
            if (aiInput) {
                aiInput.focus();
            }
        }
    }

    hideAIAssistant() {
        const panel = document.getElementById('aiPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    }

    submitAIQuery() {
        const aiInput = document.getElementById('aiInput');
        if (aiInput) {
            const query = aiInput.value.trim();
            if (query) {
                this.handleAIQuery(query);
            }
        }
    }

    async handleAIQuery(query) {
        const submitBtn = document.getElementById('aiSubmit');
        const responseDiv = document.getElementById('aiResponse');
        const responseContent = document.getElementById('aiResponseContent');

        if (!submitBtn || !responseDiv || !responseContent) {
            console.error('AI Assistant UI elements not found');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const submitText = submitBtn.querySelector('.ai-submit-text');
        const submitLoading = submitBtn.querySelector('.ai-submit-loading');
        
        if (submitText) submitText.style.display = 'none';
        if (submitLoading) submitLoading.style.display = 'flex';

        try {
            const response = await fetch('/api/knowledge-base/ai-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    context: this.articles.map(a => ({ 
                        id: a._id || a.id,
                        title: a.title, 
                        excerpt: a.excerpt, 
                        tags: a.tags,
                        category: a.category
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('AI service unavailable');
            }

            const result = await response.json();
            responseContent.textContent = result.answer;
            responseDiv.classList.add('active');

            // If AI suggests related articles, show them
            if (result.relatedArticles && result.relatedArticles.length > 0) {
                const relatedText = '\n\nRelated articles:\n' +
                    result.relatedArticles.map(a => `• ${a.title}`).join('\n');
                responseContent.textContent += relatedText;
            }

        } catch (error) {
            console.error('AI query error:', error);
            responseContent.textContent = 'Sorry, the AI assistant is currently unavailable. Please try searching our existing articles or contact support for help.';
            responseDiv.classList.add('active');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            if (submitText) submitText.style.display = 'inline';
            if (submitLoading) submitLoading.style.display = 'none';
        }
    }

    async handleUpvote(articleId) {
        try {
            const article = this.articles.find(a => (a._id || a.id) == articleId);
            if (!article) return;

            const isUpvoted = article.userUpvoted || false;
            const newUpvoteState = !isUpvoted;

            // Update local state immediately
            article.userUpvoted = newUpvoteState;
            article.upvotes = (article.upvotes || 0) + (newUpvoteState ? 1 : -1);

            // Update UI
            const btn = document.querySelector(`.upvote-btn[data-id="${articleId}"]`);
            if (btn) {
                btn.classList.toggle('upvoted', newUpvoteState);
                const countSpan = btn.querySelector('span:last-child');
                if (countSpan) {
                    countSpan.textContent = article.upvotes;
                }
            }

            // Send to backend
            await fetch(`/api/knowledge-base/articles/${articleId}/upvote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upvote: newUpvoteState })
            });

        } catch (error) {
            console.error('Upvote error:', error);
        }
    }

    async handleHelpful(articleId) {
        try {
            const article = this.articles.find(a => (a._id || a.id) == articleId);
            if (!article) return;

            // Increment helpful count
            article.helpfulCount = (article.helpfulCount || 0) + 1;

            // Update UI immediately
            const btn = document.querySelector(`.helpful-btn[data-id="${articleId}"]`);
            if (btn) {
                const textSpan = btn.querySelector('span:last-child');
                if (textSpan) {
                    textSpan.textContent = `Helped ${article.helpfulCount}`;
                }

                // Visual feedback
                btn.style.background = '#10b981';
                btn.style.color = 'white';
                setTimeout(() => {
                    btn.style.background = '';
                    btn.style.color = '';
                }, 1000);
            }

            // Send to backend
            await fetch(`/api/knowledge-base/articles/${articleId}/helpful`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Helpful error:', error);
        }
    }

    showEditModal(articleId) {
        const article = this.articles.find(a => (a._id || a.id) == articleId);
        if (!article) return;

        const editModal = document.getElementById('editModal');
        if (!editModal) {
            alert(`Edit suggestions for article: ${article.title}\n\nIn a full implementation, this would open an edit suggestion modal.`);
            return;
        }

        // Populate modal if it exists
        const editArticleId = document.getElementById('editArticleId');
        const editTitle = document.getElementById('editTitle');
        
        if (editArticleId) editArticleId.value = articleId;
        if (editTitle) editTitle.value = article.title;

        editModal.classList.add('active');
    }

    hideEditModal() {
        const editModal = document.getElementById('editModal');
        if (editModal) {
            editModal.classList.remove('active');
            const editForm = document.getElementById('editForm');
            if (editForm) {
                editForm.reset();
            }
        }
    }

    async submitEditSuggestion(formData) {
        try {
            const response = await fetch('/api/knowledge-base/edit-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Thank you! Your edit suggestion has been submitted for review.');
                this.hideEditModal();
            } else {
                throw new Error('Failed to submit suggestion');
            }
        } catch (error) {
            console.error('Edit suggestion error:', error);
            alert('Sorry, there was an error submitting your suggestion. Please try again.');
        }
    }

    showLoading() {
        const grid = document.getElementById('articlesGrid');
        if (grid) {
            grid.innerHTML = Array(6).fill(0).map(() => `
                <div class="skeleton-card loading-skeleton">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line short"></div>
                </div>
            `).join('');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #fee2e2;
            color: #dc2626;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        `;
        errorDiv.textContent = message;

        const container = document.querySelector('.main-content') || document.body;
        container.insertBefore(errorDiv, container.firstChild);

        // Remove error message after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    updateResultsCount() {
        const count = this.filteredArticles.length;
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${count} article${count !== 1 ? 's' : ''}`;
        }
    }

    formatCategory(category) {
        const categoryMap = {
            'technical': 'Technical Guides',
            'tutorials': 'Tutorials',
            'troubleshooting': 'Troubleshooting',
            'best-practices': 'Best Practices',
            'tools': 'Tools & Resources'
        };
        return categoryMap[category] || category;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    openArticle(articleId) {
        // Navigate to articlePage.html and pass the article ID in the URL
    window.location.href = `article.html?id=${articleId}`;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize Knowledge Base when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.kbSystem = new KnowledgeBase();
});