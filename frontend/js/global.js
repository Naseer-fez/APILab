/**
 * ==========================================================================
 * GLOBAL APPLICATION STATE & ENGINE (Pure Vanilla ES6)
 * ==========================================================================
 */

// Safe Storage Wrapper (guards against browser privacy or file:// sandbox restrictions)
window.safeStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('safeStorage.getItem blocked:', e);
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('safeStorage.setItem blocked:', e);
    }
  },
  getSession(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setSession(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {}
  }
};

// Theme Manager (Pure Vanilla ES6 - Light & Dark Mode System)
window.themeManager = {
  storageKey: 'app_theme',

  getTheme() {
    try {
      const stored = (window.safeStorage && window.safeStorage.getItem(this.storageKey)) ||
                     localStorage.getItem(this.storageKey);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch (e) {}
    return 'light'; // Default mode preserved as light
  },

  setTheme(theme) {
    const activeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', activeTheme);
    }
    try {
      if (window.safeStorage) {
        window.safeStorage.setItem(this.storageKey, activeTheme);
      } else {
        localStorage.setItem(this.storageKey, activeTheme);
      }
    } catch (e) {}

    this.updateToggleUI(activeTheme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: activeTheme } }));
    return activeTheme;
  },

  toggle() {
    const current = this.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    return this.setTheme(next);
  },

  updateToggleUI(theme) {
    const isDark = theme === 'dark';
    const buttons = document.querySelectorAll('.theme-toggle-btn, #themeToggleBtn');
    buttons.forEach(btn => {
      btn.setAttribute('data-theme', theme);
      btn.setAttribute('aria-label', `Current mode: ${theme}. Click to switch to ${isDark ? 'light' : 'dark'} mode`);
      btn.setAttribute('title', `Switch to ${isDark ? 'light' : 'dark'} mode`);

      const textEl = btn.querySelector('.theme-toggle-text');
      if (textEl) {
        textEl.textContent = isDark ? 'DARK' : 'LIGHT';
      }

      if (isDark) {
        btn.classList.add('is-dark');
        btn.classList.remove('is-light');
      } else {
        btn.classList.add('is-light');
        btn.classList.remove('is-dark');
      }
    });
  },

  init() {
    const theme = this.getTheme();
    this.setTheme(theme);

    // Global click listener for any theme toggle button
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-toggle-btn, #themeToggleBtn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
    });

    // Cross-tab synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey && (e.newValue === 'dark' || e.newValue === 'light')) {
        this.setTheme(e.newValue);
      }
    });
  }
};

// Immediate early activation so DOM attribute is set synchronously
(function() {
  try {
    const initialTheme = window.themeManager.getTheme();
    document.documentElement.setAttribute('data-theme', initialTheme);
  } catch (e) {}
})();

// Default JSON Payload Templates using backend test endpoints
const DEFAULT_PAYLOADS = {
  CONCURRENCY: {
    link: "http://127.0.0.1:3000",
    endpoint: "/tests/apitest",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    bodytosend: {
      name: "Naseer",
      age: 25,
      salary: 50000,
      arr: [1, 2, 3]
    },
    data: {
      requests: 50,
      concurency: 10,
      increment: 5,
      interval: 100,
      timout: 5000
    }
  },
  FUZZY: {
    link: "http://127.0.0.1:3000/tests/apitest",
    method: "POST",
    requests: 15,
    headers: {
      "Content-Type": "application/json"
    },
    data: {
      name: {
        type: "string",
        values: ["Naseer", "Alice", "Bob"]
      },
      age: {
        type: "int",
        values: [21, 25, 30]
      },
      salary: {
        type: "float",
        values: [45000, 60000, 80000]
      },
      arr: {
        type: "array",
        values: [[1, 2], [3, 4]]
      }
    }
  },
  SEQUENCE: {
    request: [
      {
        link: "http://127.0.0.1:3000/tests/step1",
        method: "POST",
        fileavailable: false,
        storeheader: false,
        storedata: true,
        expectedstatus: 200,
        data: {
          message: "hello"
        },
        conditions: {
          if: {
            status: [200],
            condition: "{{response.status}} == 200",
            raiseerror: false,
            data: {
              userId: "{{response.data.user.id}}",
              userName: "{{response.data.user.name}}",
              token: "{{response.data.token}}"
            },
            dataavailable: true,
            header: {
              Authorization: "Bearer {{response.data.token}}",
              "X-User-ID": "{{response.data.user.id}}"
            },
            headeravailable: true,
            overwritenextdata: true,
            overwriteheader: true
          }
        }
      },
      {
        link: "http://127.0.0.1:3000/tests/step2",
        method: "POST",
        fileavailable: false,
        storeheader: true,
        storedata: true,
        expectedstatus: 200,
        headers: {
          Authorization: "{{Authorization}}",
          "X-User-ID": "{{X-User-ID}}"
        },
        data: {
          userId: "{{userId}}",
          userName: "{{userName}}",
          token: "{{token}}"
        },
        conditions: {
          if: {
            status: [200],
            condition: "{{response.status}} == 200",
            raiseerror: false,
            data: {
              orderId: "{{response.data.orderId}}",
              total: "{{response.data.total}}"
            },
            dataavailable: true,
            header: {
              "X-Order-ID": "{{response.data.orderId}}"
            },
            headeravailable: true,
            overwritenextdata: true,
            overwriteheader: true
          }
        }
      },
      {
        link: "http://127.0.0.1:3000/tests/step3",
        method: "POST",
        fileavailable: false,
        storeheader: false,
        storedata: false,
        expectedstatus: 200,
        headers: {
          "X-Order-ID": "{{X-Order-ID}}"
        },
        data: {
          orderId: "{{orderId}}",
          total: "{{total}}"
        }
      }
    ]
  }
};

// Global App State Controller
window.appState = {
  getMode() {
    return window.safeStorage.getItem('active_test_mode') || 'CONCURRENCY';
  },
  setMode(mode) {
    const validModes = ['CONCURRENCY', 'FUZZY', 'SEQUENCE'];
    if (!validModes.includes(mode)) return;
    window.safeStorage.setItem('active_test_mode', mode);
  },
  getPayload(mode) {
    const currentMode = mode || this.getMode();
    const stored = window.safeStorage.getItem(`api_payload_${currentMode}`);
    if (stored) return stored;
    return JSON.stringify(DEFAULT_PAYLOADS[currentMode] || DEFAULT_PAYLOADS.CONCURRENCY, null, 2);
  },
  setPayload(payloadText, mode) {
    const currentMode = mode || this.getMode();
    window.safeStorage.setItem(`api_payload_${currentMode}`, payloadText);
    // Keep unified copy for editor
    window.safeStorage.setItem('api_json_payload', payloadText);
  },
  getLastResult() {
    try {
      const data = window.safeStorage.getItem('last_run_result');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  saveResult(resultObj) {
    try {
      const currentMode = this.getMode();
      if (resultObj && typeof resultObj === 'object') {
        resultObj.mode = resultObj.mode || currentMode;
      }
      window.safeStorage.setItem('last_run_result', JSON.stringify(resultObj));
      // Store in History list
      const historyStr = window.safeStorage.getItem('test_runs_history') || '[]';
      const history = JSON.parse(historyStr);
      history.unshift({
        id: 'run_' + Date.now(),
        timestamp: new Date().toISOString(),
        mode: currentMode,
        result: resultObj
      });
      // Keep last 20 runs
      window.safeStorage.setItem('test_runs_history', JSON.stringify(history.slice(0, 20)));
      // Set unseen result flag
      window.safeStorage.setItem('unseen_results_count', '1');
      window.updateResultBadge();
    } catch (e) {
      console.error('Failed to save result:', e);
    }
  }
};

// Utility: Syntax validation
window.validateJsonSyntax = function(str) {
  try {
    const parsed = JSON.parse(str);
    return { valid: true, error: null, parsed };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

// Utility: Format numbers & bytes
window.formatBytes = function(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

window.formatMs = function(ms) {
  if (typeof ms !== 'number') return '0 ms';
  return Math.round(ms) + ' ms';
};

// Result Notification Badge Update
window.updateResultBadge = function() {
  const badgeEl = document.getElementById('resultBadge');
  if (!badgeEl) return;
  const unseen = window.safeStorage.getItem('unseen_results_count');
  if (unseen && parseInt(unseen) > 0) {
    badgeEl.textContent = unseen;
    badgeEl.style.display = 'flex';
  } else {
    badgeEl.style.display = 'none';
  }
};

// ==========================================================================
// UNIFIED INFO BOXES SYSTEM (NOTICE, ERROR, SUCCESS from infoboxes.svg)
// ==========================================================================
window.showInfoBox = function(options = {}) {
  const {
    type = 'notice', // 'notice' | 'error' | 'success'
    title = '',
    message = '',
    onAction = null
  } = options;

  // For notices, stay on screen for 2 seconds (2000ms) as requested
  const duration = type === 'notice' ? 2000 : (options.duration !== undefined ? options.duration : 5000);

  let container = document.getElementById('infoBoxContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'infoBoxContainer';
    document.body.appendChild(container);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'info-box-wrapper';

  const defaultTitles = {
    notice: 'NOTICE',
    error: 'ERROR',
    success: 'Success'
  };
  const displayTitle = title || defaultTitles[type] || 'NOTICE';

  wrapper.innerHTML = `
    <div class="info-box-card ${type}">
      <div class="info-box-header">
        <div class="info-box-title">
          <span>${displayTitle}</span>
        </div>
        <button class="info-box-close" title="Dismiss" aria-label="Dismiss">&times;</button>
      </div>
      <div class="info-box-body">
        ${message}
      </div>
    </div>
  `;

  // Dismiss function
  const dismiss = () => {
    wrapper.classList.add('dismissing');
    setTimeout(() => {
      wrapper.remove();
    }, 320);
  };

  wrapper.querySelector('.info-box-close').addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });

  const bodyEl = wrapper.querySelector('.info-box-body');
  if (typeof onAction === 'function') {
    bodyEl.style.cursor = 'pointer';
    bodyEl.addEventListener('click', () => {
      onAction();
      dismiss();
    });
  }

  container.appendChild(wrapper);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return wrapper;
};

// ==========================================================================
// CLIENT-SIDE DATA CACHING & INSTANT PREFETCH CONTROLLER
// Eliminates perceived data fetching lag across pages by fetching ahead of time
// ==========================================================================
window.dataCache = {
  _cache: new Map(),

  async get(url) {
    if (this._cache.has(url)) {
      return this._cache.get(url);
    }
    try {
      const stored = sessionStorage.getItem('cache_' + url);
      if (stored) {
        const parsed = JSON.parse(stored);
        this._cache.set(url, parsed);
        return parsed;
      }
    } catch (e) {}
    return null;
  },

  set(url, data) {
    this._cache.set(url, data);
    try {
      sessionStorage.setItem('cache_' + url, JSON.stringify(data));
    } catch (e) {}
  },

  clearResults() {
    this._cache.forEach((_, key) => {
      if (key.includes('/api/results')) {
        this._cache.delete(key);
        try { sessionStorage.removeItem('cache_' + key); } catch (e) {}
      }
    });
  },

  async fetchWithCache(url, options = {}) {
    const cached = await this.get(url);
    if (cached && !options.force) {
      return cached;
    }
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.set(url, data);
      return data;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  },

  prefetch(urls) {
    const list = Array.isArray(urls) ? urls : [urls];
    list.forEach(url => {
      if (!this._cache.has(url)) {
        this.fetchWithCache(url).catch(() => {});
      }
    });
  }
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager.init();
  window.updateResultBadge();

  // Eagerly prefetch frequently accessed endpoints so navigation is instantaneous
  setTimeout(() => {
    window.dataCache.prefetch([
      '/api/results/page/1',
      '/api/results/0',
      '/docs/concurrency',
      '/docs/fuzzy',
      '/docs/sequence'
    ]);
  }, 80);
});
