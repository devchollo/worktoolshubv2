# WorkToolsHub - Feature Plans

This document outlines planned features, integrations, and UX improvements for WorkToolsHub, including statistics tracking, tool management, and external service integrations.

---

## 1. Real Statistics Integration

We aim to provide real-time insights into user activity and feature usage across the website. The following metrics are planned:

### Metrics
1. **Email Generated Count** – OpenAI API  
2. **Site Visited Count** – Google Analytics  
3. **Notes Generated Count** – JS template-based generation  
4. **Alt Text Generated Count** – OpenAI API  
5. **Files Uploaded Count** – Backblaze B2  
6. **Code Generated Count** – OpenAI API  

Backend logging will track each request where necessary to maintain cumulative counts.

---

## 2. Integration Planning

| Feature | Integration Approach | Notes |
|---------|-------------------|------|
| Email Generator | OpenAI API | Increment backend counter per request; handle rate limits |
| Notes Generator | JS template | Frontend counter or backend API for cumulative count |
| Alt Text Generator | OpenAI API | Backend logs each request; sync with stats DB |
| File Uploads | Backblaze B2 | Increment count post-upload; validate files |
| Site Visits | Google Analytics | Use GA script on frontend; optional Express tracking for SSR |
| Code Generation | OpenAI API | Log requests in backend for statistics |

---

## 3. UX and Feature Expansion

1. **Tools & Categories Page/Template**
   - Structured page listing all tools.
   - Categorize tools with cards/templates for consistency.

2. **Search Feature in Header**
   - Keyword-based search returning matching tools.
   - Integrates seamlessly with categories and tool pages.

3. **Donation & Reporting**
   - **PayPal donation button** on all pages.
   - **Report Issue button** on all pages to submit feedback or bug reports.

4. **Contact Form**
   - Home page contact form.
   - Powered by **Brevo (formerly Sendinblue)**.
   - Includes **hCaptcha** for spam protection.

5. **Domain Tools**
   - **WHOIS Lookup**: Check registrar and domain information (admin-only access).  
   - **DNS Propagation Checker**: Track DNS changes and propagation status.  

6. **Downdetector Tool**
   - Monitors registered websites for downtime.
   - Sends **email notifications** when a monitored site is down.
   - Integrates with backend scheduler to periodically check uptime.

---

## 4. Tech Stack

- **Frontend**: HTML, ES6, Vanilla JS  
- **Backend**: Express.js  
- **Hosting**: Vercel (frontend), Render (backend)  
- **APIs & Services**:
  - OpenAI API (Email, Alt Text, Code)
  - Backblaze B2 (File Storage)
  - Google Analytics (Site visits)
  - Brevo (Contact Form)
  - hCaptcha (Spam protection)
  - PayPal (Donations)

---

## 5. Future Considerations

- Admin dashboard to view stats and manage tools.
- Persistent storage for statistics (JSON or lightweight database).
- Notifications and logging for downtime monitoring.
- Search autocomplete/suggestions for faster UX.
- Optional authentication for admin-only tools like WHOIS and DNS checks.
- Consider caching counters and analytics data for performance.

---

## 6. How to Contribute

1. Fork the repository.  
2. Implement new features, counters, or integrations.  
3. Ensure proper API integration and logging.  
4. Submit a pull request with notes on functionality.


## ISSUES: 
 > EMBED CODE - VIDEO PLAYER NOT WORKING 
---
## Future Addition - ADMIN
 > Edit Suggestion Inbox
 > Stats page - graphs 
 > Add users [admins]
## Migrate ENV users to DB so that admins can add / delete users on the dashboard. 


*This README serves as a living document for tracking planned feature integrations, UX improvements, and statistics tracking for WorkToolsHub.*
