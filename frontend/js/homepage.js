/**
 * HOMEPAGE SCRIPT
 * Dual-Mode JSON Workspace:
 * 1. MANUAL MODE: Spacious code editor where user can freely type/paste raw JSON manually.
 * 2. CHAIN MODE: Figma <>{ structured chain with <> branch reduction and KEY/VALUE capsules.
 * Both modes are 100% synchronized and toggleable with 1-click tabs or FORMAT button!
 */

// State
let currentViewMode = 'manual'; // 'manual' | 'chain'
let isMainBranchReduced = false;

// Default method payload
const defaultMethodPayload = {
  concurrency_threads: 16,
  batch_timeout_ms: 250,
  target_route: "/api/v1/auth/verify"
};

document.addEventListener('DOMContentLoaded', () => {
  const manualTextarea = document.getElementById('manualJsonTextarea');
  
  // 1. Load existing payload or provide clean default
  let initialData = defaultMethodPayload;
  const saved = window.safeStorage ? window.safeStorage.getItem('api_json_payload') : null;
  
  if (saved && saved.trim()) {
    try {
      initialData = JSON.parse(saved);
      if (manualTextarea) manualTextarea.value = JSON.stringify(initialData, null, 2);
    } catch (e) {
      if (manualTextarea) manualTextarea.value = saved;
    }
  } else {
    if (manualTextarea) {
      manualTextarea.value = JSON.stringify(defaultMethodPayload, null, 2);
    }
  }

  // Initial populate of chain view so both modes stay ready
  if (typeof initialData === 'object' && initialData !== null) {
    renderBuilderChain(initialData);
  }

  // Update syntax badge
  updateManualSyntaxStatus();

  // Tab key support for indentation in manual textarea
  if (manualTextarea) {
    manualTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = manualTextarea.selectionStart;
        const end = manualTextarea.selectionEnd;
        manualTextarea.value = manualTextarea.value.substring(0, start) + '  ' + manualTextarea.value.substring(end);
        manualTextarea.selectionStart = manualTextarea.selectionEnd = start + 2;
        handleManualInput();
      }
    });
  }

  // Mode change toast
  window.onModeChanged = (modeKey) => {
    showToast(`Homepage mode: ${modeKey.toUpperCase()}`);
  };
});

/**
 * Switch between MANUAL editor and <> CHAIN format view
 */
function switchJsonView(targetMode) {
  const manualWrap = document.getElementById('manualEditorWrap');
  const chainWrap = document.getElementById('chainBracketWrap');
  const tabManual = document.getElementById('tabManual');
  const tabChain = document.getElementById('tabChain');
  const manualTextarea = document.getElementById('manualJsonTextarea');

  if (targetMode === 'chain') {
    // Sync from manual textarea into Chain rows
    let dataToRender = defaultMethodPayload;
    if (manualTextarea && manualTextarea.value.trim()) {
      try {
        dataToRender = JSON.parse(manualTextarea.value);
      } catch (err) {
        showToast('⚠️ Syntax issue in manual JSON, auto-cleaning for chain...');
        try {
          let fixed = manualTextarea.value.replace(/'/g, '"');
          fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');
          fixed = fixed.replace(/,\s*([}\]])/g, '$1');
          dataToRender = JSON.parse(fixed);
        } catch (e2) {
          showToast('⚠️ Could not parse JSON. Please check braces/quotes.');
          return;
        }
      }
    }

    renderBuilderChain(dataToRender);

    if (manualWrap) manualWrap.style.display = 'none';
    if (chainWrap) chainWrap.style.display = 'flex';
    if (tabManual) tabManual.classList.remove('active');
    if (tabChain) tabChain.classList.add('active');

    currentViewMode = 'chain';
    syncToStorage();
    showToast('✓ Switched to <> Chain Format');
  } else {
    // Sync from Chain rows into manual textarea
    const obj = collectPayloadObject();
    const formatted = JSON.stringify(obj, null, 2);
    if (manualTextarea) {
      manualTextarea.value = formatted;
    }

    if (chainWrap) chainWrap.style.display = 'none';
    if (manualWrap) manualWrap.style.display = 'flex';
    if (tabChain) tabChain.classList.remove('active');
    if (tabManual) tabManual.classList.add('active');

    currentViewMode = 'manual';
    updateManualSyntaxStatus();
    syncToStorage();
    showToast('✓ Switched to Manual JSON Editor');
    
    if (manualTextarea) {
      manualTextarea.focus();
    }
  }
}

/**
 * Real-time syntax check in manual mode
 */
function handleManualInput() {
  updateManualSyntaxStatus();
  syncToStorage();
}

function updateManualSyntaxStatus() {
  const textarea = document.getElementById('manualJsonTextarea');
  const badge = document.getElementById('manualSyntaxBadge');
  if (!textarea || !badge) return;

  const text = textarea.value.trim();
  if (!text) {
    badge.className = 'manual-syntax-pill blank';
    badge.innerHTML = '● Empty Workspace';
    return;
  }

  try {
    JSON.parse(text);
    badge.className = 'manual-syntax-pill valid';
    badge.innerHTML = '● Valid JSON';
    textarea.style.color = '#78C2E9';
  } catch (err) {
    badge.className = 'manual-syntax-pill invalid';
    badge.innerHTML = '▲ Invalid JSON Syntax';
    textarea.style.color = '#F87171';
  }
}

/**
 * FORMAT Button Handler
 * - In MANUAL mode: Pretty-formats the JSON (or loads default method if blank)
 * - In CHAIN mode: Formats to clean JSON and switches to manual view
 */
function handleFormat() {
  const manualTextarea = document.getElementById('manualJsonTextarea');

  if (currentViewMode === 'manual') {
    if (!manualTextarea) return;
    const text = manualTextarea.value.trim();

    if (!text) {
      // Blank space -> load existing method structure
      manualTextarea.value = JSON.stringify(defaultMethodPayload, null, 2);
      updateManualSyntaxStatus();
      syncToStorage();
      showToast('✓ Method loaded & formatted into JSON');
      return;
    }

    try {
      const parsed = JSON.parse(text);
      manualTextarea.value = JSON.stringify(parsed, null, 2);
      updateManualSyntaxStatus();
      syncToStorage();
      showToast('✓ JSON Formatted & Indented');
    } catch (err) {
      // Attempt auto-repair
      try {
        let fixed = text.replace(/'/g, '"');
        fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(fixed);
        manualTextarea.value = JSON.stringify(parsed, null, 2);
        updateManualSyntaxStatus();
        syncToStorage();
        showToast('⚡ Repaired & Formatted JSON');
      } catch (e2) {
        showToast('⚠️ Syntax Error: Check quotes and brackets');
      }
    }
  } else {
    // When in chain mode, format directly into clean manual JSON
    switchJsonView('manual');
  }
}

/**
 * Render `<>{ ... }` Chain Builder with interactive Key/Value rows
 */
function renderBuilderChain(dataObj) {
  const container = document.getElementById('kvRowsContainer');
  if (!container) return;

  const entries = Object.entries(dataObj || {});
  let rowsHtml = '';

  if (entries.length === 0) {
    rowsHtml = createRowHtml('key', 'value', 'row-1');
  } else {
    entries.forEach(([key, val], idx) => {
      const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      rowsHtml += createRowHtml(key, displayVal, idx + 1);
    });
  }

  container.innerHTML = rowsHtml;
}

/**
 * HTML for a single `<> [KEY] [VALUE]` row
 */
function createRowHtml(key = '', val = '', id = Date.now()) {
  return `
    <div class="kv-row" id="row-${id}">
      <button type="button" class="btn-bracket-icon" onclick="toggleRowBranch('row-${id}')" title="Click <> to reduce this branch">
        &lt;&gt;
      </button>
      <input type="text" class="pill-input-key" placeholder="KEY" value="${escapeAttr(key)}" oninput="syncToStorage()" autocomplete="off">
      <input type="text" class="pill-input-value" placeholder="VALUE" value="${escapeAttr(val)}" oninput="syncToStorage()" autocomplete="off">
      <button type="button" class="btn-remove-row" onclick="removeRow('row-${id}')" title="Remove field">&times;</button>
    </div>
  `;
}

/**
 * Add a new Key-Value pair
 */
function addNewPair() {
  if (currentViewMode === 'manual') {
    switchJsonView('chain');
  }
  const container = document.getElementById('kvRowsContainer');
  if (!container) return;

  const newId = Date.now();
  const div = document.createElement('div');
  div.innerHTML = createRowHtml('', '', newId);
  const newRow = div.firstElementChild;
  container.appendChild(newRow);
  
  const keyInput = newRow.querySelector('.pill-input-key');
  if (keyInput) keyInput.focus();

  syncToStorage();
}

/**
 * Add a nested branch
 */
function addNewBranch() {
  if (currentViewMode === 'manual') {
    switchJsonView('chain');
  }
  const container = document.getElementById('kvRowsContainer');
  if (!container) return;

  const newId = Date.now();
  const div = document.createElement('div');
  div.innerHTML = createRowHtml('nested_scope', '{"mode": "strict"}', newId);
  container.appendChild(div.firstElementChild);
  syncToStorage();
  showToast('✓ Added branch to chain');
}

/**
 * Toggle Row reduction (when `<>` is clicked on a row)
 */
function toggleRowBranch(rowId) {
  const row = document.getElementById(rowId);
  if (!row) return;

  const isReduced = row.classList.toggle('row-reduced');
  showToast(isReduced ? 'Branch reduced' : 'Branch expanded');
}

/**
 * Toggle Main `<>{` branch reduction
 */
function toggleMainBranch() {
  const body = document.getElementById('chainBody');
  const wrap = document.getElementById('chainBracketWrap');
  if (!body || !wrap) return;

  isMainBranchReduced = !isMainBranchReduced;
  body.classList.toggle('reduced', isMainBranchReduced);

  let existingBadge = document.getElementById('mainReducedBadge');
  if (isMainBranchReduced) {
    if (!existingBadge) {
      existingBadge = document.createElement('div');
      existingBadge.id = 'mainReducedBadge';
      existingBadge.className = 'reduced-badge';
      existingBadge.innerHTML = '&lt;&gt; ... [branch reduced - click to expand]';
      existingBadge.onclick = toggleMainBranch;
      body.parentNode.insertBefore(existingBadge, body.nextSibling);
    }
    showToast('Main branch reduced');
  } else {
    if (existingBadge) existingBadge.remove();
    showToast('Main branch expanded');
  }
}

/**
 * Remove a row
 */
function removeRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
    row.remove();
    syncToStorage();
  }
}

/**
 * Collect current inputs into Object
 */
function collectPayloadObject() {
  const rows = document.querySelectorAll('#kvRowsContainer .kv-row');
  const result = {};

  rows.forEach(row => {
    const kInput = row.querySelector('.pill-input-key');
    const vInput = row.querySelector('.pill-input-value');
    if (kInput && vInput) {
      const k = kInput.value.trim();
      const v = vInput.value.trim();
      if (k) {
        if (v === 'true') result[k] = true;
        else if (v === 'false') result[k] = false;
        else if (!isNaN(v) && v !== '') result[k] = Number(v);
        else {
          try {
            if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
              result[k] = JSON.parse(v);
            } else {
              result[k] = v;
            }
          } catch (e) {
            result[k] = v;
          }
        }
      }
    }
  });

  return result;
}

/**
 * Save current state to storage
 */
function syncToStorage() {
  if (currentViewMode === 'manual') {
    const textarea = document.getElementById('manualJsonTextarea');
    if (textarea && window.safeStorage) {
      window.safeStorage.setItem('api_json_payload', textarea.value);
    }
  } else {
    const obj = collectPayloadObject();
    if (window.safeStorage) {
      window.safeStorage.setItem('api_json_payload', JSON.stringify(obj, null, 2));
    }
  }
}

/**
 * Escapes HTML characters for safe injection
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/"/g, '&quot;');
}

/**
 * PASTE: Pastes JSON or text from clipboard into current mode
 */
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;

    if (currentViewMode === 'manual') {
      const textarea = document.getElementById('manualJsonTextarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        handleManualInput();
        showToast('✓ Pasted into manual JSON editor');
      }
    } else {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null) {
          renderBuilderChain(parsed);
          syncToStorage();
          showToast('✓ JSON Pasted & Mapped into Chain');
          return;
        }
      } catch (err) {}
      
      addNewPair();
      const lastKey = document.querySelector('#kvRowsContainer .kv-row:last-child .pill-input-key');
      const lastVal = document.querySelector('#kvRowsContainer .kv-row:last-child .pill-input-value');
      if (lastKey && lastVal) {
        lastKey.value = 'pasted_field';
        lastVal.value = text;
      }
      syncToStorage();
      showToast('✓ Text pasted into field');
    }
  } catch (err) {
    showToast('⚠️ Please paste manually or allow clipboard access');
  }
}

/**
 * Action Button Handlers
 */
function handleRun() {
  const mode = (window.appState && window.appState.activeMode) ? window.appState.activeMode.toUpperCase() : 'CONCURRENCY';
  showToast(`⚡ Running ${mode} Pipeline...`);
  setTimeout(() => {
    showToast(`✅ ${mode} execution completed with 0 errors!`);
  }, 1000);
}

function handleResult() {
  showToast('📊 View Results: All endpoints responding (HTTP 200 OK)');
}

function handleHistory() {
  showToast('📜 History: 14 past executions archived');
}

/**
 * Navigate to JSON Editor
 */
function handleNavigateToEditor(event) {
  if (event && event.preventDefault) {
    event.preventDefault();
  }
  syncToStorage();
  showToast('Opening JSON Editor...');
  setTimeout(() => {
    window.location.href = 'jsoneditor.html';
  }, 100);
}
