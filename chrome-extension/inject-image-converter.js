/**
 * Image converter script - runs in page context to bypass CORS
 * This file is injected as an external script to bypass CSP restrictions
 */

(function() {
  // Listen for conversion requests
  window.addEventListener('CONVERT_IMAGE_REQUEST', function(event) {
    const { imageUrl, eventId } = event.detail;

    const img = new Image();

    // Don't use crossOrigin - let it load without CORS so we can access pixels
    // img.crossOrigin = 'anonymous';

    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Try to convert - this might fail if image is tainted
        const base64 = canvas.toDataURL('image/png').split(',')[1];

        window.dispatchEvent(new CustomEvent('CONVERT_IMAGE_RESPONSE', {
          detail: { eventId, base64, success: true }
        }));
      } catch (error) {
        window.dispatchEvent(new CustomEvent('CONVERT_IMAGE_RESPONSE', {
          detail: { eventId, error: error.message, success: false }
        }));
      }
    };

    img.onerror = function() {
      window.dispatchEvent(new CustomEvent('CONVERT_IMAGE_RESPONSE', {
        detail: { eventId, error: 'Failed to load image', success: false }
      }));
    };

    img.src = imageUrl;
  });
})();
