/**
 * ==========================================================================
 * API DOCUMENTATION CONTROLLER (Pure Vanilla ES6)
 * Clean, consistent single-navigation & instant-cached specification viewer
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.docs-tab-btn');
  const contentBody = document.getElementById('docsContentBody');
  const btnGoBack = document.getElementById('btnGoBack');
  const btnCopyDocs = document.getElementById('btnCopyDocs');

  const urlParams = new URLSearchParams(window.location.search);
  let activeMode = urlParams.get('mode') || window.appState?.getMode() || 'CONCURRENCY';
  activeMode = activeMode.toUpperCase();

  let currentDocText = '';

  // Initial load
  setMode(activeMode);

  // Tab click listeners
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setMode(tab.dataset.mode);
    });
  });

  // Single Clean Go Back Navigation
  btnGoBack?.addEventListener('click', (e) => {
    e.preventDefault();
    const from = urlParams.get('from');
    if (from === 'editor') {
      window.location.href = 'jsoneditor.html?splitDocs=true';
    } else if (from === 'home') {
      window.location.href = 'index.html?from=docs';
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html?from=docs';
    }
  });

  // Copy Documentation Specification
  btnCopyDocs?.addEventListener('click', async () => {
    if (!currentDocText) return;
    try {
      await navigator.clipboard.writeText(currentDocText);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = currentDocText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }

    window.showInfoBox({
      type: 'success',
      title: 'Success',
      message: '📋 Documentation specification copied to clipboard!',
      duration: 2000
    });
  });

  async function setMode(mode) {
    activeMode = mode.toUpperCase();

    // Update active tab styles
    tabs.forEach(t => {
      if (t.dataset.mode === activeMode) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // Save in safeStorage
    window.safeStorage?.setItem('active_test_mode', activeMode);
    window.safeStorage?.setItem('split_docs_open', 'true');

    await fetchAndRender(activeMode);
  }

  async function fetchAndRender(mode) {
    contentBody.innerHTML = `
      <div class="docs-loading-state">
        <div class="docs-spinner"></div>
        <span>Loading ${mode} specification...</span>
      </div>
    `;

    const endpointKey = getEndpointKey(mode);

    try {
      const url = `/docs/${endpointKey}`;
      const json = window.dataCache
        ? await window.dataCache.fetchWithCache(url)
        : await (await fetch(url)).json();
      currentDocText = json.data || json.message || '';
      renderContent(mode, currentDocText);
    } catch (err) {
      currentDocText = '';
      contentBody.innerHTML = `
        <div class="docs-error-state">
          <div class="docs-error-title">▲ UNABLE TO LOAD DOCUMENTATION</div>
          <p>Could not fetch specification from <code>/docs/${endpointKey}</code>.</p>
          <p style="color: #88929B; font-size: 12px; margin-top: 6px;">Ensure the backend server is running on port 3000.</p>
          <button class="action-pill-btn btn-retry" onclick="location.reload()">RETRY</button>
        </div>
      `;
    }
  }

  function getEndpointKey(mode) {
    switch (mode) {
      case 'CONCURRENCY': return 'concurrency';
      case 'FUZZY': return 'fuzzy';
      case 'SEQUENCE': return 'sequence';
      case 'RESULTS': return 'results';
      default: return 'fuzzy';
    }
  }

  function renderContent(mode, text) {
    const routeNames = {
      CONCURRENCY: 'POST /api/concurrencetest',
      FUZZY: 'POST /api/apitests',
      SEQUENCE: 'POST /api/sequencetest',
      RESULTS: 'GET /api/results'
    };

    const escape = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const modeClass = mode.toLowerCase();

    contentBody.innerHTML = `
      <div class="docs-simple-layout">
        <div class="docs-meta-bar">
          <span class="docs-endpoint-badge ${modeClass}">${routeNames[mode] || mode}</span>
          <span class="docs-format-label">SPECIFICATION &amp; PAYLOAD FORMAT</span>
        </div>
        <pre class="docs-pre-code"><code>${escape(text)}</code></pre>
      </div>
    `;
  }
});
