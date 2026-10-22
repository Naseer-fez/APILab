/**
 * ==========================================================================
 * RUN HISTORY & A/B COMPARATOR CONTROLLER (Pure Vanilla ES6)
 * Integrates /api/results endpoints with client-side & server-side history,
 * search filtering, and delta comparison.
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const historyListEl = document.getElementById('historyList');
  const selectRunA = document.getElementById('selectRunA');
  const selectRunB = document.getElementById('selectRunB');
  const btnOpenResult = document.getElementById('btnOpenResult');

  // Toolbar & Tabs Elements
  const tabBackend = document.getElementById('tabBackend');
  const tabLocal = document.getElementById('tabLocal');
  const searchInput = document.getElementById('historySearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const statusFilter = document.getElementById('statusFilter');
  const modeFilter = document.getElementById('modeFilter');
  const paginationBar = document.getElementById('historyPagination');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pageIndicator = document.getElementById('pageIndicator');

  // Internal state
  let currentSource = 'backend'; // 'backend' | 'local'
  let backendRuns = [];
  let localRuns = [];
  let currentPage = 1;
  let totalPages = 1;
  let backendFailed = false;

  // Initial Load
  loadLocalHistory();
  fetchBackendPage(1);

  // Tab Switching
  tabBackend?.addEventListener('click', () => {
    if (currentSource === 'backend') return;
    currentSource = 'backend';
    tabBackend.classList.add('active');
    tabLocal.classList.remove('active');
    if (backendRuns.length === 0 && !backendFailed) {
      fetchBackendPage(1);
    } else {
      applyFiltersAndRender();
    }
  });

  tabLocal?.addEventListener('click', () => {
    if (currentSource === 'local') return;
    currentSource = 'local';
    tabLocal.classList.add('active');
    tabBackend.classList.remove('active');
    applyFiltersAndRender();
  });

  // Search & Filter Events
  searchInput?.addEventListener('input', () => {
    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
    }
    applyFiltersAndRender();
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      applyFiltersAndRender();
    }
  });

  statusFilter?.addEventListener('change', applyFiltersAndRender);
  modeFilter?.addEventListener('change', applyFiltersAndRender);

  // Pagination Events
  btnPrevPage?.addEventListener('click', () => {
    if (currentPage > 1) {
      fetchBackendPage(currentPage - 1);
    }
  });

  btnNextPage?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      fetchBackendPage(currentPage + 1);
    }
  });

  // Comparator Selector Events
  selectRunA?.addEventListener('change', () => updateComparison(getActiveRunsList()));
  selectRunB?.addEventListener('change', () => updateComparison(getActiveRunsList()));

  // Open in Results Dashboard
  btnOpenResult?.addEventListener('click', () => {
    const selectedId = selectRunA.value;
    const allAvailable = [...backendRuns, ...localRuns];
    const run = allAvailable.find(h => String(h.id) === String(selectedId));
    if (run && run.result) {
      window.appState.saveResult(run.result);
      window.safeStorage.setItem('unseen_results_count', '0');
      window.location.href = 'result.html';
    } else {
      window.showInfoBox({
        type: 'notice',
        title: 'NO RUN SELECTED',
        message: 'Data not available yet. Please select a valid run to inspect.',
        duration: 3500
      });
    }
  });

  // Fetch paginated records from /api/results/page/:pageno
  async function fetchBackendPage(pageNo) {
    if (historyListEl) {
      historyListEl.innerHTML = `
        <div style="padding: 30px 16px; text-align: center; color: #475569; font-weight: 700;">
          <div style="font-size: 20px; margin-bottom: 8px;">⏳</div>
          <div>Loading records from backend...</div>
        </div>
      `;
    }

    try {
      const res = await fetch(`/api/results/page/${pageNo}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      currentPage = pageNo;

      // Parse Total pages from message: "Total pages: X"
      const match = (json.message || '').match(/Total pages:\s*(\d+)/i);
      totalPages = match ? parseInt(match[1], 10) : 1;

      // Normalize items from backend format
      const rawList = Array.isArray(json.data) ? json.data : [];
      backendRuns = rawList.map((item, idx) => normalizeBackendRecord(item, pageNo, idx));
      backendFailed = false;
      applyFiltersAndRender();
    } catch (err) {
      console.warn('Backend fetch failed, falling back to local history:', err);
      backendFailed = true;
      backendRuns = [];
      if (currentSource === 'backend') {
        renderBackendError();
      }
    }
  }

  // Fallback / Load from safeStorage (local runs)
  function loadLocalHistory() {
    const historyStr = window.safeStorage.getItem('test_runs_history') || '[]';
    try {
      const parsed = JSON.parse(historyStr);
      localRuns = parsed.map((item, idx) => ({
        id: item.id || `local_${idx}`,
        source: 'local',
        testname: item.mode || 'Local Test',
        timestamp: item.timestamp || new Date().toISOString(),
        success: item.result?.metrics?.summary?.totalRequestsFailed === 0 || item.result?.status === 200,
        message: item.result?.message || `Local ${item.mode || ''} Execution`,
        mode: (item.mode || 'CONCURRENCY').toUpperCase(),
        metrics: item.result?.metrics || null,
        result: item.result || item
      }));
    } catch (e) {
      localRuns = [];
    }
  }

  // Normalizer: transforms backend history record to unified format
  function normalizeBackendRecord(item, pageNo, index) {
    let mode = 'CONCURRENCY';
    const rawName = (item.testname || '').toLowerCase();
    if (rawName.includes('fuzzy')) mode = 'FUZZY';
    else if (rawName.includes('sequence')) mode = 'SEQUENCE';
    else if (rawName.includes('concurrency')) mode = 'CONCURRENCY';
    else if (item.metrics?.cycles) mode = 'CONCURRENCY';
    else if (item.data && (item.data["0"] !== undefined || Array.isArray(item.data?.finalresult))) mode = 'SEQUENCE';

    const isSuccess = item.success === true || item.success === 'PASS';
    const recordId = `backend_p${pageNo}_${index + 1}`;

    return {
      id: recordId,
      source: 'backend',
      testname: item.testname || `Record #${(pageNo - 1) * 5 + index + 1}`,
      timestamp: item.timestamp || new Date().toISOString(),
      success: isSuccess,
      message: item.message || '',
      mode: mode,
      metrics: item.metrics || null,
      result: {
        status: isSuccess ? 200 : 500,
        message: item.message,
        metrics: item.metrics,
        data: item.data
      }
    };
  }

  function getActiveRunsList() {
    return currentSource === 'backend' ? backendRuns : localRuns;
  }

  // Apply Search, Status, Mode filters
  function applyFiltersAndRender() {
    const all = getActiveRunsList();
    const query = (searchInput?.value || '').trim().toLowerCase();
    const statusVal = statusFilter?.value || 'all';
    const modeVal = modeFilter?.value || 'all';

    const filtered = all.filter(run => {
      // Status filter
      if (statusVal === 'success' && !run.success) return false;
      if (statusVal === 'failure' && run.success) return false;

      // Mode filter
      if (modeVal !== 'all' && run.mode !== modeVal) return false;

      // Text search filter
      if (query) {
        const matchesName = (run.testname || '').toLowerCase().includes(query);
        const matchesMsg = (run.message || '').toLowerCase().includes(query);
        const matchesMode = (run.mode || '').toLowerCase().includes(query);
        const matchesId = String(run.id || '').toLowerCase().includes(query);
        if (!matchesName && !matchesMsg && !matchesMode && !matchesId) return false;
      }

      return true;
    });

    renderHistoryList(filtered);
    populateSelectors(all);
    updateComparison(all);
    updatePaginationUI();
  }

  function updatePaginationUI() {
    if (!paginationBar) return;
    if (currentSource === 'backend' && !backendFailed) {
      paginationBar.style.display = 'flex';
      if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages || 1}`;
      if (btnPrevPage) btnPrevPage.disabled = currentPage <= 1;
      if (btnNextPage) btnNextPage.disabled = currentPage >= totalPages;
    } else {
      paginationBar.style.display = 'none';
    }
  }

  function renderBackendError() {
    if (!historyListEl) return;
    historyListEl.innerHTML = `
      <div style="padding: 30px 16px; text-align: center; color: #475569; font-weight: 700;">
        <div style="font-size: 24px; margin-bottom: 8px;">🔌</div>
        <div>Backend records unreachable</div>
        <div style="font-size: 11.5px; opacity: 0.8; font-weight: 500; margin-top: 6px;">
          Unable to fetch from /api/results/page/1. You can switch to the Local Runs tab to view client executions.
        </div>
      </div>
    `;
    if (paginationBar) paginationBar.style.display = 'none';
  }

  function renderHistoryList(runs) {
    if (!historyListEl) return;
    historyListEl.innerHTML = '';

    if (!runs || runs.length === 0) {
      historyListEl.innerHTML = `
        <div style="padding: 30px 16px; text-align: center; color: #475569; font-weight: 700;">
          <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
          <div>No matching records found</div>
          <div style="font-size: 11.5px; opacity: 0.8; font-weight: 500; margin-top: 6px;">
            ${searchInput?.value ? 'Try adjusting your search query or filters.' : 'No historical test records found.'}
          </div>
        </div>
      `;
      return;
    }

    runs.forEach((r) => {
      const card = document.createElement('div');
      card.className = 'history-entry-card';

      const metrics = r.metrics || r.result?.metrics || {};
      const latency = metrics.latency || {};
      const summary = metrics.summary || {};
      const total = latency.count ?? summary.totalRequestsSent ?? (r.result?.data ? 1 : 0);
      const failed = summary.totalRequestsFailed ?? (r.success ? 0 : 1);
      const successPct = summary.successRate != null
        ? summary.successRate
        : (r.success ? '100.0' : '0.0');
      const avgSpeed = latency.averageMs != null
        ? latency.averageMs
        : (latency.average != null ? latency.average : (r.metrics ? 0 : 'N/A'));

      let dateStr = 'N/A';
      try {
        dateStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (e) {}

      card.innerHTML = `
        <div class="history-entry-top">
          <span class="history-entry-mode ${r.mode}">${r.mode}</span>
          <span style="font-size: 11px; font-weight: 700; color: ${r.success ? '#16A34A' : '#DC2626'}">
            ${r.success ? 'PASS' : 'FAIL'}
          </span>
          <span class="history-entry-time">${dateStr}</span>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: #1E293B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${r.testname || r.message || 'Execution'}
        </div>
        <div class="history-entry-metrics">
          <span><b>${total}</b> Reqs</span> &bull; 
          <span style="color: ${r.success ? '#16A34A' : '#DC2626'}"><b>${successPct}%</b></span> &bull;
          <span><b>${avgSpeed}</b>${typeof avgSpeed === 'number' ? 'ms' : ''}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        if (selectRunA) {
          selectRunA.value = r.id;
          updateComparison(getActiveRunsList());
        }
      });

      historyListEl.appendChild(card);
    });
  }

  function populateSelectors(runs) {
    if (!selectRunA || !selectRunB) return;
    const prevA = selectRunA.value;
    const prevB = selectRunB.value;

    selectRunA.innerHTML = '';
    selectRunB.innerHTML = '';

    if (!runs || runs.length === 0) {
      const optEmpty = document.createElement('option');
      optEmpty.textContent = 'No records available';
      optEmpty.disabled = true;
      selectRunA.appendChild(optEmpty);

      const optEmptyB = document.createElement('option');
      optEmptyB.textContent = 'No records available';
      optEmptyB.disabled = true;
      selectRunB.appendChild(optEmptyB);
      return;
    }

    runs.forEach((r, idx) => {
      let dateStr = '';
      try {
        dateStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {}
      const optText = `${r.testname || 'Run'} (${r.mode} - ${dateStr || '#' + (idx + 1)})`;

      const optA = document.createElement('option');
      optA.value = r.id;
      optA.textContent = optText;
      selectRunA.appendChild(optA);

      const optB = document.createElement('option');
      optB.value = r.id;
      optB.textContent = optText;
      selectRunB.appendChild(optB);
    });

    if (runs.some(r => String(r.id) === String(prevA))) {
      selectRunA.value = prevA;
    } else {
      selectRunA.selectedIndex = 0;
    }

    if (runs.some(r => String(r.id) === String(prevB))) {
      selectRunB.value = prevB;
    } else if (runs.length >= 2) {
      selectRunB.selectedIndex = 1;
    } else {
      selectRunB.selectedIndex = 0;
    }
  }

  function updateComparison(runs) {
    if (!selectRunA || !selectRunB) return;
    const idA = selectRunA.value;
    const idB = selectRunB.value;

    const deltaLatEl = document.getElementById('deltaLatency');
    const deltaSuccEl = document.getElementById('deltaSuccess');
    const deltaReqEl = document.getElementById('deltaRequests');
    const deltaErrEl = document.getElementById('deltaErrors');

    if (!runs || runs.length < 2) {
      if (deltaLatEl) deltaLatEl.innerHTML = '<span class="delta-value neutral">-</span>';
      if (deltaSuccEl) deltaSuccEl.innerHTML = '<span class="delta-value neutral">-</span>';
      if (deltaReqEl) deltaReqEl.innerHTML = '<span class="delta-value neutral">-</span>';
      if (deltaErrEl) deltaErrEl.innerHTML = '<span class="delta-value neutral">-</span>';
      return;
    }

    const runA = runs.find(r => String(r.id) === String(idA));
    const runB = runs.find(r => String(r.id) === String(idB));

    if (!runA || !runB) return;

    const latA = runA.result?.metrics?.latency?.averageMs ?? runA.result?.metrics?.latency?.average ?? 0;
    const latB = runB.result?.metrics?.latency?.averageMs ?? runB.result?.metrics?.latency?.average ?? 0;
    const deltaLat = Number((latA - latB).toFixed(2));

    const sumA = runA.result?.metrics?.summary || {};
    const sumB = runB.result?.metrics?.summary || {};
    const totA = runA.result?.metrics?.latency?.count ?? sumA.totalRequestsSent ?? (runA.result?.data ? 1 : 0);
    const totB = runB.result?.metrics?.latency?.count ?? sumB.totalRequestsSent ?? (runB.result?.data ? 1 : 0);
    const failA = sumA.totalRequestsFailed ?? (runA.success ? 0 : 1);
    const failB = sumB.totalRequestsFailed ?? (runB.success ? 0 : 1);

    const succPctA = totA > 0 ? ((totA - failA) / totA) * 100 : (runA.success ? 100 : 0);
    const succPctB = totB > 0 ? ((totB - failB) / totB) * 100 : (runB.success ? 100 : 0);
    const deltaSucc = Number((succPctA - succPctB).toFixed(1));

    const deltaReq = totA - totB;
    const deltaFail = failA - failB;

    if (deltaLatEl) deltaLatEl.innerHTML = formatDelta(deltaLat, 'ms', true);
    if (deltaSuccEl) deltaSuccEl.innerHTML = formatDelta(deltaSucc, '%', false);
    if (deltaReqEl) deltaReqEl.innerHTML = formatDelta(deltaReq, ' reqs', false);
    if (deltaErrEl) deltaErrEl.innerHTML = formatDelta(deltaFail, ' errors', true);
  }

  function formatDelta(val, unit, lowerIsBetter) {
    const num = Number(val);
    if (isNaN(num) || num === 0) return `<span class="delta-value neutral">0${unit}</span>`;
    const sign = num > 0 ? `+${num}` : `${num}`;
    const isGood = lowerIsBetter ? num < 0 : num > 0;
    const cls = isGood ? 'positive' : 'negative';
    return `<span class="delta-value ${cls}">${sign}${unit}</span>`;
  }
});
