export class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.init();
  }

  init() {
    this.measureCLS();
    this.measureFID();
    this.measureLCP();
    this.measureLoadTime();
  }

  measureCLS() {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
    setTimeout(() => {
      this.metrics.cls = clsValue;
      console.log("⚡ CLS:", clsValue);
    }, 5000);
  }

  measureFID() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.fid = entry.processingStart - entry.startTime;
        console.log("⚡ FID:", this.metrics.fid);
        observer.disconnect();
      }
    });
    observer.observe({ type: "first-input", buffered: true });
  }

  measureLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
    window.addEventListener("load", () => {
      setTimeout(() => {
        console.log("⚡ LCP:", this.metrics.lcp);
      }, 1000);
    });
  }

  measureLoadTime() {
    window.addEventListener("load", () => {
      const navigation = performance.getEntriesByType("navigation")[0];
      if (navigation) {
        this.metrics.loadTime =
          navigation.loadEventEnd - navigation.fetchStart;
        console.log("⚡ Load Time:", this.metrics.loadTime);
      }
    });
  }
}
