/**
 * JSON EDITOR SCRIPT
 * Manages JSON textarea, live line numbers, syntax validation, COPY, and AUTO FIX.
 */

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('jsonCodeInput');
  if (!textarea) return;

  // 1. Load existing payload or provide clean default
  const storedJson = window.safeStorage ? window.safeStorage.getItem('api_json_payload') : null;
  if (storedJson) {
    textarea.value = storedJson;
  } else {
    const defaultTemplate = {
      concurrency_threads: 16,
      batch_timeout_ms: 250,
      target_route: "/api/v1/auth/verify",
      benchmark_cycles: 50,
      retry_policy: {
        max_attempts: 3,
        backoff_multiplier: 1.5
      }
    };
    textarea.value = JSON.stringify(defaultTemplate, null, 2);
  }

  // Initial updates
  updateLineNumbers();
  validateJsonSyntax();

  // Input listeners
  textarea.addEventListener('input', () => {
    updateLineNumbers();
    validateJsonSyntax();
    if (window.safeStorage) {
      window.safeStorage.setItem('api_json_payload', textarea.value);
    }
  });

  textarea.addEventListener('keydown', (e) => {
    // Support Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      updateLineNumbers();
    }
  });

  // Sync line numbers scrolling with textarea
  textarea.addEventListener('scroll', () => {
    const lineNumbers = document.getElementById('lineNumbersCol');
    if (lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  });
});

/**
 * Generate Line Numbers based on line count
 */
function updateLineNumbers() {
  const textarea = document.getElementById('jsonCodeInput');
  const lineCol = document.getElementById('lineNumbersCol');
  if (!textarea || !lineCol) return;

  const lines = textarea.value.split('\n');
  const count = Math.max(lines.length, 1);
  let numbersHtml = '';
  for (let i = 1; i <= count; i++) {
    numbersHtml += `<div>${i}</div>`;
  }
  lineCol.innerHTML = numbersHtml;
}

/**
 * Validate JSON syntax in real time
 */
function validateJsonSyntax() {
  const textarea = document.getElementById('jsonCodeInput');
  const badge = document.getElementById('syntaxBadge');
  const lineCol = document.getElementById('lineNumbersCol');
  if (!textarea || !badge) return;

  try {
    JSON.parse(textarea.value);
    badge.className = 'syntax-status-badge valid';
    badge.innerHTML = '● Valid JSON';
    textarea.style.color = '#78C2E9';
    return true;
  } catch (err) {
    badge.className = 'syntax-status-badge invalid';
    badge.innerHTML = '▲ Syntax Error';
    textarea.style.color = '#F87171';
    return false;
  }
}

/**
 * COPY: Copies JSON code to clipboard
 */
async function handleCopy() {
  const textarea = document.getElementById('jsonCodeInput');
  if (!textarea) return;

  try {
    await navigator.clipboard.writeText(textarea.value);
    showToast('✓ JSON Copied to Clipboard!');
  } catch (err) {
    textarea.select();
    document.execCommand('copy');
    showToast('✓ JSON Copied to Clipboard!');
  }
}

/**
 * AUTO FIX: Repairs common JSON syntax issues
 * - Fixes single quotes to double quotes
 * - Fixes unquoted keys
 * - Strips trailing commas
 * - Corrects missing braces
 */
function handleAutoFix() {
  const textarea = document.getElementById('jsonCodeInput');
  if (!textarea) return;

  let raw = textarea.value;

  try {
    // If it's already valid, just pretty-format it
    const parsed = JSON.parse(raw);
    textarea.value = JSON.stringify(parsed, null, 2);
    updateLineNumbers();
    validateJsonSyntax();
    if (window.safeStorage) {
      window.safeStorage.setItem('api_json_payload', textarea.value);
    }
    showToast('✓ Auto-formatted cleanly');
    return;
  } catch (initialErr) {
    // Attempt automatic repair passes
  }

  // 1. Replace single quotes around values and keys with double quotes
  let fixed = raw.replace(/'/g, '"');

  // 2. Quote unquoted keys (e.g. { key: 123 } -> { "key": 123 })
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');

  // 3. Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');

  // 4. Ensure enclosing brackets if missing
  const trimmed = fixed.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    fixed = '{\n' + fixed + '\n}';
  }

  try {
    const repaired = JSON.parse(fixed);
    textarea.value = JSON.stringify(repaired, null, 2);
    updateLineNumbers();
    validateJsonSyntax();
    if (window.safeStorage) {
      window.safeStorage.setItem('api_json_payload', textarea.value);
    }
    showToast('⚡ AUTO FIX APPLIED: Repaired syntax & brackets!');
  } catch (secondErr) {
    // Apply best-effort cleaned text
    textarea.value = fixed;
    updateLineNumbers();
    validateJsonSyntax();
    showToast('⚠️ Auto-fix performed best effort; check remaining syntax');
  }
}

/**
 * Return to Homepage
 */
function handleReturnHome(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (window.safeStorage) {
    window.safeStorage.setSession('app_has_loaded', 'true');
  }
  showToast('Returning to Homepage...');
  setTimeout(() => {
    window.location.href = 'index.html?from=editor';
  }, 100);
}
