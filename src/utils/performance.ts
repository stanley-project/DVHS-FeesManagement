// Performance monitoring utilities
export const performanceMetrics = {
  // Track page load time
  measurePageLoad: () => {
    const timing = window.performance.timing;
    return {
      total: timing.loadEventEnd - timing.navigationStart,
      network: timing.responseEnd - timing.fetchStart,
      dom: timing.domComplete - timing.domLoading,
    };
  },

  // Track component render time
  measureRenderTime: (callback: () => void) => {
    const start = performance.now();
    callback();
    const end = performance.now();
    return end - start;
  },

  // Track memory usage
  getMemoryUsage: () => {
    if ('memory' in window.performance) {
      const memory = (window.performance as any).memory;
      return {
        total: memory.totalJSHeapSize,
        used: memory.usedJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};

// Performance optimization utilities
export const optimizePerformance = {
  // Debounce function for search inputs
  debounce: (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for scroll events
  throttle: (func: Function, limit: number) => {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
};