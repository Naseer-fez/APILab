(() => {
  'use strict';

  const app = document.getElementById('app');
  const data = window.API_TEST_LAB_SITE_DATA;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let transitionTimer = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  // ==========================================================================
  // Light & Dark Mode System (Pure Vanilla ES6 - window.themeManager)
  // ==========================================================================
  window.themeManager = {
    storageKey: 'app_theme',
    currentTheme: null,

    getTheme() {
      if (this.currentTheme === 'dark' || this.currentTheme === 'light') {
        return this.currentTheme;
      }
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored === 'dark' || stored === 'light') {
          return stored;
        }
      } catch (e) {}
      const active = document.documentElement.getAttribute('data-theme');
      return active === 'dark' ? 'dark' : 'light';
    },

    setTheme(theme) {
      const activeTheme = theme === 'dark' ? 'dark' : 'light';
      this.currentTheme = activeTheme;
      document.documentElement.setAttribute('data-theme', activeTheme);
      if (document.body) {
        document.body.setAttribute('data-theme', activeTheme);
      }
      try {
        localStorage.setItem(this.storageKey, activeTheme);
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
      const buttons = document.querySelectorAll('.theme-toggle-btn');
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

    getToggleHtml(context = 'default') {
      const current = this.getTheme();
      const isDark = current === 'dark';
      return `
        <button class="theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'}" type="button" data-context="${escapeHtml(context)}" data-theme="${escapeHtml(current)}" aria-label="Current mode: ${escapeHtml(current)}. Click to switch to ${isDark ? 'light' : 'dark'} mode" title="Switch to ${isDark ? 'light' : 'dark'} mode">
          <span class="theme-toggle-pill" aria-hidden="true">
            <span class="theme-icon-slot theme-sun">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </span>
            <span class="theme-icon-slot theme-moon">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </span>
            <span class="theme-toggle-thumb"></span>
          </span>
          <span class="theme-toggle-text">${isDark ? 'DARK' : 'LIGHT'}</span>
        </button>`;
    },

    init() {
      const theme = this.getTheme();
      this.setTheme(theme);

      // Global click delegate for theme toggle buttons
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-toggle-btn');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        }
      });

      // Synchronize across tabs or windows
      window.addEventListener('storage', (e) => {
        if (e.key === this.storageKey && (e.newValue === 'dark' || e.newValue === 'light')) {
          this.setTheme(e.newValue);
        }
      });
    }
  };

  // Initialize themeManager early
  window.themeManager.init();

  const readLocation = () => {
    const parts = window.location.hash.replace(/^#/, '').split('/').filter(Boolean);
    const page = parts[0] || 'welcome';
    return {
      page,
      routeKey: parts[1] || '',
      fromLearnMore: page === 'api' && parts[1] === 'learn-more' ||
        page === 'route' && parts[2] === 'learn-more'
    };
  };

  const navigate = (hash, replace = false) => {
    clearTimeout(transitionTimer);
    if (replace) {
      window.history.replaceState(null, '', `#${hash}`);
      render();
      return;
    }
    if (window.location.hash === `#${hash}`) {
      render();
    } else {
      window.location.hash = hash;
    }
  };

  const shell = (content, { eyebrow = '', title = '', back = 'home' } = {}) => `
    <div class="site-frame">
      <header class="site-header">
        <a class="brand-mark" href="#home" aria-label="API Test Lab home">
          <img src="./Asset/Logo.svg" alt="API Test Lab Logo" class="brand-logo" width="104" height="62" />
          <span>API TEST LAB</span>
        </a>
        <nav class="header-actions" aria-label="Page navigation">
          <div class="header-theme-toggle-wrap">
            ${window.themeManager ? window.themeManager.getToggleHtml('header') : ''}
          </div>
          ${back ? `<a class="header-link header-back" href="#${escapeHtml(back === 'home' ? 'home' : back)}">BACK</a>` : ''}
          <a class="header-link header-home" href="#home">HOME</a>
        </nav>
      </header>
      <section class="page-content">
        ${title ? `<div class="page-heading">${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ''}<h1>${title}</h1></div>` : ''}
        ${content}
      </section>
    </div>`;

  const pageCard = (content, className = '') => `<div class="content-card ${className}">${content}</div>`;

  function renderWelcome() {
    app.innerHTML = `
      <section class="welcome-screen" aria-label="Welcome to API Test Lab">
        <div class="welcome-wash" aria-hidden="true"></div>
        <div class="welcome-logo-wrap">
          <img src="./Asset/Logo.svg" alt="API Test Lab Logo" class="welcome-logo" width="240" height="142" />
        </div>
        <p class="welcome-kicker">A clearer way to explore your APIs</p>
        <h1 class="welcome-title" aria-label="Welcome">
          ${Array.from('WELCOME', (letter, index) => `<span style="--letter-index:${index}" aria-hidden="true">${letter}</span>`).join('')}
        </h1>
        <p class="welcome-caption">API TEST LAB</p>
      </section>`;

    if (reducedMotion.matches) {
      transitionTimer = window.setTimeout(() => navigate('home', true), 80);
    } else {
      transitionTimer = window.setTimeout(() => navigate('home', true), 1500);
    }
  }

  function renderHome() {

    app.innerHTML = `
      <section class="home-page" aria-label="API Test Lab main page">
        <div class="top-left-theme-toggle" aria-label="Theme mode toggle">
          ${window.themeManager ? window.themeManager.getToggleHtml('home') : ''}
        </div>
        <div class="home-brand">
          <img src="./Asset/Logo.svg" alt="API Test Lab Logo" class="home-logo" width="160" height="95" />
          <h1 class="home-wordmark">API TEST LAB</h1>
        </div>
        <nav class="home-map" aria-label="Main sections">
          <a class="home-map-link home-map-what" href="#what-is-it" aria-label="What is API Test Lab"><span class="home-map-text">WHAT IS IT</span></a>
          <a class="home-map-link home-map-download" href="#downloads" aria-label="Download API Test Lab"><span class="home-map-text">DOWNLOAD</span></a>
          <a class="home-map-link home-map-api" href="#api" aria-label="API Explorer"><span class="home-map-text">API</span></a>
        </nav>
        <div class="home-social-links" aria-label="Project links">
          <a class="home-social-link" href="https://github.com/Naseer-fez/APITestLab" target="_blank" rel="noopener noreferrer" aria-label="Visit API Test Lab on GitHub" title="GitHub">
            <svg class="home-social-icon home-social-icon-github" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.23-1.62-1.23-1.62-1.01-.7.08-.69.08-.69 1.12.08 1.71 1.15 1.71 1.15 1 .1.71 2.03 3.68 1.45.1-.73.39-1.23.7-1.52-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.06 1.14a10.65 10.65 0 0 1 5.57 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.12 2.95.71.78 1.14 1.77 1.14 2.99 0 4.29-2.61 5.24-5.1 5.51.4.35.75 1.02.75 2.06v3.05c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
            </svg>
          </a>
          <a class="home-social-link" href="https://www.npmjs.com/package/apitestlab" target="_blank" rel="noopener noreferrer" aria-label="View API Test Lab on npm" title="npm">
            <svg class="home-social-icon home-social-icon-npm" viewBox="0 0 48 30" aria-hidden="true" focusable="false">
              <rect x="1" y="2" width="46" height="26" rx="3" fill="#cb3837" />
              <text x="24" y="21" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="-1.5">npm</text>
            </svg>
          </a>
        </div>
        <footer class="home-footer"><a class="home-footer-license" href="#license">License &amp; Agreement</a></footer>
      </section>`;
  }

  function renderWhatIsIt() {
    const content = `
      <div class="page-brand-banner">
        <img src="./Asset/Logo.svg" alt="API Test Lab Logo" class="page-hero-logo" width="135" height="80" />
        <div class="page-brand-text">
          <span class="page-brand-tag">INTEGRATED DEVELOPER SUITE</span>
          <span class="page-brand-title">API TEST LAB PLATFORM</span>
        </div>
      </div>
      <div class="what-is-it-content">
        <p><span class="copy-marker">#.</span> API TEST LAB is a fully integrated developer testing environment which is used for testing you API across wide range features like Fuzzy, Concurrency and Sequence to fully test you API before the production release.</p>
        <p><span class="copy-marker">##.</span> The main application gives integrated CLI and GUI features all in one component for simple testing without requiring any additional dependency to download.</p>
        <p><span class="copy-marker">###.</span> The API Test Lab is available as a simpler call API, direct usable Executable file across various Operating Systems and programming Languages*.</p>
        <div class="what-is-it-actions">
          <a class="learn-button" href="#api/learn-more">Learn More <span aria-hidden="true">→</span></a>
        </div>
      </div>`;
    app.innerHTML = shell(content, { eyebrow: '', title: 'WHAT IS API TEST LAB' });
  }

  function renderApiSelector(fromLearnMore = false) {
    const headingText = fromLearnMore ? 'Learn More' : 'API';
    const routesConfig = data?.apiSelectorRoutes || {
      fuzzy: 'fuzzy',
      sequence: 'sequence',
      concurrency: 'concurrency'
    };

    app.innerHTML = `
      <section class="api-page" aria-label="API Selection">
        <div class="api-stage" id="apiStage">
          <div class="top-left-theme-toggle api-stage-theme-wrap" aria-label="Theme mode toggle">
            ${window.themeManager ? window.themeManager.getToggleHtml('api-stage') : ''}
          </div>
          <a class="api-stage-brand" href="#home" aria-label="API Test Lab Home">
            <img src="./Asset/Logo.svg" alt="API Test Lab Logo" class="api-stage-logo" width="60" height="36" />
            <span>API TEST LAB</span>
          </a>
          <h1 class="api-heading ${fromLearnMore ? 'api-heading-learn' : ''}">${escapeHtml(headingText)}</h1>
          <svg class="api-connectors" viewBox="0 0 714 425" preserveAspectRatio="none" aria-hidden="true">
            <path d="M357 130 C332 154 225 151 174 181" />
            <path d="M357 130 C382 154 489 151 540 181" />
            <path d="M239 237 C249 248 257 253 268 259" />
            <path d="M488 237 C478 248 468 253 457 259" />
          </svg>
          <button class="api-btn api-btn-library" type="button" data-route="library" aria-label="Open library installation guide">
            <span>LIBRARY</span>
          </button>
          <button class="api-btn api-btn-fuzzy" type="button" data-route="${escapeHtml(routesConfig.fuzzy || 'fuzzy')}" aria-label="Open Fuzzy API details">
            <span>FUZZY</span>
          </button>
          <button class="api-btn api-btn-sequence" type="button" data-route="${escapeHtml(routesConfig.sequence || 'sequence')}" aria-label="Open Sequence API details">
            <span>SEQUENCE</span>
          </button>
          <button class="api-btn api-btn-concurrency" type="button" data-route="${escapeHtml(routesConfig.concurrency || 'concurrency')}" aria-label="Open Concurrency API details">
            <span>CONCURRENCY</span>
          </button>
        </div>
      </section>`;

    const stage = document.getElementById('apiStage');
    if (!stage) return;
    stage.querySelectorAll('.api-btn').forEach((button) => {
      button.addEventListener('click', () => selectApi(button, fromLearnMore));
    });
  }

  function selectApi(button, fromLearnMore) {
    const routeKey = button.dataset.route;
    const stage = document.getElementById('apiStage');
    if (!stage || stage.classList.contains('is-transitioning')) return;

    const buttonBounds = button.getBoundingClientRect();
    const stageBounds = stage.getBoundingClientRect();
    const targetLeft = stageBounds.left + (stageBounds.width * 0.057);
    const targetTop = stageBounds.top + (stageBounds.height * 0.18);

    button.style.setProperty('--selected-x', `${targetLeft - buttonBounds.left}px`);
    button.style.setProperty('--selected-y', `${targetTop - buttonBounds.top}px`);

    stage.classList.add('is-transitioning');
    button.classList.add('is-selected');

    stage.querySelectorAll('.api-btn:not(.is-selected)').forEach((option) => {
      option.classList.add('is-leaving');
    });

    const delay = reducedMotion.matches ? 0 : 800;
    transitionTimer = window.setTimeout(() => {
      if (routeKey === 'library') {
        navigate('library');
      } else {
        navigate(`route/${encodeURIComponent(routeKey)}${fromLearnMore ? '/learn-more' : ''}`);
      }
    }, delay);
  }

  function renderRoute(routeKey, fromLearnMore = false) {
    const route = data?.routes?.[routeKey];
    if (!route) return renderNotFound();

    const cliGuide = {
      fuzzy: {
        command: 'apitestlab api ./fuzzy.json',
        payload: `{
  "link": "https://your-api.example/users",
  "requests": 50,
  "data": {
    "name": { "type": "string", "values": ["Alice", ""] },
    "age": { "type": "int", "range": [18, 65, 10] }
  }
}`,
        summary: 'Save the payload as fuzzy.json. The runner tries the values you define and reports which inputs succeeded or failed.'
      },
      concurrency: {
        command: 'apitestlab concurrency ./concurrency.json',
        payload: `{
  "link": "https://your-api.example/orders",
  "bodytosend": { "amount": 25, "currency": "USD" },
  "data": {
    "requests": 200,
    "concurency": 20,
    "increment": 10,
    "interval": 500,
    "timout": 30000
  }
}`,
        summary: 'Save as concurrency.json. Start with a small request count and increase it gradually while watching failures and latency.'
      },
      sequence: {
        command: 'apitestlab sequence ./sequence.json',
        payload: `{
  "request": [
    {
      "link": "https://your-api.example/auth/login",
      "data": { "username": "demo", "password": "replace-me" },
      "storedata": true,
      "conditions": {
        "if": {
          "condition": "{{response.status}} == 200",
          "data": { "token": "{{response.data.token}}" }
        }
      }
    },
    {
      "link": "https://your-api.example/profile",
      "headers": { "Authorization": "Bearer {{token}}" },
      "data": {}
    }
  ]
}`,
        summary: 'Save as sequence.json. Each item runs in order; values captured from one response can be reused by later steps with double braces.'
      },
      results: {
        command: 'apitestlab results 1',
        payload: '',
        summary: 'Use a result number to inspect one run, or use 0 to print all saved history. The command exits with a failure code when the run fails.'
      }
    }[routeKey];

    const visibleParameters = Array.isArray(route.parameters)
      ? route.parameters.filter((param) => !/(^|\.)method$/i.test(param.name || ''))
      : [];
    const parametersHtml = visibleParameters.length > 0
      ? `<details class="route-parameters-details"><summary>Show ${visibleParameters.length} request fields</summary><div class="route-parameters-list" style="display:flex;flex-direction:column;gap:14px;margin-top:12px;">
          ${visibleParameters.map((param) => `
            <div style="border-bottom:1px solid var(--route-border, rgba(0,0,0,0.12));padding-bottom:12px;">
              <div style="display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;">
                <code style="font-weight:700;font-size:13.5px;">${escapeHtml(param.name)}</code>
                <span class="card-subbadge" style="font-size:10px;padding:2px 7px;">${escapeHtml(param.type)}</span>
                ${param.required
                  ? '<span class="card-subbadge" style="font-size:9.5px;padding:2px 7px;color:#ef4444;border-color:rgba(239,68,68,0.4);background:rgba(239,68,68,0.12);">REQUIRED</span>'
                  : '<span class="card-subbadge" style="font-size:9.5px;padding:2px 7px;">OPTIONAL</span>'}
                ${param.default && param.default !== '—'
                  ? `<span style="font-size:11px;color:var(--route-muted, #64748b);font-family:var(--font-mono);">(default: <code>${escapeHtml(param.default)}</code>)</span>`
                  : ''}
              </div>
              <p style="margin:6px 0 0;font-size:13.5px;line-height:1.55;color:var(--route-muted, var(--muted-ink));">${escapeHtml((param.description || '').replace(/For GET, converted to query params\.\s*/gi, ''))}</p>
            </div>
          `).join('')}
        </div></details>`
      : '';

    const responseFieldsHtml = Array.isArray(route.responseFields) && route.responseFields.length > 0
      ? `<details class="route-parameters-details"><summary>${routeKey === 'results' ? 'Show response and diagnostics fields' : `Show ${route.responseFields.length} response fields`}</summary><div class="route-parameters-list" style="display:flex;flex-direction:column;gap:14px;margin-top:12px;">
          ${route.responseFields.map((f) => `
            <div style="border-bottom:1px solid var(--route-border, rgba(0,0,0,0.1));padding-bottom:10px;">
              <div style="display:flex;align-items:baseline;gap:8px;">
                <code style="font-weight:700;font-size:13px;">${escapeHtml(f.field)}</code>
                <span class="card-subbadge" style="font-size:10px;padding:2px 7px;">${escapeHtml(f.type)}</span>
              </div>
              <p style="margin:5px 0 0;font-size:13px;line-height:1.5;color:var(--route-muted, var(--muted-ink));">${escapeHtml(f.description)}</p>
            </div>
          `).join('')}
        </div></details>`
      : '';

    const visibleErrors = Array.isArray(route.errorResponses)
      ? route.errorResponses.filter((err) => {
          const message = typeof err === 'string' ? err : (err.description || '');
          return !/\/api\/|HTTP method|\b(GET|POST|PUT|DELETE|PATCH)\b/i.test(message);
        })
      : [];
    const errorResponsesHtml = visibleErrors.length > 0
      ? `<div style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">
          ${visibleErrors.map((err) => typeof err === 'string'
            ? `<p class="route-description">${escapeHtml(err)}</p>`
            : `<div style="display:flex;gap:12px;align-items:baseline;">
                <span class="placeholder-pill" style="font-size:11.5px;font-weight:800;padding:3px 10px;font-family:var(--font-mono);">${escapeHtml(err.status)}</span>
                <p style="margin:0;font-size:13.5px;line-height:1.55;color:var(--route-ink, var(--ink));">${escapeHtml(err.description)}</p>
              </div>`
          ).join('')}
        </div>`
      : '';

    const visibleNotes = Array.isArray(route.notes)
      ? route.notes.filter((note) => !/\/api\/|multipart\/form-data|HTTP method|GET requests|POST request|\b(GET|POST|PUT|DELETE|PATCH)\b/i.test(note))
      : [];
    const notesHtml = visibleNotes.length > 0
      ? `<ul class="route-process-list" style="margin-top:10px;">
          ${visibleNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
        </ul>`
      : '';

    const content = `
      <div class="route-hero-bar">
        <div class="route-hero-address">
          <div class="route-address">
            <span class="route-address-label">API GUIDE</span>
            <span class="route-tag-pill">${escapeHtml(route.name)}</span>
            ${route.tag ? `<span class="route-tag-pill">${escapeHtml(route.tag)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="route-grid">
        ${pageCard(`
          <div class="card-heading-row">
            <p class="card-label">USE CASE &amp; OVERVIEW</p>
            <span class="card-subbadge">Purpose</span>
          </div>
          <p class="route-description">${escapeHtml(({ fuzzy: 'Use this guide to check how your target API handles valid, missing, and boundary values. Choose the fields and sample values that matter to your service.', concurrency: 'Use this guide to measure how your target API behaves under parallel traffic. Begin with a modest load, then increase it while reviewing latency and failures.', sequence: 'Use this guide to model a real user journey across dependent API calls, carrying returned IDs or tokens into later steps.', results: 'Use this guide to read saved test runs, check pass or fail outcomes, and track latency or diagnostics in scripts and deployment pipelines.' })[routeKey] || route.useCase || route.description)}</p>
        `, 'route-info-card')}
        ${pageCard(`
          <div class="card-heading-row">
            <p class="card-label">HOW TO USE IN TESTING</p>
            <span class="card-subbadge">Workflow</span>
          </div>
          ${routeKey === 'fuzzy' ? '<ol class="route-process-list"><li>Set <code>link</code> to the full URL of the service you want to test.</li><li>List input fields under <code>data</code>. Give each field a <code>type</code>, then add <code>values</code> or a <code>range</code>.</li><li>Set <code>requests</code> to control the run size. Review success rate, latency percentiles, and diagnostics in the result.</li></ol>' : routeKey === 'concurrency' ? '<ol class="route-process-list"><li>Set <code>link</code> to the full target URL and provide one known-good <code>bodytosend</code>.</li><li>In <code>data</code>, set <code>requests</code>, <code>concurency</code>, <code>increment</code>, <code>interval</code>, and <code>timout</code> to define the load profile.</li><li>Review the summary and cycle metrics. Increase the load gradually to identify where latency or failures rise.</li></ol>' : routeKey === 'sequence' ? '<ol class="route-process-list"><li>Add workflow steps to the <code>request</code> array in the order they should run.</li><li>Set each step’s <code>link</code>, <code>data</code>, and optional <code>headers</code>. Enable <code>storedata</code> when later steps need values from the response.</li><li>Use <code>{{response.data.field}}</code> in conditions to capture values, then <code>{{token}}</code> in later steps to reuse them.</li></ol>' : '<ol class="route-process-list"><li>Run a test first; completed runs are saved automatically.</li><li>Use <code>apitestlab results 1</code> to read a specific record or <code>apitestlab results 0</code> for all history.</li><li>Use <code>apitestlab recent 1</code> to inspect recent records. Check the command’s exit status in automation.</li></ol>'}
        `, 'route-info-card')}
      </div>
      ${parametersHtml ? pageCard(`
        <div class="card-heading-row">
          <p class="card-label">REQUEST PARAMETERS &amp; SPECIFICATION</p>
          <span class="card-subbadge">Parameters</span>
        </div>
        <p class="route-description" style="margin-bottom:8px;">Detailed breakdown of required and optional properties to configure in your request body:</p>
        ${parametersHtml}
      `, 'route-info-card') : ''}
      ${cliGuide ? pageCard(`
        <div class="code-card-header">
          <div>
            <p class="card-label">RUN FROM TERMINAL OR CI/CD</p>
            <span class="code-sublabel">CLI command and example payload</span>
          </div>
          <button class="copy-code-btn" id="copyCodeBtn" type="button" aria-label="Copy CLI command">Copy Command</button>
        </div>
        <p class="route-description">${escapeHtml(cliGuide.summary)}</p>
        <pre class="code-snippet"><code>${escapeHtml(cliGuide.command)}</code></pre>
        ${cliGuide.payload ? `<p class="code-sublabel" style="display:block;margin-top:14px;">Example JSON file (${escapeHtml(routeKey)}.json)</p><pre class="response-placeholder"><code>${escapeHtml(cliGuide.payload)}</code></pre>` : ''}
        <p class="route-description" style="margin-top:12px;">Run the command in your project folder. In CI, add the same command as a build step; the process returns a non-zero exit code when the run fails.</p>
      `, 'code-card') : ''}
      ${pageCard(`
        <div class="response-heading">
          <div>
            <p class="card-label">EXAMPLE RESPONSE</p>
            <span class="response-sublabel">Aggregated metrics &amp; diagnostics</span>
          </div>
          <span class="placeholder-pill response-badge">JSON</span>
        </div>
        <pre class="response-placeholder">${escapeHtml(route.response)}</pre>
      `, 'response-card')}
      ${responseFieldsHtml ? pageCard(`
        <div class="card-heading-row">
          <p class="card-label">${routeKey === 'results' ? 'DIAGNOSTICS BREAKDOWN' : 'RESPONSE FIELDS &amp; METRICS EXPLANATION'}</p>
          <span class="card-subbadge">Diagnostics</span>
        </div>
        <p class="route-description" style="margin-bottom:8px;">${routeKey === 'results' ? 'Expand this section to understand each result and diagnostic field.' : 'Understanding the data points and performance metrics returned by this guide:'}</p>
        ${responseFieldsHtml}
      `, 'route-info-card') : ''}
      ${errorResponsesHtml ? pageCard(`
        <div class="card-heading-row">
          <p class="card-label">STATUS CODES &amp; ERROR RESPONSES</p>
          <span class="card-subbadge">Troubleshooting</span>
        </div>
        ${errorResponsesHtml}
      `, 'route-info-card') : ''}
      ${notesHtml ? pageCard(`
        <div class="card-heading-row">
          <p class="card-label">BEST PRACTICES &amp; IMPLEMENTATION NOTES</p>
          <span class="card-subbadge">Guidance</span>
        </div>
        ${notesHtml}
      `, 'route-info-card') : ''}
      <div class="route-actions">
        <button class="secondary-button" id="routeBackButton" type="button" aria-label="Go back to the previous page">← Go Back</button>
        <a class="text-link" href="#home">Home <span aria-hidden="true">↗</span></a>
      </div>`;

    app.innerHTML = shell(content, {
      eyebrow: 'ROUTE DETAILS',
      title: `<span class="route-heading-path">${escapeHtml(route.name || 'API Guide')}</span>`,
      back: ''
    });

    const routeBackButton = document.getElementById('routeBackButton');
    routeBackButton?.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('library');
      }
    });

    const setupCopyBtn = (btnId, textToCopy) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            const temp = document.createElement('textarea');
            temp.value = textToCopy;
            temp.style.position = 'fixed';
            temp.style.opacity = '0';
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
          }
          btn.textContent = 'Copied!';
          btn.classList.add('is-copied');
          setTimeout(() => {
            btn.textContent = btnId === 'copyCurlBtn' ? 'Copy Command' : 'Copy Code';
            btn.classList.remove('is-copied');
          }, 2000);
        } catch {
          btn.textContent = 'Failed to copy';
          setTimeout(() => {
            btn.textContent = btnId === 'copyCurlBtn' ? 'Copy Command' : 'Copy Code';
          }, 2000);
        }
      });
    };

    if (cliGuide) setupCopyBtn('copyCodeBtn', cliGuide.command);
  }

  function renderLibrary() {
    const guide = data?.libraryGuide;
    const endpointsList = guide?.endpoints || [
      { name: 'Fuzzy Testing', routeKey: 'fuzzy', summary: 'Check input validation with chosen values and ranges.' },
      { name: 'Concurrency Testing', routeKey: 'concurrency', summary: 'Measure latency and failures under parallel load.' },
      { name: 'Sequence Testing', routeKey: 'sequence', summary: 'Simulate multi-step workflows and pass response data forward.' }
    ];

    const resultsEndpointsList = guide?.resultsEndpoints || [
      { name: 'Get Result by Number', description: 'Read one saved test result. Use 0 to print all recorded runs.' },
      { name: 'Recent Results', description: 'Review the latest saved test runs from your terminal.' }
    ];

    const content = `
      <section class="library-guide" aria-label="Node.js package installation guide">
        <div class="library-language-row">
          <span class="library-field-label">LANGUAGE</span>
          <div class="library-language-slider" role="tablist" aria-label="Choose a programming language">
            <button class="library-language-option is-selected" type="button" role="tab" aria-selected="true">Node.js</button>
          </div>
        </div>
        <ol class="library-steps">
          <li class="library-step">
            <span class="library-step-number">01</span>
            <div>
              <h2>Install Node.js</h2>
              <p>Ensure Node.js 18.0.0 or newer is installed on your system.</p>
            </div>
          </li>
          <li class="library-step">
            <span class="library-step-number">02</span>
            <div>
              <h2>Install API Test Lab</h2>
              <p>Install the package globally from npm so the executable command is available in your terminal.</p>
              <pre class="library-command"><code>npm install -g apitestlab</code></pre>
            </div>
          </li>
          <li class="library-step">
            <span class="library-step-number">03</span>
            <div>
              <h2>Start the Server</h2>
              <p>Launch the background testing engine and local server. By default, it initializes and listens on port <code>3000</code>.</p>
              <pre class="library-command"><code>apitestlab start</code></pre>
            </div>
          </li>
          <li class="library-step">
            <span class="library-step-number">04</span>
            <div>
              <h2>How to Call the API Separately</h2>
              <p>Run tests without the web interface by saving a JSON payload and calling the matching CLI command. Use these commands in local scripts or CI/CD steps; failed runs return a non-zero exit code so the pipeline can stop.</p>
              <pre class="library-command"><code>npm install -g apitestlab
apitestlab api ./test/fuzzy.json
apitestlab concurrency ./test/concurrency.json
apitestlab sequence ./test/sequence.json</code></pre>
              <h3 class="library-subheading">Call the running server with cURL</h3>
              <p>In a Bash-based CI job, start API Test Lab as a service and set <code>APITESTLAB_URL</code> to its base address. These commands send the matching JSON files and make the job fail when the server returns an error.</p>
              <pre class="library-command"><code>export APITESTLAB_URL="\${APITESTLAB_URL:-http://127.0.0.1:3000}"

curl --fail --silent --show-error \\
  -H "Content-Type: application/json" --data-binary @./test/fuzzy.json \\
  "$APITESTLAB_URL/api/apitests"

curl --fail --silent --show-error \\
  -H "Content-Type: application/json" --data-binary @./test/concurrency.json \\
  "$APITESTLAB_URL/api/concurrencetest"

curl --fail --silent --show-error \\
  -H "Content-Type: application/json" --data-binary @./test/sequence.json \\
  "$APITESTLAB_URL/api/sequencetest"

curl --fail --silent --show-error "$APITESTLAB_URL/api/results/1"</code></pre>
            </div>
          </li>
          <li class="library-step">
            <span class="library-step-number">05</span>
            <div>
              <h2>Available Test Endpoints &amp; Documentation Links</h2>
              <p>Choose a guide for the payload fields, examples, response details, and the command for running that test:</p>
              <div class="library-entry-list">
                ${endpointsList.map((ep) => `
                  <div class="library-entry-card">
                    <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
                      <span style="font-size:13px;font-weight:800;color:var(--text-muted);">${escapeHtml(ep.name)}</span>
                      <a href="#route/${encodeURIComponent(ep.routeKey)}" class="card-subbadge" style="margin-left:auto;font-size:10.5px;padding:3px 10px;text-decoration:none;" title="Read documentation for ${escapeHtml(ep.name)}">
                        View Docs &rarr;
                      </a>
                    </div>
                    <p>${escapeHtml(ep.summary)}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </li>
          <li class="library-step">
            <span class="library-step-number">06</span>
            <div>
              <h2>Querying Results &amp; Test History</h2>
              <p>Every test run is automatically recorded. You can query past results and metrics programmatically:</p>
              <div class="library-results-list">
                ${resultsEndpointsList.map((rep) => `
                  <div class="library-result-item">
                    <div style="display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;">
                      <span style="font-size:13px;font-weight:700;">${escapeHtml(rep.name)}</span>
                    </div>
                    <p>${escapeHtml(rep.description)}</p>
                  </div>
                `).join('')}
              </div>
              <div style="margin-top:10px;">
                <a href="#route/results" style="font-family:var(--font-mono);font-size:12.5px;font-weight:700;color:inherit;text-decoration:underline;" title="Open Results API Documentation">
                  View Complete Results &amp; History Documentation &rarr;
                </a>
              </div>
              <pre class="library-command"><code>apitestlab results 1
apitestlab results 0
apitestlab recent 1</code></pre>
            </div>
          </li>
          <li class="library-step">
            <span class="library-step-number">07</span>
            <div>
              <h2>Request Headers &amp; Authentication</h2>
              <p>Send <code>Content-Type: application/json</code> for JSON bodies. When your target API requires authentication (e.g. Bearer tokens, API keys), include them inside the <code>headers</code> object of your payload. API Test Lab will faithfully forward them to your target server.</p>
            </div>
          </li>
        </ol>
        <div class="library-actions">
          <a class="secondary-button" href="#api">← Back to APIs</a>
        </div>
      </section>`;
    app.innerHTML = shell(content, { eyebrow: 'LIBRARY', title: 'Simple', back: 'api' });
  }

  const platformIcon = (key) => {
    if (key === 'linux') {
      return `<img src="./tux.svg" onerror="this.onerror=null;this.src='./Asset/linux_icon.png'" class="platform-icon linux-icon" alt="Linux Tux logo" width="88" height="88" />`;
    }
    if (key === 'windows') {
      return `<svg viewBox="0 0 4875 4875" class="platform-icon windows-icon" role="img" aria-label="Windows logo"><path fill="#0078d4" d="M0 0h2311v2310H0zm2564 0h2311v2310H2564zM0 2564h2311v2311H0zm2564 0h2311v2311H2564"/></svg>`;
    }
    return `<svg viewBox="0 0 814 1000" class="platform-icon apple-icon" role="img" aria-label="Apple logo"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>`;
  };

  const resolveDownloadUrl = (platformKey) => {
    if (!platformKey) return '';
    if (typeof data?.getDownloadUrl === 'function') {
      return data.getDownloadUrl(platformKey) || '';
    }
    const platform = data?.platforms?.[platformKey];
    if (platform?.downloadUrl && typeof platform.downloadUrl === 'string') {
      return platform.downloadUrl.replace(/<os>/gi, platform.osKey || platformKey);
    }
    const template = data?.downloadTemplate || '';
    if (template) {
      return template.replace(/<os>/gi, platform?.osKey || platformKey);
    }
    return '';
  };

  function renderDownloads(selectedKey = '') {
    const platforms = data?.platforms || {};
    const keys = ['linux', 'windows', 'macos'];
    const selected = selectedKey && platforms[selectedKey] ? selectedKey : '';
    const cards = keys.map((key) => {
      const platform = platforms[key];
      const isSelected = selected === key;
      return `<button class="platform-card${isSelected ? ' is-selected' : ''}${selected && !isSelected ? ' is-muted' : ''}" type="button" data-platform="${key}" aria-pressed="${isSelected}" aria-label="Select ${escapeHtml(platform?.name || key)}">
        <span class="platform-logo">${platformIcon(key)}</span><span class="platform-name">${escapeHtml(platform?.name || key)}</span>
      </button>`;
    }).join('');
    const platform = selected ? platforms[selected] : null;
    const downloadUrl = selected ? resolveDownloadUrl(selected) : '';
    const hasUrl = Boolean(downloadUrl?.trim());
    const downloadAction = hasUrl
      ? `<a class="download-button primary-button" href="${escapeHtml(downloadUrl)}" download>Download ${escapeHtml(platform.name)} <span aria-hidden="true">↓</span></a>`
      : `<button class="download-button primary-button" type="button" disabled>${selected ? `Download ${escapeHtml(platform.name)}` : 'Select your OS'} <span aria-hidden="true">↓</span></button>`;
    const helper = !selected
      ? 'Choose an operating system to see its download.'
      : hasUrl
        ? `Your ${escapeHtml(platform.name)} download is ready.`
        : `A ${escapeHtml(platform.name)} release link has not been configured yet.`;
    const content = `
      <div class="download-brand-intro">
        <img src="./Asset/Logo.svg" alt="API Test Lab" class="download-banner-logo" width="92" height="55" />
        <div>
          <p class="download-intro-title">Official API Test Lab Desktop Releases</p>
          <p class="download-intro-subtitle">Zero-dependency native binaries for Linux, Windows, and macOS</p>
        </div>
      </div>
      <p class="downloads-lead">Click on your OS</p>
      <div class="platform-grid" role="group" aria-label="Choose an operating system">${cards}</div>
      <div class="download-action-area">${downloadAction}<p class="download-helper" id="downloadHelper" aria-live="polite">${helper}</p></div>`;
    app.innerHTML = shell(content, { eyebrow: 'GET STARTED', title: 'Choose your <span class="title-accent">OS</span>' });
    document.querySelectorAll('.platform-card').forEach((button) => {
      button.addEventListener('click', () => renderDownloads(button.dataset.platform));
    });
  }

  function renderLicense() {
    const license = escapeHtml(data?.licenseText || 'License text has not been configured.');
    const content = `
      ${pageCard(`
        <div class="license-brand-row">
          <img src="./Asset/Logo.svg" alt="API Test Lab" class="license-brand-logo" width="88" height="52" />
          <div>
            <p class="card-label">AGREEMENT &amp; COMPLIANCE</p>
            <p class="license-brand-subtitle">MIT license details and project agreement</p>
          </div>
        </div>
        <p class="agreement-copy">API Test Lab is an experimental utility for API work. Use it only with services you are authorized to test. The software is provided as-is under the MIT License shown below.</p>
      `, 'agreement-card')}
      <section class="license-section" aria-labelledby="license-heading">
        <div class="license-heading-row"><div><p class="card-label">OPEN SOURCE LICENSE</p><h2 id="license-heading">MIT License</h2></div><span class="license-badge">MIT</span></div>
        <pre class="license-text">${license}</pre>
      </section>`;
    app.innerHTML = shell(content, { eyebrow: 'LICENSE & AGREEMENT', title: 'License <span class="title-accent">&amp; Agreement</span>' });
  }

  function renderNotFound() {
    const content = pageCard('<p class="route-description">That page could not be found. Choose a section to continue.</p><a class="primary-button" href="#home">Return home <span aria-hidden="true">↗</span></a>');
    app.innerHTML = shell(content, { title: 'Page <span class="title-accent">not found</span>' });
  }

  function render() {
    clearTimeout(transitionTimer);
    window.scrollTo(0, 0);
    const location = readLocation();
    document.documentElement.dataset.page = location.page;
    switch (location.page) {
      case 'welcome': renderWelcome(); break;
      case 'home': renderHome(); break;
      case 'what-is-it': renderWhatIsIt(); break;
      case 'api': renderApiSelector(location.fromLearnMore); break;
      case 'route': renderRoute(location.routeKey, location.fromLearnMore); break;
      case 'library': renderLibrary(); break;
      case 'downloads': renderDownloads(location.routeKey); break;
      case 'license': renderLicense(); break;
      default: renderNotFound();
    }
    if (window.themeManager) {
      window.themeManager.updateToggleUI(window.themeManager.getTheme());
    }
  }

  window.addEventListener('hashchange', render);
  render();
})();
