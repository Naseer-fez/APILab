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

  let currentMode = window.appState.getMode();

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

      window.showInfoBox({
        type: 'notice',
        title: 'MODE SWITCH',
        message: `Active engine set to <b>${mode}</b>. Switched to designated payload.`,
        duration: 3000
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
      // Fallback
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
        duration: 3000
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
      // Unrepairable syntax flaw
      window.showInfoBox({
        type: 'error',
        title: 'AUTO FIX FAILED',
        message: `Could not automatically repair JSON syntax.<br/><span style="color: #FFF;">Error: ${err.message}</span>`,
        duration: 5000
      });
    }
  }
});
