class TestimonialSlider {
  constructor() {
    this.currentIndex = 0;
    this.testimonials = [];
    this.autoplayInterval = null;
    this.autoplayDelay = 5000; // 5 seconds
    this.apiUrl = 'https://worktoolshubv2.onrender.com/api/testimonials';
    this.init();
  }

  async init() {
    await this.loadTestimonials();
    this.bindEvents();
    this.startAutoplay();
  }

  async loadTestimonials() {
    try {
      const response = await fetch(this.apiUrl);
      const data = await response.json();
      
      this.testimonials = data.testimonials || [];
      
      if (this.testimonials.length > 0) {
        this.renderSlider();
        this.updateStats(data.stats);
      } else {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Failed to load testimonials:', error);
      this.showErrorState();
    }
  }

  renderSlider() {
    const track = document.querySelector('.testimonial-track');
    const dotsContainer = document.querySelector('.slider-dots');
    
    if (!track) return;

    // Clear existing content
    track.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    // Render testimonial cards
    this.testimonials.forEach((testimonial, index) => {
      const card = this.createTestimonialCard(testimonial);
      track.appendChild(card);

      // Create dot indicator
      if (dotsContainer) {
        const dot = document.createElement('button');
        dot.className = `slider-dot ${index === 0 ? 'active' : ''}`;
        dot.setAttribute('aria-label', `Go to testimonial ${index + 1}`);
        dot.addEventListener('click', () => this.goToSlide(index));
        dotsContainer.appendChild(dot);
      }
    });

    this.updateSliderPosition();
  }

  createTestimonialCard(testimonial) {
    const card = document.createElement('div');
    card.className = `testimonial-card ${testimonial.isFeatured ? 'featured' : ''}`;
    
    const stars = this.generateStars(testimonial.rating);
    const date = this.formatDate(testimonial.createdAt);
    
    card.innerHTML = `
      <div class="testimonial-header-section">
        <img src="${testimonial.avatar}" alt="${testimonial.name}" class="testimonial-avatar">
        <div class="testimonial-info">
          <div class="testimonial-name">${this.escapeHtml(testimonial.name)}</div>
          <div class="testimonial-rating">${stars}</div>
        </div>
      </div>
      <div class="testimonial-message">"${this.escapeHtml(testimonial.message)}"</div>
      <div class="testimonial-date">${date}</div>
    `;
    
    return card;
  }

  generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating ? '★' : '☆';
    }
    return stars;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  updateStats(stats) {
    const avgRatingEl = document.getElementById('avgRating');
    const totalCountEl = document.getElementById('totalTestimonials');
    
    if (avgRatingEl && stats) {
      avgRatingEl.textContent = stats.averageRating.toFixed(1);
    }
    
    if (totalCountEl && stats) {
      totalCountEl.textContent = stats.totalCount;
    }
  }

  updateSliderPosition() {
    const track = document.querySelector('.testimonial-track');
    const cards = document.querySelectorAll('.testimonial-card');
    
    if (!track || cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth;
    const gap = 32; // 2rem gap
    const offset = -(this.currentIndex * (cardWidth + gap));
    
    track.style.transform = `translateX(${offset}px)`;

    // Update dots
    const dots = document.querySelectorAll('.slider-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === this.currentIndex);
    });

    // Update button states
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    
    if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentIndex === this.testimonials.length - 1;
  }

  nextSlide() {
    if (this.currentIndex < this.testimonials.length - 1) {
      this.currentIndex++;
      this.updateSliderPosition();
      this.resetAutoplay();
    }
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateSliderPosition();
      this.resetAutoplay();
    }
  }

  goToSlide(index) {
    this.currentIndex = index;
    this.updateSliderPosition();
    this.resetAutoplay();
  }

  startAutoplay() {
    this.autoplayInterval = setInterval(() => {
      if (this.currentIndex < this.testimonials.length - 1) {
        this.nextSlide();
      } else {
        this.currentIndex = 0;
        this.updateSliderPosition();
      }
    }, this.autoplayDelay);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  resetAutoplay() {
    this.stopAutoplay();
    this.startAutoplay();
  }

  bindEvents() {
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    const submitBtn = document.getElementById('submitTestimonialBtn');

    if (prevBtn) prevBtn.addEventListener('click', () => this.prevSlide());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextSlide());
    if (submitBtn) submitBtn.addEventListener('click', () => this.openModal());

    // Pause autoplay on hover
    const sliderContainer = document.querySelector('.testimonial-slider');
    if (sliderContainer) {
      sliderContainer.addEventListener('mouseenter', () => this.stopAutoplay());
      sliderContainer.addEventListener('mouseleave', () => this.startAutoplay());
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prevSlide();
      if (e.key === 'ArrowRight') this.nextSlide();
    });
  }

  openModal() {
    const modal = document.getElementById('testimonialModal');
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal() {
    const modal = document.getElementById('testimonialModal');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  showEmptyState() {
    const track = document.querySelector('.testimonial-track');
    if (track) {
      track.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: white; width: 100%;">
          <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Be the First to Share Your Experience!</h3>
          <p>No testimonials yet. Help us grow by sharing your thoughts.</p>
        </div>
      `;
    }
  }

  showErrorState() {
    const track = document.querySelector('.testimonial-track');
    if (track) {
      track.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: white; width: 100%;">
          <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">Unable to Load Testimonials</h3>
          <p>Please try refreshing the page.</p>
        </div>
      `;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Testimonial Form Handler
class TestimonialForm {
  constructor() {
    this.form = document.getElementById('testimonialForm');
    this.modal = document.getElementById('testimonialModal');
    this.apiUrl = 'https://worktoolshubv2.onrender.com/api/testimonials';
    this.init();
  }

  init() {
    if (!this.form) return;

    this.bindEvents();
  }

  bindEvents() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Modal close
    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // Close on outside click
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Character counter
    const messageInput = document.getElementById('testimonialMessage');
    const charCounter = document.getElementById('charCounter');
    if (messageInput && charCounter) {
      messageInput.addEventListener('input', () => {
        charCounter.textContent = messageInput.value.length;
      });
    }

    // Avatar preview
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarInput && avatarPreview) {
      avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            avatarPreview.src = e.target.result;
            avatarPreview.classList.add('show');
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const submitBtn = this.form.querySelector('.submit-btn');
    const messageEl = document.getElementById('formMessage');

    // Get form data
    const formData = new FormData(this.form);

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        this.showMessage(messageEl, 'success', data.message || 'Thank you for your testimonial! It will be reviewed and published soon.');
        this.form.reset();
        document.getElementById('avatarPreview')?.classList.remove('show');
        document.getElementById('charCounter').textContent = '0';
        
        // Close modal after 3 seconds
        setTimeout(() => {
          this.closeModal();
          this.hideMessage(messageEl);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to submit testimonial');
      }
    } catch (error) {
      console.error('Submit error:', error);
      this.showMessage(messageEl, 'error', error.message || 'Failed to submit testimonial. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Testimonial';
    }
  }

  showMessage(element, type, message) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `form-message ${type} show`;
  }

  hideMessage(element) {
    if (!element) return;
    element.className = 'form-message';
  }

  closeModal() {
    if (this.modal) {
      this.modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.testimonialSlider = new TestimonialSlider();
  window.testimonialForm = new TestimonialForm();
});