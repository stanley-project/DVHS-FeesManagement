// Mobile responsiveness utilities
export const mobileUtils = {
  // Check if device is mobile
  isMobile: () => {
    return window.innerWidth <= 768;
  },

  // Check if device supports touch
  isTouchDevice: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  // Get device orientation
  getOrientation: () => {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  },

  // Listen for orientation changes
  onOrientationChange: (callback: (orientation: string) => void) => {
    window.addEventListener('resize', () => {
      callback(mobileUtils.getOrientation());
    });
  },

  // Get viewport dimensions
  getViewportSize: () => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },
};

// Responsive table utilities
export const responsiveTable = {
  // Convert table to cards on mobile
  tableToCards: (tableData: any[]) => {
    if (!mobileUtils.isMobile()) return null;

    return tableData.map(row => ({
      id: row.id,
      title: row.name || row.title,
      details: Object.entries(row)
        .filter(([key]) => !['id', 'name', 'title'].includes(key))
        .map(([key, value]) => ({
          label: key.replace(/([A-Z])/g, ' $1').toLowerCase(),
          value,
        })),
    }));
  },
};