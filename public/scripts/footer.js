  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("yearC").textContent = new Date().getFullYear();
    
  // Contact Modal Script
  (function () {
    const modal = document.getElementById("contactModal");
    const contactBtns = document.querySelectorAll(".contact-btn");
    const closeBtn = document.querySelector(".contact-close");
    const form = document.getElementById("contactForm");
    const messageTextarea = document.getElementById("contactMessage");
    const charCount = document.getElementById("charCount");

    // Open modal when any contact button is clicked
    contactBtns.forEach((btn) => {
      btn.addEventListener("click", function (e) {
        console.log("contact btn clicked");
        modal.style.display = "block";
        document.body.style.overflow = "hidden";
      });
    });

    // Close modal
    function closeModal() {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }

    closeBtn.addEventListener("click", closeModal);

    window.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Character counter
    messageTextarea.addEventListener("input", function () {
      charCount.textContent = this.value.length;
    });

    // Form submission
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const submitBtn = document.getElementById("contactSubmitBtn");
      const btnText = document.getElementById("contactBtnText");
      const btnSpinner = document.getElementById("contactBtnSpinner");
      const errorDiv = document.getElementById("contactError");
      const successDiv = document.getElementById("contactSuccess");

      // Clear previous messages
      errorDiv.style.display = "none";
      successDiv.style.display = "none";

      // Disable button and show loading
      submitBtn.disabled = true;
      btnText.textContent = "Sending...";
      btnSpinner.style.display = "inline-block";

      const formData = {
        name: document.getElementById("contactName").value.trim(),
        email: document.getElementById("contactEmail").value.trim(),
        subject: document.getElementById("contactSubject").value.trim(),
        message: document.getElementById("contactMessage").value.trim(),
      };

      try {
        const response = await fetch(
          "https://worktoolshubv2.onrender.com/api/contact/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          }
        );

        const data = await response.json();

        if (response.ok) {
          successDiv.textContent =
            "Message sent successfully! We'll get back to you soon.";
          successDiv.style.display = "block";
          form.reset();
          charCount.textContent = "0";

          setTimeout(() => {
            closeModal();
            successDiv.style.display = "none";
          }, 3000);
        } else {
          throw new Error(data.error || "Failed to send message");
        }
      } catch (error) {
        errorDiv.textContent =
          error.message || "Failed to send message. Please try again.";
        errorDiv.style.display = "block";
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = "Send Message";
        btnSpinner.style.display = "none";
      }
    });
  })();

  });
