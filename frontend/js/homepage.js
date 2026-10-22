/**
 * ==========================================================================
 * HOMEPAGE LOGIC CONTROLLER (Pure Vanilla ES6)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Loader Screen Lifecycle
  handleLoaderLifecycle();

  // 2. Navbar Triangle Pop-out & Mode Switching
  initNavbarTriangles();

  // 3. Dual-Mode JSON Workspace (Manual vs Chain)
  initJsonWorkspace();

  // 4. Action Buttons (RUN, RESULT, HISTORY, EDITOR, FORMAT, PASTE)
  initActionButtons();
});

/* ==========================================================================
   1. LOADER SCREEN LIFECYCLE
   ========================================================================== */
function handleLoaderLifecycle() {
  const loader = document.getElementById('loaderScreen');
  if (!loader) return;

  const urlParams = new URLSearchParams(window.location.search);
  const hasLoaded = window.safeStorage.getSession('app_has_loaded') === 'true';
  const fromOtherPage = urlParams.has('from');

  if (hasLoaded || fromOtherPage) {
    document.documentElement.classList.add('no-loader');
    loader.remove();
  } else {
    // Let animation run once
    window.safeStorage.setSession('app_has_loaded', 'true');
    setTimeout(() => {
      loader.remove();
    }, 2400);
  }
}

/* ==========================================================================
   2. NAVBAR TRIANGLE POP-OUT (3D SVG Layering)
   ========================================================================== */
function initNavbarTriangles() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const svg = document.querySelector('.pill-navbar-svg');

  function activateMode(modeKey) {
    window.appState.setMode(modeKey);

    navButtons.forEach(btn => {
      const btnMode = btn.dataset.mode;
      if (btnMode === modeKey) {
        btn.classList.add('active');
        btn.classList.remove('inactive');
        // SVG DOM Re-ordering: Appending paints it on TOP of neighbor triangles
        if (svg) svg.appendChild(btn);
      } else {
        btn.classList.remove('active');
        btn.classList.add('inactive');
      }
    });

    // Update target endpoint display badge
    updateTargetEndpointBadge(modeKey);

    // Sync editor with active mode's payload
    const payload = window.appState.getPayload(modeKey);
    const textarea = document.getElementById('manualJsonTextarea');
    if (textarea) {
      textarea.value = payload;
      updateSyntaxBadge();
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activateMode(btn.dataset.mode);
    });
  });

  // Activate initial mode
  const initialMode = window.appState.getMode();
  activateMode(initialMode);
}

function updateTargetEndpointBadge(mode) {
  const badge = document.getElementById('targetEndpointBadge');
  if (!badge) return;

  const endpointMap = {
    CONCURRENCY: '/api/concurrencetest',
    FUZZY: '/api/apitests',
    SEQUENCE: '/api/sequencetest'
  };
  badge.textContent = endpointMap[mode] || '/api/concurrencetest';
}

/* ==========================================================================
   3. DUAL-MODE JSON WORKSPACE (MANUAL vs CHAIN)
   ========================================================================== */
let activeJsonView = 'manual'; // 'manual' | 'chain'

function initJsonWorkspace() {
  const tabManual = document.getElementById('tabManual');
  const tabChain = document.getElementById('tabChain');
  const manualView = document.getElementById('manualView');
  const chainView = document.getElementById('chainView');
  const textarea = document.getElementById('manualJsonTextarea');

  // Load initial payload
  const currentMode = window.appState.getMode();
  textarea.value = window.appState.getPayload(currentMode);
  updateSyntaxBadge();

  // Tab switching
  tabManual.addEventListener('click', () => switchJsonView('manual'));
  tabChain.addEventListener('click', () => switchJsonView('chain'));

  // Live input sync & validation
  textarea.addEventListener('input', () => {
    updateSyntaxBadge();
    window.appState.setPayload(textarea.value);
  });

  // Tab indentation in textarea
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      updateSyntaxBadge();
      window.appState.setPayload(textarea.value);
    }
  });

  // Chain controls
  document.getElementById('btnAddPair')?.addEventListener('click', () => {
    const chainBody = document.getElementById('chainBody');
    if (chainBody) {
      renderKvRow('new_key', 'value', chainBody, false);
      serializeChainTreeToManual();
    }
  });

  document.getElementById('btnAddBranch')?.addEventListener('click', () => {
    const chainBody = document.getElementById('chainBody');
    if (chainBody) {
      renderBranchNode('new_branch', { key: 'value' }, chainBody, false);
      serializeChainTreeToManual();
    }
  });

  document.getElementById('btnMainFold')?.addEventListener('click', toggleMainBranchFold);
}

function switchJsonView(targetView) {
  if (activeJsonView === targetView) return;

  const tabManual = document.getElementById('tabManual');
  const tabChain = document.getElementById('tabChain');
  const manualView = document.getElementById('manualView');
  const chainView = document.getElementById('chainView');
  const textarea = document.getElementById('manualJsonTextarea');

  if (targetView === 'chain') {
    // Parse manual JSON to chain rows
    const validation = window.validateJsonSyntax(textarea.value);
    if (!validation.valid) {
      window.showInfoBox({
        type: 'error',
        title: 'SYNTAX ERROR',
        message: `Cannot switch to &lt;&gt; CHAIN view: Invalid JSON syntax.<br/><span style="color:#FFF;">${validation.error}</span>`,
        duration: 4500
      });
      return;
    }

    renderChainRows(validation.parsed);
    manualView.style.display = 'none';
    chainView.style.display = 'flex';
    tabManual.classList.remove('active');
    tabChain.classList.add('active');
    activeJsonView = 'chain';
  } else {
    // Serialize chain rows to manual JSON
    serializeChainTreeToManual();
    chainView.style.display = 'none';
    manualView.style.display = 'flex';
    tabChain.classList.remove('active');
    tabManual.classList.add('active');
    activeJsonView = 'manual';
  }
}

function updateSyntaxBadge() {
  const badge = document.getElementById('syntaxBadge');
  const textarea = document.getElementById('manualJsonTextarea');
  if (!badge || !textarea) return;

  const val = window.validateJsonSyntax(textarea.value);
  if (val.valid) {
    badge.className = 'syntax-badge valid';
    badge.textContent = '● Valid JSON';
  } else {
    badge.className = 'syntax-badge invalid';
    badge.textContent = '▲ Syntax Error';
  }
}

/* ==========================================================================
   HIERARCHICAL <> CHAIN BRANCH & TREE EDITOR
   ========================================================================== */
function renderChainRows(obj) {
  const chainBody = document.getElementById('chainBody');
  if (!chainBody) return;
  chainBody.innerHTML = '';
  renderChainTree(obj, chainBody);
}

function renderChainTree(data, container) {
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (item !== null && typeof item === 'object') {
        renderBranchNode(index, item, container, true);
      } else {
        renderKvRow(index, item, container, true);
      }
    });
  } else if (data !== null && typeof data === 'object') {
    Object.entries(data).forEach(([key, val]) => {
      if (val !== null && typeof val === 'object') {
        renderBranchNode(key, val, container, false);
      } else {
        renderKvRow(key, val, container, false);
      }
    });
  } else {
    renderKvRow('value', data, container, false);
  }
}

/* --- Render Primitive Key-Value Row with Branch Conversion --- */
function renderKvRow(key, val, container, isArrayItem = false) {
  const row = document.createElement('div');
  row.className = 'kv-row';
  row.dataset.rowType = 'primitive';
  row.dataset.isArrayItem = isArrayItem ? 'true' : 'false';

  const valDisplay = val === null ? 'null' : String(val ?? '');

  row.innerHTML = `
    <button class="btn-bracket-icon" title="Toggle fold">&lt;&gt;</button>
    ${isArrayItem 
      ? `<span class="pill-input-key" style="width: auto; padding: 6px 14px; opacity: 0.75;">[${key}]</span>` 
      : `<input type="text" class="pill-input-key" value="${escapeHtml(key)}" placeholder="KEY" />`
    }
    <span class="row-colon">:</span>
    <input type="text" class="pill-input-value" value="${escapeHtml(valDisplay)}" placeholder="VALUE" />
    <span class="folded-badge">&lt;&gt; ... [folded]</span>
    <button class="btn-add-subbranch" title="Add branches to this key">&lt;&gt; + Branch</button>
    <button class="btn-remove-row" title="Delete key">&times;</button>
  `;

  // Fold toggle
  row.querySelector('.btn-bracket-icon').addEventListener('click', () => {
    row.classList.toggle('row-reduced');
  });
  row.querySelector('.folded-badge').addEventListener('click', () => {
    row.classList.remove('row-reduced');
  });

  // Convert key-value into a nested branch
  row.querySelector('.btn-add-subbranch').addEventListener('click', () => {
    const k = isArrayItem ? key : (row.querySelector('.pill-input-key')?.value.trim() || 'branch');
    const branchNode = renderBranchNode(k, { sub_key: 'sub_val' }, container, isArrayItem);
    row.replaceWith(branchNode);
    serializeChainTreeToManual();
  });

  // Remove row
  row.querySelector('.btn-remove-row').addEventListener('click', () => {
    row.remove();
    serializeChainTreeToManual();
  });

  // Live input sync
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', serializeChainTreeToManual);
  });

  container.appendChild(row);
  return row;
}

/* --- Render Nested Branch Node ({ } Object or [ ] Array) --- */
function renderBranchNode(key, branchData, container, isArrayItem = false) {
  const isArray = Array.isArray(branchData);
  const node = document.createElement('div');
  node.className = 'branch-node';
  node.dataset.rowType = 'branch';
  node.dataset.branchType = isArray ? 'array' : 'object';
  node.dataset.isArrayItem = isArrayItem ? 'true' : 'false';

  const typeLabel = isArray ? '[ ] Array' : '{ } Object';

  node.innerHTML = `
    <div class="branch-row">
      <button class="btn-bracket-icon" title="Fold / Unfold Branch">&lt;&gt;</button>
      ${isArrayItem 
        ? `<span class="pill-input-key" style="width: auto; padding: 6px 14px; opacity: 0.75;">[${key}]</span>` 
        : `<input type="text" class="pill-input-key" value="${escapeHtml(key)}" placeholder="BRANCH KEY" />`
      }
      <span class="row-colon">:</span>
      <span class="branch-type-pill">${typeLabel}</span>
      <span class="branch-fold-summary">&lt;&gt; ... [branch folded]</span>
      <button class="btn-remove-row" title="Delete entire branch">&times;</button>
    </div>
    <div class="branch-inner">
      <div class="branch-children"></div>
      <div class="branch-actions">
        <button class="btn-branch-add btn-add-pair">+ Add Key-Value</button>
        <button class="btn-branch-add btn-add-branch">&lt;&gt; + Add Branch</button>
      </div>
    </div>
  `;

  // Fold toggle
  node.querySelector('.branch-row .btn-bracket-icon').addEventListener('click', () => {
    node.classList.toggle('branch-folded');
  });
  node.querySelector('.branch-fold-summary').addEventListener('click', () => {
    node.classList.remove('branch-folded');
  });

  // Remove branch
  node.querySelector('.branch-row .btn-remove-row').addEventListener('click', () => {
    node.remove();
    serializeChainTreeToManual();
  });

  // Key input sync
  node.querySelector('.branch-row input')?.addEventListener('input', serializeChainTreeToManual);

  const childrenContainer = node.querySelector('.branch-children');

  // Add child key-value
  node.querySelector('.btn-add-pair').addEventListener('click', () => {
    renderKvRow('key', 'value', childrenContainer, isArray);
    serializeChainTreeToManual();
  });

  // Add child nested branch
  node.querySelector('.btn-add-branch').addEventListener('click', () => {
    renderBranchNode('nested_branch', { item: 'val' }, childrenContainer, isArray);
    serializeChainTreeToManual();
  });

  // Recursively render child items
  renderChainTree(branchData, childrenContainer);

  container.appendChild(node);
  return node;
}

function toggleMainBranchFold() {
  const chainBody = document.getElementById('chainBody');
  if (!chainBody) return;
  chainBody.style.display = chainBody.style.display === 'none' ? 'flex' : 'none';
}

/* ==========================================================================
   RECURSIVE CHAIN TREE SERIALIZER
   ========================================================================== */
function serializeChainTreeToManual() {
  const chainBody = document.getElementById('chainBody');
  const textarea = document.getElementById('manualJsonTextarea');
  if (!chainBody || !textarea) return;

  const result = serializeContainer(chainBody, false);
  const formatted = JSON.stringify(result, null, 2);
  textarea.value = formatted;
  updateSyntaxBadge();
  window.appState.setPayload(formatted);
}

function serializeContainer(container, isArray) {
  const children = Array.from(container.children).filter(el => 
    el.classList.contains('kv-row') || el.classList.contains('branch-node')
  );

  if (isArray) {
    const arr = [];
    children.forEach(el => {
      if (el.dataset.rowType === 'primitive') {
        const valStr = el.querySelector('.pill-input-value')?.value.trim() ?? '';
        arr.push(parseCoercedValue(valStr));
      } else if (el.dataset.rowType === 'branch') {
        const subContainer = el.querySelector('.branch-children');
        const subIsArray = el.dataset.branchType === 'array';
        arr.push(serializeContainer(subContainer, subIsArray));
      }
    });
    return arr;
  } else {
    const obj = {};
    children.forEach(el => {
      const keyInput = el.querySelector('.pill-input-key');
      const k = keyInput ? (keyInput.value !== undefined ? keyInput.value.trim() : keyInput.textContent.replace(/[\[\]]/g, '').trim()) : '';
      if (!k) return;

      if (el.dataset.rowType === 'primitive') {
        const valStr = el.querySelector('.pill-input-value')?.value.trim() ?? '';
        obj[k] = parseCoercedValue(valStr);
      } else if (el.dataset.rowType === 'branch') {
        const subContainer = el.querySelector('.branch-children');
        const subIsArray = el.dataset.branchType === 'array';
        obj[k] = serializeContainer(subContainer, subIsArray);
      }
    });
    return obj;
  }
}

function parseCoercedValue(vStr) {
  if (vStr === 'true') return true;
  if (vStr === 'false') return false;
  if (vStr === 'null') return null;
  if (!isNaN(Number(vStr)) && vStr !== '') return Number(vStr);
  try {
    return JSON.parse(vStr);
  } catch (e) {
    return vStr;
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ==========================================================================
   4. ACTION BUTTONS (RUN, FORMAT, PASTE)
   ========================================================================== */
function initActionButtons() {
  // FORMAT Button
  document.getElementById('btnFormat')?.addEventListener('click', handleFormat);

  // PASTE Button
  document.getElementById('btnPaste')?.addEventListener('click', handlePaste);

  // RUN Button
  document.getElementById('btnRun')?.addEventListener('click', handleRun);
}

function handleFormat() {
  const textarea = document.getElementById('manualJsonTextarea');
  if (!textarea) return;

  const currentMode = window.appState.getMode();

  // If empty, load default template
  if (!textarea.value.trim()) {
    const template = window.appState.getPayload(currentMode);
    textarea.value = template;
    updateSyntaxBadge();
    window.showInfoBox({
      type: 'success',
      title: 'Success',
      message: `Loaded clean default ${currentMode} template into editor.`,
      duration: 3500
    });
    return;
  }

  const val = window.validateJsonSyntax(textarea.value);
  if (val.valid) {
    textarea.value = JSON.stringify(val.parsed, null, 2);
    updateSyntaxBadge();
    window.appState.setPayload(textarea.value);

    if (activeJsonView === 'chain') {
      renderChainRows(val.parsed);
    }

    window.showInfoBox({
      type: 'success',
      title: 'Success',
      message: 'JSON payload formatted with 2-space indentation.',
      duration: 3000
    });
  } else {
    window.showInfoBox({
      type: 'error',
      title: 'FORMAT ERROR',
      message: `Unable to format invalid JSON: ${val.error}`,
      duration: 4500
    });
  }
}

async function handlePaste() {
  const textarea = document.getElementById('manualJsonTextarea');
  if (!textarea) return;

  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      window.showInfoBox({
        type: 'notice',
        title: 'NOTICE',
        message: 'Clipboard is empty. Copy some JSON first.',
        duration: 3000
      });
      return;
    }

    if (activeJsonView === 'manual') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
      updateSyntaxBadge();
      window.appState.setPayload(textarea.value);
    } else {
      const val = window.validateJsonSyntax(text);
      if (val.valid) {
        renderChainRows(val.parsed);
        serializeChainRowsToManual();
      } else {
        addChainRow('pasted_item', text);
        serializeChainRowsToManual();
      }
    }

    window.showInfoBox({
      type: 'success',
      title: 'Success',
      message: 'Clipboard text pasted into JSON area.',
      duration: 2500
    });
  } catch (err) {
    // Fallback prompt if clipboard permission denied
    const text = prompt('Paste your JSON payload below:');
    if (text) {
      textarea.value = text;
      updateSyntaxBadge();
      window.appState.setPayload(text);
    }
  }
}

/* ==========================================================================
   5. EXECUTION DISPATCHER (RUN) & E-COMMERCE DEAL ALERT
   ========================================================================== */
async function handleRun() {
  const textarea = document.getElementById('manualJsonTextarea');
  const runBtn = document.getElementById('btnRun');
  const mode = window.appState.getMode();

  const val = window.validateJsonSyntax(textarea.value);
  if (!val.valid) {
    window.showInfoBox({
      type: 'error',
      title: 'EXECUTION HALTED',
      message: `Invalid JSON payload. Please fix syntax errors before running: ${val.error}`,
      duration: 5000
    });
    return;
  }

  // Button loading state
  if (runBtn) {
    runBtn.style.opacity = '0.7';
    runBtn.textContent = 'RUNNING...';
  }

  const endpointMap = {
    CONCURRENCY: '/api/concurrencetest',
    FUZZY: '/api/apitests',
    SEQUENCE: '/api/sequencetest'
  };
  const targetUrl = endpointMap[mode] || '/api/concurrencetest';

  let resultData = null;

  try {
    // Live backend call directly to current host or port 3000
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(val.parsed),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    try {
      resultData = JSON.parse(responseText);
    } catch (e) {
      resultData = { message: responseText };
    }

    if (!response.ok) {
      const errMsg = resultData?.message 
        ? (typeof resultData.message === 'object' ? JSON.stringify(resultData.message) : resultData.message)
        : `Server returned HTTP ${response.status}`;
      throw new Error(errMsg);
    }
  } catch (err) {
    console.error('Backend execution error:', err);
    window.showInfoBox({
      type: 'error',
      title: 'TEST RUN FAILED',
      message: `Failed to execute test against backend at <code>${targetUrl}</code>:<br/><span style="color:#FFF;">${escapeHtml(err.message)}</span><br/><br/>Ensure the backend server is running on http://127.0.0.1:3000.`,
      duration: 6500
    });
    return;
  } finally {
    if (runBtn) {
      runBtn.style.opacity = '1';
      runBtn.textContent = 'RUN';
    }
  }

  // Save real backend result to storage
  if (resultData && typeof resultData === 'object') {
    resultData.mode = mode;
  }
  window.appState.saveResult(resultData);

  // Floating Notification with real backend numbers
  const reqCount = resultData.metrics?.latency?.count ?? resultData.metrics?.summary?.totalRequestsSent ?? 0;
  const avgMs = resultData.metrics?.latency?.averageMs ?? resultData.metrics?.latency?.average ?? 0;
  const failed = resultData.metrics?.summary?.totalRequestsFailed ?? 0;
  const passed = resultData.metrics?.summary?.successfulRequests ?? resultData.metrics?.summary?.totalRequestsPassed ?? (reqCount - failed);

  const statusText = failed === 0 
    ? `All ${reqCount} requests passed cleanly (${avgMs}ms avg).`
    : `${passed} succeeded, ${failed} failed.`;

  window.showInfoBox({
    type: 'notice',
    title: 'RESULTS AVAILABLE',
    message: `
      <div style="font-size: 14px; font-weight: 800; margin-bottom: 4px;">🎉 Test Run Completed (${mode})</div>
      <div>${statusText}</div>
      <div style="margin-top: 8px; font-size: 11px; text-decoration: underline; color: #78C2E9; font-weight: 700;">
        👉 Tap here or click RESULT to view full performance charts & metrics &gt;
      </div>
    `,
    duration: 8000,
    onAction: () => {
      window.location.href = 'result.html';
    }
  });
}

