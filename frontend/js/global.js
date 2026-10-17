/**
 * GLOBAL JAVASCRIPT SYSTEM
 * Shared across all pages: notification toast, mode switcher, and loader helpers.
 */

// Global State
window.appState = {
  activeMode: 'concurrency', // 'concurrency' | 'fuzzy' | 'sequence'
};

// Safe Storage Wrappers (Gracefully handles privacy/file sandbox restrictions)
window.safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch (e) {}
  },
  getSession(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setSession(key, val) {
    try {
      sessionStorage.setItem(key, val);
    } catch (e) {}
  }
};

/**
 * Toast Notification Popup
 * Displays a non-intrusive pill message at the bottom of the screen
 */
function showToast(message, duration = 2400) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  if (window._toastTimeout) {
    clearTimeout(window._toastTimeout);
  }

  window._toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/**
 * Set Active Mode on Top Pill (concurrency, fuzzy, sequence)
 * Pop-out behavior: Active button is elevated and re-appended in SVG DOM to guarantee top layering!
 */
function setMode(modeKey) {
  window.appState.activeMode = modeKey;
  const modes = ['concurrency', 'fuzzy', 'sequence'];
  const svg = document.querySelector('.nav-triangles-svg');
  const activeBtn = document.getElementById('btn-' + modeKey);

  modes.forEach(m => {
    const btn = document.getElementById('btn-' + m);
    if (btn) {
      if (m === modeKey) {
        btn.classList.add('active');
        btn.classList.remove('inactive');
      } else {
        btn.classList.remove('active');
        btn.classList.add('inactive');
      }
    }
  });

  // Re-order in SVG DOM so active button is the LAST child -> renders on TOP of all other triangles
  if (svg && activeBtn) {
    svg.appendChild(activeBtn);
  }

  // If page-specific handler exists, trigger it
  if (typeof window.onModeChanged === 'function') {
    window.onModeChanged(modeKey);
  } else {
    showToast(`Mode switched to ${modeKey.toUpperCase()}`);
  }
}

/**
 * Loader screen lifecycle
 * - Only plays once per session.
 * - Suppressed completely when returning home via the Home button (🏠).
 * - Ensures loader element is fully removed from DOM after animation.
 */
document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loaderScreen');
  if (!loader) return;

  let skipParam = false;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    skipParam = urlParams.get('skip_loader') === '1' || urlParams.get('from') === 'editor';
  } catch (e) {}

  const hasLoaded = window.safeStorage.getSession('app_has_loaded') === 'true';

  if (hasLoaded || skipParam) {
    // Suppress animation immediately when returning home
    loader.style.display = 'none';
    loader.remove();
  } else {
    // First time load: mark as loaded and remove after animation finishes
    window.safeStorage.setSession('app_has_loaded', 'true');
    setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.style.display = 'none';
        loader.remove();
      }
    }, 2200);
  }
});
