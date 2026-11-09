/**
 * ==========================================================================
 * JSON EDITOR CONTROLLER (Pure Vanilla ES6)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('jsonCodeInput');
  const lineCol = document.getElementById('lineNumbersCol');
  const syntaxBadge = document.getElementById('syntaxBadge');
  const btnCopy = document.getElementById('btnCopy');
  const btnAutoFix = document.getElementById('btnAutoFix');
  const modePills = document.querySelectorAll('.btn-mode-pill');

  // Split Documentation Elements
  const editorLayout = document.getElementById('editorLayout');
  const btnDocsToggle = document.getElementById('btnDocsToggle');
  const editorDocsCard = document.getElementById('editorDocsCard');
  const btnMaximizeDocs = document.getElementById('btnMaximizeDocs');
  const btnCloseDocs = document.getElementById('btnCloseDocs');
  const splitDocsModeBadge = document.getElementById('splitDocsModeBadge');
  const splitDocsBody = document.getElementById('splitDocsBody');

  const urlParams = new URLSearchParams(window.location.search);
  const paramMode = urlParams.get('mode');
  if (paramMode) {
    window.appState.setMode(paramMode.toUpperCase());
  }

  let currentMode = window.appState.getMode();
  let isSplitDocsOpen = false;

  // Load payload from storage
  textarea.value = window.appState.getPayload(currentMode);
  updateLineNumbers();
  updateSyntaxStatus();
  updateActiveModePills(currentMode);

  // Sync scroll between gutter and textarea
  textarea.addEventListener('scroll', () => {
    lineCol.scrollTop = textarea.scrollTop;
  });

  // Sync line numbers & syntax on input
  textarea.addEventListener('input', () => {
    updateLineNumbers();
    updateSyntaxStatus();
    window.appState.setPayload(textarea.value, currentMode);
  });

  // Tab key indentation (2 spaces)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      updateLineNumbers();
      updateSyntaxStatus();
      window.appState.setPayload(textarea.value, currentMode);
    }
  });

  // Interactive Corner Drag-to-Resize for Code Editor Card
  const resizeHandle = document.getElementById('editorResizeHandle');
  const codeEditorCard = document.getElementById('codeEditorCard');
  if (resizeHandle && codeEditorCard) {
    let isResizing = false;
    let startX = 0, startY = 0, startW = 0, startH = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = codeEditorCard.offsetWidth;
      startH = codeEditorCard.offsetHeight;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newW = Math.max(340, Math.min(window.innerWidth - 180, startW + (e.clientX - startX)));
      const newH = Math.max(260, Math.min(window.innerHeight - 90, startH + (e.clientY - startY)));
      codeEditorCard.style.width = `${newW}px`;
      codeEditorCard.style.maxWidth = 'none';
      codeEditorCard.style.height = `${newH}px`;
      codeEditorCard.style.flex = 'none';
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    });
  }

  // Interactive Corner Drag-to-Resize for Docs Card
  const docsResizeHandle = document.getElementById('docsResizeHandle');
  if (docsResizeHandle && editorDocsCard) {
    let isDocsResizing = false;
    let startDocsX = 0, startDocsY = 0, startDocsW = 0, startDocsH = 0;

    docsResizeHandle.addEventListener('mousedown', (e) => {
      isDocsResizing = true;
      startDocsX = e.clientX;
      startDocsY = e.clientY;
      startDocsW = editorDocsCard.offsetWidth;
      startDocsH = editorDocsCard.offsetHeight;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDocsResizing) return;
      const newW = Math.max(260, Math.min(window.innerWidth - 180, startDocsW + (e.clientX - startDocsX)));
      const newH = Math.max(260, Math.min(window.innerHeight - 90, startDocsH + (e.clientY - startDocsY)));
      editorDocsCard.style.width = `${newW}px`;
      editorDocsCard.style.height = `${newH}px`;
      editorDocsCard.style.flex = 'none';
    });

    window.addEventListener('mouseup', () => {
      if (isDocsResizing) {
        isDocsResizing = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    });
  }

  // Mode switcher pills
  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const mode = pill.dataset.mode;
      currentMode = mode;
      window.appState.setMode(mode);
      updateActiveModePills(mode);

      // Load payload for this mode
      textarea.value = window.appState.getPayload(mode);
      updateLineNumbers();
      updateSyntaxStatus();

      // If split documentation is open, automatically keep docs in sync
      if (isSplitDocsOpen) {
        loadSplitDocs(mode);
      }

      window.showInfoBox({
        type: 'notice',
        title: 'MODE SWITCH',
        message: `Active engine set to <b>${mode}</b>. Switched to designated payload.`,
        duration: 2000
      });
    });
  });

  // COPY Button
  btnCopy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      window.showInfoBox({
        type: 'success',
        title: 'Success',
        message: '📋 JSON payload copied to clipboard!',
        duration: 3000
      });
    } catch (err) {
      textarea.select();
      document.execCommand('copy');
      window.showInfoBox({
        type: 'success',
        title: 'Success',
        message: '📋 JSON payload copied to clipboard!',
        duration: 3000
      });
    }
  });

  // AUTO FIX Button
  btnAutoFix?.addEventListener('click', () => {
    handleAutoFix();
  });

  /* ==========================================================================
     SPLIT SCREEN DOCUMENTATION CONTROLLER
     ========================================================================== */
  btnDocsToggle?.addEventListener('click', () => {
    toggleSplitDocs();
  });

  btnCloseDocs?.addEventListener('click', () => {
    toggleSplitDocs(false);
  });

  btnMaximizeDocs?.addEventListener('click', () => {
    // Open full documentation page, passing active mode and from=editor
    window.location.href = `docs.html?mode=${currentMode}&from=editor`;
  });

  function toggleSplitDocs(forceState) {
    isSplitDocsOpen = typeof forceState === 'boolean' ? forceState : !isSplitDocsOpen;

    if (isSplitDocsOpen) {
      editorLayout.classList.add('docs-split-active');
      editorDocsCard.style.display = 'flex';
      btnDocsToggle?.classList.add('active');
      window.safeStorage?.setItem('split_docs_open', 'true');
      loadSplitDocs(currentMode);
    } else {
      editorLayout.classList.remove('docs-split-active');
      editorDocsCard.style.display = 'none';
      btnDocsToggle?.classList.remove('active');
      window.safeStorage?.setItem('split_docs_open', 'false');
    }
  }

  async function loadSplitDocs(mode) {
    if (!splitDocsBody) return;

    if (splitDocsModeBadge) {
      splitDocsModeBadge.textContent = mode;
      splitDocsModeBadge.className = `split-docs-mode-badge ${mode.toLowerCase()}`;
    }

    splitDocsBody.innerHTML = `
      <div class="docs-split-loading">
        <div class="docs-mini-spinner"></div>
        <span>Loading ${mode} specification...</span>
      </div>
    `;

    const endpointKey = mode === 'CONCURRENCY' ? 'concurrency' : mode.toLowerCase();

    try {
      const url = `/docs/${endpointKey}`;
      const json = window.dataCache
        ? await window.dataCache.fetchWithCache(url)
        : await (await fetch(url)).json();
      const text = json.data || json.message || '';
      renderSplitDocs(text);
    } catch (e) {
      splitDocsBody.innerHTML = `
        <div class="docs-split-error">
          <p style="color: #E50914; font-weight: 800; margin-bottom: 6px;">▲ FAILED TO LOAD</p>
          <p>Could not fetch from <code>/docs/${endpointKey}</code>.</p>
          <p style="color: #88929B; font-size: 11px; margin-top: 6px;">Ensure the backend server is running.</p>
        </div>
      `;
    }
  }

  function renderSplitDocs(rawText) {
    const escape = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    splitDocsBody.innerHTML = `
      <pre class="docs-split-pre"><code>${escape(rawText)}</code></pre>
    `;
  }

  // Restore split-screen layout if requested via URL or saved preference
  if (urlParams.get('splitDocs') === 'true' || window.safeStorage?.getItem('split_docs_open') === 'true') {
    toggleSplitDocs(true);
  }

  /* ==========================================================================
     LINE NUMBER GENERATOR
     ========================================================================== */
  function updateLineNumbers() {
    const lines = textarea.value.split('\n').length;
    let numbersText = '';
    for (let i = 1; i <= Math.max(lines, 1); i++) {
      numbersText += i + '\n';
    }
    lineCol.textContent = numbersText;
  }

  function updateSyntaxStatus() {
    const val = window.validateJsonSyntax(textarea.value);
    if (val.valid) {
      syntaxBadge.className = 'syntax-badge valid';
      syntaxBadge.textContent = '● Valid JSON';
    } else {
      syntaxBadge.className = 'syntax-badge invalid';
      syntaxBadge.textContent = '▲ Syntax Error';
    }
  }

  function updateActiveModePills(mode) {
    modePills.forEach(p => {
      if (p.dataset.mode === mode) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     AUTO FIX REGEX ENGINE
     ========================================================================== */
  function handleAutoFix() {
    let text = textarea.value.trim();

    if (!text) {
      window.showInfoBox({
        type: 'notice',
        title: 'NOTICE',
        message: 'Editor is empty. Enter or paste JSON to repair.',
        duration: 2000
      });
      return;
    }

    let repairsMade = 0;

    // Pass 1: Replace single quotes with double quotes around keys and string values
    const singleQuoteRe = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
    if (singleQuoteRe.test(text)) {
      text = text.replace(singleQuoteRe, '"$1"');
      repairsMade++;
    }

    // Pass 2: Quote unquoted object keys: { key: 123 } -> { "key": 123 }
    const unquotedKeyRe = /([{,\s])([a-zA-Z0-9_$]+)\s*:/g;
    if (unquotedKeyRe.test(text)) {
      text = text.replace(unquotedKeyRe, '$1"$2":');
      repairsMade++;
    }

    // Pass 3: Remove trailing commas: [1, 2, ] or { a: 1, }
    const trailingCommaRe = /,(\s*[}\]])/g;
    if (trailingCommaRe.test(text)) {
      text = text.replace(trailingCommaRe, '$1');
      repairsMade++;
    }

    // Pass 4: Ensure enclosing braces if looks like an object
    if (!text.startsWith('{') && !text.startsWith('[') && text.includes(':')) {
      text = '{\n' + text + '\n}';
      repairsMade++;
    }

    // Try parsing the repaired string
    try {
      const parsed = JSON.parse(text);
      const formatted = JSON.stringify(parsed, null, 2);
      textarea.value = formatted;
      updateLineNumbers();
      updateSyntaxStatus();
      window.appState.setPayload(formatted, currentMode);

      window.showInfoBox({
        type: 'success',
        title: 'Success',
        message: `<b>AUTO FIX COMPLETE</b><br/>Successfully resolved syntax flaws and formatted JSON with 2-space indentation.`,
        duration: 4000
      });
    } catch (err) {
      window.showInfoBox({
        type: 'error',
        title: 'AUTO FIX FAILED',
        message: `Could not automatically repair JSON syntax.<br/><span style="color: #FFF;">Error: ${err.message}</span>`,
        duration: 5000
      });
    }
  }
});
