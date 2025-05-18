// Browser compatibility check utilities
export const browserCheck = {
  // Check browser features
  checkFeatures: () => {
    return {
      localStorage: typeof window.localStorage !== 'undefined',
      sessionStorage: typeof window.sessionStorage !== 'undefined',
      indexedDB: typeof window.indexedDB !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webp: testWebP(),
      touch: 'ontouchstart' in window,
      grid: CSS.supports('display', 'grid'),
      flexbox: CSS.supports('display', 'flex'),
    };
  },

  // Get browser info
  getBrowserInfo: () => {
    const ua = navigator.userAgent;
    const browsers = {
      chrome: /chrome/i,
      safari: /safari/i,
      firefox: /firefox/i,
      edge: /edg/i,
    };

    return Object.entries(browsers)
      .find(([, regex]) => regex.test(ua))?.[0] || 'unknown';
  },
};

// Test WebP support
function testWebP() {
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
}