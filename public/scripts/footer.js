// function initFooter() {
//   document.addEventListener("DOMContentLoaded", function () {
//     document.getElementById("yearC").textContent = new Date().getFullYear();

//     // Contact Modal Script
//     (function () {
//       const modal = document.getElementById("contactModal");
//       const contactBtns = document.querySelectorAll(".contact-btn");
//       const closeBtn = document.querySelector(".contact-close");
//       const form = document.getElementById("contactForm");
//       const messageTextarea = document.getElementById("contactMessage");
//       const charCount = document.getElementById("charCount");

//       // Open modal when any contact button is clicked
//       contactBtns.forEach((btn) => {
//         btn.addEventListener("click", function (e) {
//           console.log("contact btn clicked");
//           modal.style.display = "block";
//           document.body.style.overflow = "hidden";
//         });
//       });

//       // Close modal
//       function closeModal() {
//         modal.style.display = "none";
//         document.body.style.overflow = "auto";
//       }

//       closeBtn.addEventListener("click", closeModal);

//       window.addEventListener("click", function (e) {
//         if (e.target === modal) {
//           closeModal();
//         }
//       });

//       // Character counter
//       messageTextarea.addEventListener("input", function () {
//         charCount.textContent = this.value.length;
//       });

//       // Form submission
//       form.addEventListener("submit", async function (e) {
//         e.preventDefault();

//         const submitBtn = document.getElementById("contactSubmitBtn");
//         const btnText = document.getElementById("contactBtnText");
//         const btnSpinner = document.getElementById("contactBtnSpinner");
//         const errorDiv = document.getElementById("contactError");
//         const successDiv = document.getElementById("contactSuccess");

//         // Clear previous messages
//         errorDiv.style.display = "none";
//         successDiv.style.display = "none";

//         // Disable button and show loading
//         submitBtn.disabled = true;
//         btnText.textContent = "Sending...";
//         btnSpinner.style.display = "inline-block";

//         const formData = {
//           name: document.getElementById("contactName").value.trim(),
//           email: document.getElementById("contactEmail").value.trim(),
//           subject: document.getElementById("contactSubject").value.trim(),
//           message: document.getElementById("contactMessage").value.trim(),
//         };

//         try {
//           const response = await fetch(
//             "https://worktoolshubv2.onrender.com/api/contact/send",
//             {
//               method: "POST",
//               headers: {
//                 "Content-Type": "application/json",
//               },
//               body: JSON.stringify(formData),
//             }
//           );

//           const data = await response.json();

//           if (response.ok) {
//             successDiv.textContent =
//               "Message sent successfully! We'll get back to you soon.";
//             successDiv.style.display = "block";
//             form.reset();
//             charCount.textContent = "0";

//             setTimeout(() => {
//               closeModal();
//               successDiv.style.display = "none";
//             }, 3000);
//           } else {
//             throw new Error(data.error || "Failed to send message");
//           }
//         } catch (error) {
//           errorDiv.textContent =
//             error.message || "Failed to send message. Please try again.";
//           errorDiv.style.display = "block";
//         } finally {
//           submitBtn.disabled = false;
//           btnText.textContent = "Send Message";
//           btnSpinner.style.display = "none";
//         }
//       });
//     })();



//   });
// }


// const footerContainer = document.getElementById("footer");
// const observer = new MutationObserver(() => {
//   if (footerContainer.innerHTML.trim() !== "") {
//     initFooter();
//     observer.disconnect(); 
//   }
// });
// observer.observe(footerContainer, { childList: true });



// footer.js - drop-in replacement

function initFooter() {
  function run() {
    // === year ===
    const yearEl = document.getElementById("yearC");
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    // === Contact Modal Script (keeps your logic intact) ===
    (function () {
      const modal = document.getElementById("contactModal");
      const contactBtns = document.querySelectorAll(".contact-btn");
      const closeBtn = document.querySelector(".contact-close");
      const form = document.getElementById("contactForm");
      const messageTextarea = document.getElementById("contactMessage");
      const charCount = document.getElementById("charCount");

      // If modal isn't present, nothing to wire up
      if (!modal) return;

      // Open modal when any contact button is clicked
      if (contactBtns && contactBtns.length) {
        contactBtns.forEach((btn) => {
          btn.addEventListener("click", function (e) {
            console.log("contact btn clicked");
            modal.style.display = "block";
            document.body.style.overflow = "hidden";
          });
        });
      }

      // Close modal
      function closeModal() {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      }

      if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
      }

      window.addEventListener("click", function (e) {
        if (e.target === modal) {
          closeModal();
        }
      });

      // Character counter
      if (messageTextarea && charCount) {
        messageTextarea.addEventListener("input", function () {
          charCount.textContent = this.value.length;
        });
      }

      // Form submission
      if (form) {
        form.addEventListener("submit", async function (e) {
          e.preventDefault();

          const submitBtn = document.getElementById("contactSubmitBtn");
          const btnText = document.getElementById("contactBtnText");
          const btnSpinner = document.getElementById("contactBtnSpinner");
          const errorDiv = document.getElementById("contactError");
          const successDiv = document.getElementById("contactSuccess");

          // Clear previous messages
          if (errorDiv) errorDiv.style.display = "none";
          if (successDiv) successDiv.style.display = "none";

          // Disable button and show loading
          if (submitBtn) submitBtn.disabled = true;
          if (btnText) btnText.textContent = "Sending...";
          if (btnSpinner) btnSpinner.style.display = "inline-block";

          const formData = {
            name: (document.getElementById("contactName")?.value || "").trim(),
            email: (document.getElementById("contactEmail")?.value || "").trim(),
            subject: (document.getElementById("contactSubject")?.value || "").trim(),
            message: (document.getElementById("contactMessage")?.value || "").trim(),
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
              if (successDiv) {
                successDiv.textContent =
                  "Message sent successfully! We'll get back to you soon.";
                successDiv.style.display = "block";
              }
              if (form.reset) form.reset();
              if (charCount) charCount.textContent = "0";

              setTimeout(() => {
                closeModal();
                if (successDiv) successDiv.style.display = "none";
              }, 3000);
            } else {
              throw new Error(data.error || "Failed to send message");
            }
          } catch (error) {
            if (errorDiv) {
              errorDiv.textContent =
                error.message || "Failed to send message. Please try again.";
              errorDiv.style.display = "block";
            }
          } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (btnText) btnText.textContent = "Send Message";
            if (btnSpinner) btnSpinner.style.display = "none";
          }
        });
      }
    })();
  } // end run()

  // if DOM still loading, wait; otherwise run now
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}

// Wait for the footer container to get injected by layout.js
const footerContainer = document.getElementById("footer");
if (footerContainer) {
  const observer = new MutationObserver(() => {
    if (footerContainer.innerHTML.trim() !== "") {
      initFooter();
      observer.disconnect();
    }
  });
  observer.observe(footerContainer, { childList: true });
} else {
  // fallback: init immediately if there's no #footer element (rare)
  initFooter();
}
