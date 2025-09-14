
// =============================
// Analytics
// =============================
export class Analytics {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.init();
  }

  generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  init() {
    this.track("page_view", {
      path: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });

    this.bindEngagementEvents();
    setInterval(() => this.flush(), 30000);
    window.addEventListener("beforeunload", () => this.flush());
  }

  bindEngagementEvents() {
    let maxScrollDepth = 0;
    window.addEventListener("scroll", () => {
      const scrollDepth =
        (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        if (scrollDepth > 0.25 && scrollDepth <= 0.5) {
          this.track("scroll_depth", { depth: "25%" });
        } else if (scrollDepth > 0.5 && scrollDepth <= 0.75) {
          this.track("scroll_depth", { depth: "50%" });
        } else if (scrollDepth > 0.75 && scrollDepth <= 0.9) {
          this.track("scroll_depth", { depth: "75%" });
        } else if (scrollDepth > 0.9) {
          this.track("scroll_depth", { depth: "90%" });
        }
      }
    });

    let timeOnPage = 0;
    setInterval(() => {
      timeOnPage += 10;
      if ([30, 60, 180].includes(timeOnPage)) {
        this.track("engagement_time", { seconds: timeOnPage });
      }
    }, 10000);
  }

  track(eventName, data = {}) {
    const event = {
      name: eventName,
      data: data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.events.push(event);
    if (this.events.length >= 20) this.flush();
  }

  flush() {
    if (this.events.length === 0) return;
    console.group("📊 Analytics Flush");
    console.table(this.events);
    console.groupEnd();
    this.events = [];
  }
}
