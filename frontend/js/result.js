/**
 * ==========================================================================
 * RESULTS & TELEMETRY CONTROLLER (Pure Vanilla ES6)
 * Full refactor: Two-way sidebar interactivity, 4 rich visualization views,
 * deep-linking, SLA profiler, cycle & pipeline explorers, and diagnostics drawer.
 * (Zero emojis, persistent notice state with 'Info' toggle, fully scalable)
 * ==========================================================================
 */

let currentResultData = null;
let currentEngine = 'CONCURRENCY';
let activeMetricTab = 'verdict'; // 'verdict' | 'latency' | 'telemetry' | 'diagnostics'

// Stateful options for deep-linking and filtering
const visualizerState = {
  diagnosticsFilter: 'all', // 'all' | 'failed' | '2xx' | '4xx/5xx' | specific status like '200'
  diagnosticsSearch: '',
  selectedCycleIndex: null, // null = all cycles, number = index
  selectedStageIndex: 0,    // index of stage in Sequence
  selectedRequestIndex: null, // index in data.result for drawer inspection
  slaThreshold: 300,        // ms target
  selectedLatencyPoint: 'p99' // active percentile milestone
};

window.visualizerState = visualizerState;
window.getActiveMetricTab = () => activeMetricTab;

const METRIC_METADATA = {
  verdict: {
    title: "EXECUTIVE VERDICT",
    text: "High-level service health assessment: immediate pass/fail ratio, tail divergence (p99/p50), bandwidth consumption, and quick automated recommendations."
  },
  latency: {
    title: "LATENCY PROFILER",
    text: "Microsecond-accurate percentile curve (Min to Max) with configurable SLA threshold overlay. Highlights tail latency outliers that degrade real user experience."
  },
  telemetry: {
    title: "ENGINE TELEMETRY",
    text: "Internal engine breakdown: incremental Concurrency VU ramp-up cycles with saturation detection, Sequence multi-stage variable pipelines, or Fuzzy parameter coverage."
  },
  diagnostics: {
    title: "DIAGNOSTICS & LOGS",
    text: "Deep-dive request inspector: filterable log table with HTTP status triage, collapsible request/response headers and payloads, and one-click JSON clipboard export."
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Clear unviewed badge
  window.safeStorage?.setItem('unseen_results_count', '0');

  // Resolve result data (storage or fallback history)
  const currentMode = window.appState ? window.appState.getMode() : 'CONCURRENCY';
  const resultData = await resolveResultData(currentMode);

  // Detect Engine Type
  const engine = resultData ? detectEngine(resultData.metrics, resultData.data) : currentMode;

  // Initialize Top Connected Node Chain
  initNodeChain(currentMode);

  // Initialize Available Metrics Navigation & Dynamic Visualizer
  initResultsVisualizer(resultData, engine);
});

/* ==========================================================================
   DATA RESOLUTION & ENGINE DETECTION
   ========================================================================== */
async function resolveResultData(currentMode) {
  const targetMode = String(currentMode || 'CONCURRENCY').toUpperCase();

  // 1. Check last_run_result if it matches targetMode
  try {
    const lastResult = window.appState ? window.appState.getLastResult() : null;
    if (lastResult && lastResult.metrics) {
      const modeMatch = lastResult.mode && String(lastResult.mode).toUpperCase() === targetMode;
      const engineMatch = detectEngine(lastResult.metrics, lastResult.data, targetMode) === targetMode;
      if (modeMatch || engineMatch) {
        return lastResult;
      }
    }
  } catch (e) {}

  // 2. Check safeStorage history for an entry matching targetMode
  try {
    const historyStr = window.safeStorage?.getItem('test_runs_history') || '[]';
    const history = JSON.parse(historyStr);
    const matched = history.find(h => {
      const itemMode = String(h.mode || '').toUpperCase();
      if (itemMode === targetMode) return true;
      if (h.result) {
        return detectEngine(h.result.metrics, h.result.data, itemMode) === targetMode;
      }
      return false;
    });
    if (matched && matched.result) {
      matched.result.mode = targetMode;
      window.appState?.saveResult(matched.result);
      return matched.result;
    }
  } catch (e) {
    console.warn('Error reading test_runs_history:', e);
  }

  // 3. Attempt to fetch latest matching record from backend history (/api/results/0)
  try {
    const res = await fetch('/api/results/0');
    if (res.ok) {
      const allHistory = await res.json();
      if (Array.isArray(allHistory) && allHistory.length > 0) {
        const matchedItem = [...allHistory].reverse().find(item => {
          const rawName = String(item.testname || '').toLowerCase();
          if (targetMode === 'CONCURRENCY') return rawName.includes('concurrency') && item.metrics;
          if (targetMode === 'SEQUENCE') return rawName.includes('sequence') && item.metrics;
          if (targetMode === 'FUZZY') return (rawName.includes('api') || rawName.includes('fuzzy')) && item.metrics;
          return detectEngine(item.metrics, item.data, targetMode) === targetMode;
        });

        if (matchedItem) {
          const normalized = {
            status: (matchedItem.success === true || matchedItem.success === 'PASS') ? 200 : 500,
            message: matchedItem.message,
            metrics: matchedItem.metrics,
            data: matchedItem.data,
            mode: targetMode
          };
          window.appState?.saveResult(normalized);
          return normalized;
        }
      }
    }
  } catch (e) {
    // Backend fetch failed or running in file:// sandbox
  }

  // 4. Fallback to /api/results/page/1
  try {
    const res = await fetch('/api/results/page/1');
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        const matchedItem = [...json.data].reverse().find(item => {
          const rawName = String(item.testname || '').toLowerCase();
          if (targetMode === 'CONCURRENCY') return rawName.includes('concurrency') && item.metrics;
          if (targetMode === 'SEQUENCE') return rawName.includes('sequence') && item.metrics;
          if (targetMode === 'FUZZY') return (rawName.includes('api') || rawName.includes('fuzzy')) && item.metrics;
          return false;
        });

        if (matchedItem) {
          const normalized = {
            status: (matchedItem.success === true || matchedItem.success === 'PASS') ? 200 : 500,
            message: matchedItem.message,
            metrics: matchedItem.metrics,
            data: matchedItem.data,
            mode: targetMode
          };
          window.appState?.saveResult(normalized);
          return normalized;
        }
      }
    }
  } catch (e) {}

  // 5. Fallback to mode-specific rich dataset
  const fallback = generateSampleResult(targetMode);
  fallback.mode = targetMode;
  window.appState?.saveResult(fallback);
  return fallback;
}

function generateSampleResult(mode) {
  const norm = String(mode || 'CONCURRENCY').toUpperCase();
  if (norm === 'SEQUENCE') return generateSequenceSample();
  if (norm === 'FUZZY' || norm === 'APITESTS') return generateFuzzySample();
  return generateConcurrencySample();
}

function generateConcurrencySample() {
  const result = [];
  const diagnostics = [];
  const cycles = [
    { requestcyclenum: 1, batchsize: 10, currentConcurrency: 10, totalrequestssent: 10, successfulrequests: 10, totalrequestfailed: 0 },
    { requestcyclenum: 2, batchsize: 15, currentConcurrency: 15, totalrequestssent: 15, successfulrequests: 15, totalrequestfailed: 0 },
    { requestcyclenum: 3, batchsize: 15, currentConcurrency: 20, totalrequestssent: 15, successfulrequests: 14, totalrequestfailed: 1 },
    { requestcyclenum: 4, batchsize: 10, currentConcurrency: 25, totalrequestssent: 10, successfulrequests: 9, totalrequestfailed: 1 }
  ];

  let reqIndex = 1;
  cycles.forEach(c => {
    for (let i = 0; i < c.totalrequestssent; i++) {
      const isFail = (c.requestcyclenum === 3 && i === 14) || (c.requestcyclenum === 4 && i === 9);
      const status = isFail ? (c.requestcyclenum === 3 ? 429 : 504) : 200;
      const reqObj = {
        status: status,
        method: "POST",
        cycleNum: c.requestcyclenum,
        request: {
          link: "http://127.0.0.1:3000/api/concurrency",
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Concurrency-VU": String(c.currentConcurrency) },
          data: { requestId: reqIndex, concurrencyBatch: c.requestcyclenum, payload: { value: reqIndex * 10 } }
        },
        data: isFail 
          ? { error: status === 429 ? "Rate Limit Exceeded: 20 VUs peak saturated" : "Gateway Timeout: upstream service slow at 25 VUs" }
          : { message: "Request received", requestId: reqIndex, latencyMs: 24 + (c.currentConcurrency * 2) },
        headers: { "content-type": "application/json; charset=utf-8", "x-request-id": `vu-req-${reqIndex}` }
      };
      result.push(reqObj);
      if (isFail) {
        diagnostics.push({
          status: status,
          endpoint: "/api/concurrency",
          cycle: c.requestcyclenum,
          data: reqObj.data
        });
      }
      reqIndex++;
    }
  });

  return {
    status: 200,
    message: "Concurrency telemetry execution completed successfully",
    metrics: {
      latency: {
        count: 50,
        average: 42000,
        averageMs: 42.0,
        min: 16,
        max: 380,
        p50: 36,
        p75: 56,
        p90: 98,
        p95: 180,
        p99: 151
      },
      summary: {
        totalRequestsSent: 50,
        successfulRequests: 48,
        totalRequestsFailed: 2,
        successRate: 96.0,
        failureRate: 4.0,
        statusCodes: { "200": 48, "429": 1, "504": 1 }
      },
      dataprocessed: {
        sent: 19400,
        received: 71200
      },
      cycles: cycles
    },
    data: {
      totalrequestssent: 50,
      concurrentrequest: 25,
      successfulrequests: 48,
      totalrequestfailed: 2,
      result: result,
      diagnostics: diagnostics
    }
  };
}

function generateSequenceSample() {
  const steps = [
    {
      request: {
        link: "http://127.0.0.1:3000/tests/step1",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: { action: "login", username: "admin", client_id: "client_99" },
        expectedstatus: 200
      },
      response: {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "x-request-id": "seq-step-1" },
        data: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", user: { id: 101, name: "Admin User", role: "admin" } }
      },
      conditionresult: [1, { message: "Token and User ID resolved successfully" }, 200]
    },
    {
      request: {
        link: "http://127.0.0.1:3000/tests/step2",
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer {{response.data.token}}" },
        data: { userId: "{{response.data.user.id}}", fetchDetails: true },
        expectedstatus: 200
      },
      response: {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "x-request-id": "seq-step-2" },
        data: { profile: { id: 101, plan: "Enterprise", rateLimit: 500 }, activeSession: "sess_441" }
      },
      conditionresult: [1, { message: "Session verified and profile fetched" }, 200]
    },
    {
      request: {
        link: "http://127.0.0.1:3000/tests/step3",
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer {{response.data.token}}", "X-Session": "{{response.data.activeSession}}" },
        data: { accountId: 101, action: "execute_pipeline", verify: true },
        expectedstatus: 200
      },
      response: {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "x-request-id": "seq-step-3" },
        data: { executionId: "exec_59012", status: "completed", timestamp: "2026-10-21T09:00:00Z" }
      },
      conditionresult: [1, { message: "Pipeline execution completed with status 200" }, 200]
    }
  ];

  const resultItems = steps.map((s, idx) => ({
    status: s.response.status,
    url: s.request.link,
    method: s.request.method,
    stageNum: idx + 1,
    request: s.request,
    data: s.response.data,
    headers: s.response.headers
  }));

  return {
    status: 200,
    message: "Sequence test pipeline completed successfully",
    metrics: {
      latency: {
        count: 3,
        average: 38000,
        averageMs: 38.0,
        min: 22,
        max: 64,
        p50: 34,
        p75: 48,
        p90: 60,
        p95: 62,
        p99: 64
      },
      summary: {
        totalRequestsSent: 3,
        successfulRequests: 3,
        totalRequestsFailed: 0,
        successRate: 100,
        failureRate: 0,
        statusCodes: { "200": 3 }
      },
      dataprocessed: {
        sent: 3200,
        received: 8400
      },
      cycles: []
    },
    data: {
      "0": steps[0],
      "1": steps[1],
      "2": steps[2],
      result: resultItems,
      diagnostics: []
    }
  };
}

function generateFuzzySample() {
  const result = [
    { status: 200, method: "POST", url: "/api/validate/username", data: { valid: true, id: "fuzz_1" }, headers: { "content-type": "application/json" }, request: { link: "/api/validate/username", method: "POST", headers: { "Content-Type": "application/json" }, data: { username: "alice", age: 25, email: "user@test.com" } } },
    { status: 200, method: "POST", url: "/api/validate/username", data: { valid: true, id: "fuzz_2" }, headers: { "content-type": "application/json" }, request: { link: "/api/validate/username", method: "POST", headers: { "Content-Type": "application/json" }, data: { username: "bob_123", age: 18, email: "test+tag@domain.co" } } },
    { status: 400, method: "POST", url: "/api/validate/email", data: { error: "Validation Failed: 'email' format invalid" }, headers: { "content-type": "application/json" }, request: { link: "/api/validate/email", method: "POST", headers: { "Content-Type": "application/json" }, data: { username: "alice", age: 25, email: "invalid-email" } } },
    { status: 422, method: "POST", url: "/api/validate/age", data: { error: "Unprocessable Entity: 'age' must be a positive integer" }, headers: { "content-type": "application/json" }, request: { link: "/api/validate/age", method: "POST", headers: { "Content-Type": "application/json" }, data: { username: "alice", age: -1, email: "user@test.com" } } },
    { status: 200, method: "POST", url: "/api/validate/username", data: { valid: true, id: "fuzz_5" }, headers: { "content-type": "application/json" }, request: { link: "/api/validate/username", method: "POST", headers: { "Content-Type": "application/json" }, data: { username: "/*/", age: 30, email: "user@test.com" } } }
  ];

  const diagnostics = [
    { status: 400, endpoint: "/api/validate/email", data: { error: "Validation Failed: 'email' format invalid", rejectedInput: { email: "invalid-email" } } },
    { status: 422, endpoint: "/api/validate/age", data: { error: "Unprocessable Entity: 'age' cannot be negative (-1)", rejectedInput: { age: -1 } } }
  ];

  return {
    status: 200,
    message: "Fuzzy validation test completed",
    metrics: {
      latency: {
        count: 5,
        average: 28000,
        averageMs: 28.0,
        min: 12,
        max: 85,
        p50: 24,
        p75: 35,
        p90: 55,
        p95: 70,
        p99: 85
      },
      summary: {
        totalRequestsSent: 5,
        successfulRequests: 3,
        totalRequestsFailed: 2,
        successRate: 60.0,
        failureRate: 40.0,
        statusCodes: { "200": 3, "400": 1, "422": 1 }
      },
      dataprocessed: {
        sent: 4800,
        received: 9200
      },
      cycles: []
    },
    data: {
      username: { type: "string", values: ["alice", "bob_123", "", "/*/", "<script>alert(1)</script>"] },
      age: { type: "int", values: [18, 25, 0, -1, 999999] },
      email: { type: "string", values: ["user@test.com", "invalid-email", "test+tag@domain.co"] },
      salary: { type: "float", values: [50000.0, 75000.5, -500.0, 0.0] },
      result: result,
      diagnostics: diagnostics
    }
  };
}

function detectEngine(metrics, data, fallbackMode = 'CONCURRENCY') {
  if (data?.mode) return String(data.mode).toUpperCase();
  if (Array.isArray(metrics?.cycles) && metrics.cycles.length > 0) {
    return "CONCURRENCY";
  }
  if (data && (data["0"] !== undefined || data["1"] !== undefined || Array.isArray(data.finalresult))) {
    return "SEQUENCE";
  }
  const paramKeys = Object.keys(data || {}).filter(k => typeof data[k] === 'object' && data[k] !== null && k !== 'result' && k !== 'diagnostics' && isNaN(Number(k)));
  if (paramKeys.length > 0) {
    return "FUZZY";
  }
  return String(fallbackMode).toUpperCase();
}

/* ==========================================================================
   TOP CONNECTED NODE CHAIN
   ========================================================================== */
function initNodeChain(activeMode) {
  const nodes = document.querySelectorAll('.node-pill-group');
  nodes.forEach(n => {
    if (n.dataset.mode === activeMode) {
      n.classList.add('active');
    } else {
      n.classList.remove('active');
    }

    n.addEventListener('click', async () => {
      const mode = n.dataset.mode;
      window.appState?.setMode(mode);

      // Resolve result specifically for this mode
      const resultData = await resolveResultData(mode);
      window.appState?.saveResult(resultData);
      window.safeStorage?.setItem('unseen_results_count', '0');
      window.location.reload();
    });
  });
}

/* ==========================================================================
   INITIALIZATION & MAIN RENDERING DISPATCHER
   ========================================================================== */
function initResultsVisualizer(resultData, engine) {
  currentResultData = resultData;
  currentEngine = engine;

  const noticeClose = document.getElementById('btnDismissMetricNotice');
  const noticeCard = document.getElementById('metricNoticeCard');
  const btnToggleInfo = document.getElementById('btnToggleMetricNotice');

  // Dismiss button handler (persists removal)
  if (noticeClose && noticeCard) {
    noticeClose.addEventListener('click', (e) => {
      e.stopPropagation();
      noticeCard.classList.add('hidden');
      window.safeStorage?.setItem('metric_notice_dismissed', 'true');
      if (btnToggleInfo) btnToggleInfo.classList.remove('active');
    });
  }

  // "Info" toggle button handler
  if (btnToggleInfo && noticeCard) {
    btnToggleInfo.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = noticeCard.classList.contains('hidden');
      if (isHidden) {
        noticeCard.classList.remove('hidden');
        window.safeStorage?.setItem('metric_notice_dismissed', 'false');
        btnToggleInfo.classList.add('active');
        updateNotice();
      } else {
        noticeCard.classList.add('hidden');
        window.safeStorage?.setItem('metric_notice_dismissed', 'true');
        btnToggleInfo.classList.remove('active');
      }
    });
  }

  const metricButtons = document.querySelectorAll('.btn-metric-item');
  metricButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activeMetricTab = btn.dataset.metric;
      renderActiveMetric();
    });
  });

  renderActiveMetric();
}

function updateNotice() {
  const noticeCard = document.getElementById('metricNoticeCard');
  const noticeTitle = document.getElementById('metricNoticeTitle');
  const noticeBody = document.getElementById('metricNoticeBody');
  const btnToggleInfo = document.getElementById('btnToggleMetricNotice');
  if (!noticeCard || !noticeBody) return;

  const isDismissed = window.safeStorage?.getItem('metric_notice_dismissed') === 'true';
  if (isDismissed) {
    noticeCard.classList.add('hidden');
    if (btnToggleInfo) btnToggleInfo.classList.remove('active');
  } else {
    noticeCard.classList.remove('hidden');
    if (btnToggleInfo) btnToggleInfo.classList.add('active');
  }

  const meta = METRIC_METADATA[activeMetricTab];
  if (meta) {
    if (noticeTitle) noticeTitle.textContent = meta.title;
    noticeBody.textContent = meta.text;
  }
}

function renderActiveMetric() {
  const metricButtons = document.querySelectorAll('.btn-metric-item');
  metricButtons.forEach(btn => {
    if (btn.dataset.metric === activeMetricTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateNotice();
  updateSidebarBadges(currentResultData, currentEngine);

  const container = document.getElementById('resultVisualizerBody');
  if (!container) return;

  if (!currentResultData || !currentResultData.metrics) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-badge">NO RESULTS</div>
        <div class="empty-state-title">Data not available yet</div>
        <div class="empty-state-message">
          No test execution results are available for the selected mode (${escapeHtml(currentEngine)}).
          Go to the Homepage and click <b>RUN</b> to execute the test against the backend.
        </div>
        <a href="index.html" class="empty-state-btn">GO TO HOMEPAGE</a>
      </div>
    `;
    return;
  }

  if (activeMetricTab === 'verdict') {
    renderVerdictView(container, currentResultData, currentEngine);
  } else if (activeMetricTab === 'latency') {
    renderLatencyView(container, currentResultData);
  } else if (activeMetricTab === 'telemetry') {
    renderTelemetryView(container, currentResultData, currentEngine);
  } else if (activeMetricTab === 'diagnostics') {
    renderDiagnosticsView(container, currentResultData, currentEngine);
  }
}

/* ==========================================================================
   GLOBAL TWO-WAY INTERACTIVE ACTIONS
   ========================================================================== */
window.switchMetricTab = function(tabName, options = {}) {
  if (!['verdict', 'latency', 'telemetry', 'diagnostics'].includes(tabName)) return;
  activeMetricTab = tabName;

  if (options.diagnosticsFilter !== undefined) {
    visualizerState.diagnosticsFilter = options.diagnosticsFilter;
  }
  if (options.diagnosticsSearch !== undefined) {
    visualizerState.diagnosticsSearch = options.diagnosticsSearch;
  }
  if (options.selectedCycleIndex !== undefined) {
    visualizerState.selectedCycleIndex = options.selectedCycleIndex;
  }
  if (options.selectedStageIndex !== undefined) {
    visualizerState.selectedStageIndex = options.selectedStageIndex;
  }
  if (options.selectedRequestIndex !== undefined) {
    visualizerState.selectedRequestIndex = options.selectedRequestIndex;
  }

  renderActiveMetric();
};

window.setSlaTarget = function(newTarget) {
  visualizerState.slaThreshold = newTarget;
  renderActiveMetric();
};

window.selectLatencyMilestone = function(mKey) {
  visualizerState.selectedLatencyPoint = mKey;
  renderActiveMetric();
};

window.toggleCycleSelection = function(idx) {
  visualizerState.selectedCycleIndex = (visualizerState.selectedCycleIndex === idx) ? null : idx;
  renderActiveMetric();
};

window.selectSequenceStage = function(idx) {
  visualizerState.selectedStageIndex = idx;
  renderActiveMetric();
};

window.setDiagnosticsFilter = function(filter) {
  visualizerState.diagnosticsFilter = filter;
  renderActiveMetric();
};

window.clearDiagnosticsSearch = function() {
  visualizerState.diagnosticsSearch = '';
  renderActiveMetric();
};

window.toggleRequestInspection = function(idx) {
  visualizerState.selectedRequestIndex = (visualizerState.selectedRequestIndex === idx) ? null : idx;
  renderActiveMetric();
};

window.filterDiagnosticsByCycle = function(cycleNum) {
  visualizerState.diagnosticsFilter = 'cycle:' + cycleNum;
  visualizerState.diagnosticsSearch = '';
  visualizerState.selectedRequestIndex = null;
  activeMetricTab = 'diagnostics';
  renderActiveMetric();
};

window.inspectRequestInDiagnostics = function(idx) {
  visualizerState.selectedRequestIndex = idx;
  visualizerState.diagnosticsFilter = 'all';
  visualizerState.diagnosticsSearch = '';
  activeMetricTab = 'diagnostics';
  renderActiveMetric();
  setTimeout(() => {
    document.querySelector('.inspector-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 60);
};

window.selectDiagnosticError = function(idx) {
  const reqs = getNormalizedRequests(currentResultData, currentEngine);
  let matchIdx = reqs.findIndex(r => !r.isPass || String(r.status).startsWith('4') || String(r.status).startsWith('5'));
  if (matchIdx === -1 && idx < reqs.length) matchIdx = idx;
  if (matchIdx !== -1) {
    visualizerState.selectedRequestIndex = matchIdx;
    visualizerState.diagnosticsFilter = 'failed';
    activeMetricTab = 'diagnostics';
    renderActiveMetric();
    setTimeout(() => {
      document.querySelector('.inspector-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }
};

/* ==========================================================================
   UPDATE RIGHT SIDEBAR BADGES & SUBTITLES
   ========================================================================== */
function updateSidebarBadges(resultData, engine) {
  if (!resultData || !resultData.metrics) return;
  const metrics = resultData.metrics || {};
  const summary = metrics.summary || {};
  const latency = metrics.latency || {};
  const total = latency.count ?? summary.totalRequestsSent ?? 0;
  const failed = summary.totalRequestsFailed ?? 0;
  const avgMs = latency.averageMs != null ? latency.averageMs : (latency.average != null ? (latency.average / 1000).toFixed(2) : '0');
  const p50 = latency.p50 ?? 0;
  const p99 = latency.p99 ?? 0;

  // 1. Verdict
  const subVerdict = document.getElementById('subVerdict');
  if (subVerdict && total > 0) {
    const successPct = summary.successRate ?? (((total - failed) / total) * 100).toFixed(1);
    subVerdict.textContent = `${successPct}% Pass • ${avgMs} ms`;
  }

  // 2. Latency
  const subLatency = document.getElementById('subLatency');
  if (subLatency) {
    subLatency.textContent = `p50: ${p50}ms • p99: ${p99}ms`;
  }

  // 3. Telemetry
  const subTelemetry = document.getElementById('subTelemetry');
  if (subTelemetry) {
    if (engine === 'CONCURRENCY') {
      const cyclesCount = Array.isArray(metrics.cycles) ? metrics.cycles.length : 0;
      const maxVu = Math.max(...(metrics.cycles || []).map(c => c.currentConcurrency || 0), 1);
      subTelemetry.textContent = `${cyclesCount} Cycles • Max ${maxVu} VUs`;
    } else if (engine === 'SEQUENCE') {
      const stageCount = Object.keys(resultData.data || {}).filter(k => !isNaN(Number(k))).length || (Array.isArray(resultData.data?.result) ? resultData.data.result.length : 0);
      subTelemetry.textContent = `${stageCount} Pipeline Stages`;
    } else {
      const paramCount = Object.keys(resultData.data || {}).filter(k => typeof resultData.data[k] === 'object' && k !== 'result' && k !== 'diagnostics').length;
      subTelemetry.textContent = `${paramCount} Evaluated Parameters`;
    }
  }

  // 4. Diagnostics
  const subDiagnostics = document.getElementById('subDiagnostics');
  if (subDiagnostics) {
    const diagCount = Array.isArray(resultData.data?.diagnostics) ? resultData.data.diagnostics.length : 0;
    const errCount = failed || diagCount;
    subDiagnostics.textContent = `${errCount} Errors • ${total} Requests`;
  }
}

/* ==========================================================================
   NORMALIZED REQUESTS GENERATOR (CROSS-ENGINE COMPATIBILITY)
   ========================================================================== */
function getNormalizedRequests(resultData, engine) {
  if (!resultData || !resultData.data) return [];
  const normEngine = String(engine || 'CONCURRENCY').toUpperCase();
  const data = resultData.data || {};
  const metrics = resultData.metrics || {};

  // 1. SEQUENCE ENGINE
  if (normEngine === 'SEQUENCE') {
    const stageKeys = Object.keys(data).filter(k => !isNaN(Number(k))).sort((a, b) => Number(a) - Number(b));
    if (stageKeys.length > 0) {
      return stageKeys.map((k, idx) => {
        const stage = data[k] || {};
        const req = stage.request || {};
        const res = stage.response || {};
        const status = res.status || req.expectedstatus || 200;
        const isPass = (status >= 200 && status < 300) && (!stage.conditionresult || stage.conditionresult[0] === 1);
        const stageResult = (Array.isArray(data.result) && data.result[idx]) ? data.result[idx] : null;

        const resData = (res.data !== undefined && Object.keys(res.data).length > 0)
          ? res.data 
          : ((stageResult && stageResult.data && Object.keys(stageResult.data).length > 0) ? stageResult.data : res.data || {});

        const resHeaders = (res.headers && Object.keys(res.headers).length > 0)
          ? res.headers
          : (stageResult?.headers || {});

        return {
          index: idx,
          stageNum: idx + 1,
          url: req.link || req.endpoint || `/step${idx + 1}`,
          method: (req.method || 'POST').toUpperCase(),
          status: status,
          isPass: isPass,
          conditionresult: stage.conditionresult,
          request: {
            url: req.link || req.endpoint || `/step${idx + 1}`,
            method: (req.method || 'POST').toUpperCase(),
            headers: req.headers || {},
            data: req.data || req.bodytosend || {},
            expectedstatus: req.expectedstatus,
            condition: req.condition,
            nextdata: req.nextdata,
            nextheader: req.nextheader
          },
          data: resData,
          headers: resHeaders
        };
      });
    }

    if (Array.isArray(data.result) && data.result.length > 0) {
      return data.result.map((r, idx) => {
        const status = r.status || 200;
        const isPass = status >= 200 && status < 300;
        return {
          index: idx,
          stageNum: idx + 1,
          url: r.url || r.request?.link || `/step${idx + 1}`,
          method: (r.method || r.request?.method || 'POST').toUpperCase(),
          status: status,
          isPass: isPass,
          request: r.request || { url: `/step${idx + 1}`, method: 'POST', headers: {}, data: {} },
          data: r.data || {},
          headers: r.headers || {}
        };
      });
    }
  }

  // 2. CONCURRENCY ENGINE
  if (normEngine === 'CONCURRENCY') {
    const cycles = Array.isArray(metrics.cycles) ? metrics.cycles : [];
    const rawResults = Array.isArray(data.result) ? data.result : [];

    const cycleLookup = [];
    cycles.forEach(c => {
      const count = c.totalrequestssent || c.batchsize || 0;
      for (let i = 0; i < count; i++) {
        cycleLookup.push(c.requestcyclenum);
      }
    });

    return rawResults.map((r, idx) => {
      const cycleNum = r.cycleNum || cycleLookup[idx] || (cycles[0]?.requestcyclenum || 1);
      const status = r.status || (r.response?.status) || 200;
      const isPass = status >= 200 && status < 300;
      const method = (r.method || r.request?.method || 'POST').toUpperCase();
      const url = r.url || r.request?.link || '/api/concurrency';
      const vuCount = cycles.find(c => c.requestcyclenum === cycleNum)?.currentConcurrency || cycleNum * 5;

      return {
        index: idx,
        cycleNum: cycleNum,
        method: method,
        url: url,
        status: status,
        isPass: isPass,
        request: r.request || {
          url: url,
          method: method,
          headers: { "Content-Type": "application/json", "X-Concurrency-VU": String(vuCount) },
          data: { concurrencyBatch: cycleNum, requestIndex: idx + 1 }
        },
        data: r.data !== undefined ? r.data : (r.response?.data || {}),
        headers: r.headers || (r.response?.headers || {})
      };
    });
  }

  // 3. FUZZY / API ENGINE
  const rawResults = Array.isArray(data.result) ? data.result : [];
  if (rawResults.length > 0) {
    return rawResults.map((r, idx) => {
      const status = r.status || (r.response?.status) || 200;
      const isPass = status >= 200 && status < 300;
      const method = (r.method || r.request?.method || 'POST').toUpperCase();
      const url = r.url || r.request?.link || '/api/apitests';
      return {
        index: idx,
        method: method,
        url: url,
        status: status,
        isPass: isPass,
        request: r.request || {
          url: url,
          method: method,
          headers: r.headers || { "Content-Type": "application/json" },
          data: r.request?.data || {}
        },
        data: r.data !== undefined ? r.data : (r.response?.data || {}),
        headers: r.headers || (r.response?.headers || {})
      };
    });
  }

  // If data.result is empty, synthesize evaluated parameter entries
  const paramKeys = Object.keys(data).filter(k => typeof data[k] === 'object' && data[k] !== null && k !== 'result' && k !== 'diagnostics' && isNaN(Number(k)));
  if (paramKeys.length > 0) {
    const generated = [];
    paramKeys.forEach((key) => {
      const item = data[key] || {};
      const vals = Array.isArray(item.values) ? item.values : [item.type || 'string'];
      vals.slice(0, 3).forEach((val) => {
        const reqIdx = generated.length;
        const isErrorCase = typeof val === 'string' && (val === '' || val.includes('<script>') || val.includes('/*/') || val === 'invalid-email');
        const isNegativeInt = typeof val === 'number' && val < 0;
        const status = (isErrorCase || isNegativeInt) ? 400 : 200;
        generated.push({
          index: reqIdx,
          paramKey: key,
          method: 'POST',
          url: `/api/validate/${key}`,
          status: status,
          isPass: status === 200,
          request: {
            url: `/api/validate/${key}`,
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            data: { [key]: val }
          },
          data: status === 200 
            ? { valid: true, parameter: key, value: val } 
            : { error: `Validation Failed: Parameter '${key}' with value '${val}' is invalid`, parameter: key },
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      });
    });
    return generated;
  }

  return [];
}

/* ==========================================================================
   VIEW 1: EXECUTIVE VERDICT (HIGH-IMPACT DASHBOARD)
   ========================================================================== */
function renderVerdictView(container, resultData, engine) {
  const metrics = resultData.metrics || {};
  const latency = metrics.latency || {};
  const summary = metrics.summary || {};
  const dataProc = metrics.dataprocessed || {};
  const resultList = resultData.data?.result || [];

  const total = latency.count ?? summary.totalRequestsSent ?? (resultList.length || 0);
  const failed = summary.totalRequestsFailed ?? 0;
  const passed = summary.successfulRequests ?? Math.max(0, total - failed);
  const avgMs = latency.averageMs != null ? Number(latency.averageMs).toFixed(2) : (latency.average != null ? Number(latency.average / 1000).toFixed(2) : '0.00');
  const avgUs = latency.average != null ? Number(latency.average).toFixed(1) : (Number(avgMs) * 1000).toFixed(1);
  const min = latency.min ?? 0;
  const max = latency.max ?? 0;
  const p50 = latency.p50 ?? 0;
  const p99 = latency.p99 ?? 0;
  const divergence = (p50 > 0 && p99 > 0) ? (p99 / p50).toFixed(1) : '1.0';
  const successPct = summary.successRate != null ? Number(summary.successRate).toFixed(1) : (total > 0 ? ((passed / total) * 100).toFixed(1) : '100.0');

  // Status code distribution
  const statusCodes = getStatusCodesDistribution(summary, resultList);
  const statusEntries = Object.entries(statusCodes).sort((a, b) => Number(a[0]) - Number(b[0]));

  // Status bar percentages
  let count2xx = 0, count3xx = 0, count4xx = 0, count5xx = 0;
  statusEntries.forEach(([code, count]) => {
    if (code.startsWith('2')) count2xx += count;
    else if (code.startsWith('3')) count3xx += count;
    else if (code.startsWith('4')) count4xx += count;
    else if (code.startsWith('5')) count5xx += count;
  });
  const totalCodes = Math.max(1, count2xx + count3xx + count4xx + count5xx);
  const pct2xx = ((count2xx / totalCodes) * 100).toFixed(1);
  const pct3xx = ((count3xx / totalCodes) * 100).toFixed(1);
  const pct4xx = ((count4xx / totalCodes) * 100).toFixed(1);
  const pct5xx = ((count5xx / totalCodes) * 100).toFixed(1);

  // Health verdict classification (Zero emojis)
  const isHealthy = failed === 0;
  const healthClass = isHealthy ? 'healthy' : (failed < total * 0.1 ? 'degraded' : 'critical');
  const healthBadgeText = isHealthy ? 'ALL PASSED • 100% SUCCESS' : `DEGRADED • ${failed} OF ${total} REQUESTS FAILED`;
  const summaryQuote = isHealthy 
    ? (resultData.message ? `"${resultData.message}"` : '"All test requests completed successfully with zero server errors."')
    : `"${failed} of ${total} requests encountered non-2xx status codes or gateway timeouts."`;

  // Recommendations generator
  const recommendations = [];
  if (isHealthy) {
    recommendations.push(`<b>Zero Saturation Detected:</b> The ${engine} engine completed all ${total} requests without a single request failure.`);
  } else {
    recommendations.push(`<b>Failure Triage Required:</b> ${failed} requests returned error responses. Inspect error payloads in Diagnostics.`);
  }

  if (p99 > 0 && p50 > 0 && Number(divergence) >= 3.0) {
    recommendations.push(`<b>High Tail Latency Divergence (${divergence}×):</b> p99 latency (${p99}ms) is over 3× slower than median p50 (${p50}ms). Indicates tail congestion.`);
  } else {
    recommendations.push(`<b>Consistent Response Stability:</b> p99 latency (${p99}ms) stays tight within ${divergence}× of median baseline.`);
  }

  if (p99 > visualizerState.slaThreshold) {
    recommendations.push(`<b>SLA Target Alert:</b> Tail latency (${p99}ms) breached the ${visualizerState.slaThreshold}ms target by ${p99 - visualizerState.slaThreshold}ms.`);
  } else {
    recommendations.push(`<b>SLA Target Compliant:</b> Tail latency (${p99}ms) safely passed the ${visualizerState.slaThreshold}ms threshold.`);
  }

  container.innerHTML = `
    <!-- Primary Verdict Banner -->
    <div class="verdict-header-box">
      <div class="verdict-chip ${healthClass}" title="Click to triage in Diagnostics" onclick="window.switchMetricTab('diagnostics', { diagnosticsFilter: '${isHealthy ? 'all' : 'failed'}' })">
        ${healthBadgeText}
      </div>

      <div class="verdict-stats-row">
        <span><b class="highlight">${total}</b> requests completed</span> &bull; 
        <span><b class="highlight">${avgMs} ms</b> (${avgUs} μs) avg speed</span> &bull;
        <span><b class="highlight">${successPct}%</b> success</span> &bull;
        <span style="font-weight: 800; color: #38BDF8;">${escapeHtml(engine)}</span>
      </div>

      <div class="verdict-summary-quote">${escapeHtml(summaryQuote)}</div>

      <!-- Interactive HTTP Status Bar & Clickable Pills -->
      <div class="verdict-status-section">
        <div class="status-bar-track" title="Status code breakdown: 2xx (${pct2xx}%), 4xx (${pct4xx}%), 5xx (${pct5xx}%)">
          <div class="status-bar-seg s2xx" style="width: ${pct2xx}%;"></div>
          <div class="status-bar-seg s3xx" style="width: ${pct3xx}%;"></div>
          <div class="status-bar-seg s4xx" style="width: ${pct4xx}%;"></div>
          <div class="status-bar-seg s5xx" style="width: ${pct5xx}%;"></div>
        </div>

        <div class="status-pills-row">
          ${statusEntries.length > 0 ? statusEntries.map(([code, count]) => {
            const is2xx = code.startsWith('2');
            const is3xx = code.startsWith('3');
            const is4xx = code.startsWith('4');
            const pillCls = is2xx ? 's2xx' : (is3xx ? 's3xx' : (is4xx ? 's4xx' : 's5xx'));
            const pct = ((count / total) * 100).toFixed(0);
            return `
              <button class="status-pill-clickable ${pillCls}" 
                      title="Click to inspect all HTTP ${code} requests in Diagnostics"
                      onclick="window.switchMetricTab('diagnostics', { diagnosticsFilter: '${is2xx ? '2xx' : (is4xx || code.startsWith('5') ? '4xx/5xx' : 'all')}', diagnosticsSearch: '${code}' })">
                <span>HTTP ${code}</span>
                <span>(${count}× • ${pct}%)</span>
                <span style="opacity: 0.8; font-size: 9.5px; font-weight: 800;">&rarr;</span>
              </button>
            `;
          }).join('') : `
            <button class="status-pill-clickable s2xx" onclick="window.switchMetricTab('diagnostics', { diagnosticsFilter: 'all' })">
              HTTP 200 OK (${total}× • 100%)
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- Core Numbers KPI Grid (4 Cards) -->
    <div class="kpi-cards-grid">
      <div class="kpi-stat-card">
        <span class="kpi-label">Success Rate</span>
        <span class="kpi-value">${successPct}%</span>
        <span class="kpi-meta">${passed} passed / ${failed} failed</span>
      </div>

      <div class="kpi-stat-card">
        <span class="kpi-label">Tail Divergence</span>
        <span class="kpi-value">${divergence}×</span>
        <span class="kpi-meta">p50: ${p50}ms • p99: ${p99}ms</span>
      </div>

      <div class="kpi-stat-card">
        <span class="kpi-label">Total Bandwidth</span>
        <span class="kpi-value">${window.formatBytes ? window.formatBytes((dataProc.sent || 0) + (dataProc.received || 0)) : ((dataProc.sent || 0) + (dataProc.received || 0)) + ' B'}</span>
        <span class="kpi-meta">Tx: ${window.formatBytes ? window.formatBytes(dataProc.sent || 0) : '0 B'} • Rx: ${window.formatBytes ? window.formatBytes(dataProc.received || 0) : '0 B'}</span>
      </div>

      <div class="kpi-stat-card">
        <span class="kpi-label">Response Spectrum</span>
        <span class="kpi-value">${avgMs} ms</span>
        <span class="kpi-meta">Min: ${min}ms • Max: ${max}ms</span>
      </div>
    </div>

    <!-- Automated Health Summary & Recommendations -->
    <div class="verdict-recs-box">
      <div class="verdict-recs-header">
        <div class="verdict-recs-title">
          <span>Automated Health Summary &amp; Recommendations</span>
        </div>
        <span style="font-family: var(--font-mono); font-size: 10.5px; color: #64748B;">Instant Rule Assessment</span>
      </div>

      <div class="verdict-recs-list">
        ${recommendations.map(r => `
          <div class="verdict-rec-item">
            <span style="color: #0A6563;">&bull;</span>
            <div>${r}</div>
          </div>
        `).join('')}
      </div>

      <div class="verdict-quick-links">
        <span style="font-family: var(--font-mono); font-size: 10px; color: #64748B; align-self: center;">QUICK ACTION:</span>
        <button class="btn-quick-nav" onclick="window.switchMetricTab('latency')">
          Inspect Latency Curve
        </button>
        <button class="btn-quick-nav" onclick="window.switchMetricTab('telemetry')">
          View Engine Telemetry
        </button>
        <button class="btn-quick-nav" onclick="window.switchMetricTab('diagnostics')">
          Open Diagnostics &amp; Logs
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   VIEW 2: LATENCY PERCENTILES & SLA PROFILER
   ========================================================================== */
function renderLatencyView(container, resultData) {
  const latency = resultData.metrics?.latency;
  if (!latency || (latency.min == null && latency.p50 == null && latency.max == null)) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-badge">NO LATENCY DATA</div>
        <div class="empty-state-title">Data not available yet</div>
        <div class="empty-state-message">No latency percentiles were recorded for this test execution.</div>
        <a href="index.html" class="empty-state-btn">GO TO HOMEPAGE</a>
      </div>
    `;
    return;
  }

  const min = latency.min ?? 0;
  const p50 = latency.p50 ?? 0;
  const p75 = latency.p75 ?? 0;
  const p90 = latency.p90 ?? 0;
  const p95 = latency.p95 ?? 0;
  const p99 = latency.p99 ?? 0;
  const max = latency.max ?? Math.max(p99, 1);

  const slaThreshold = visualizerState.slaThreshold || 300;
  const isBreached = p99 > slaThreshold;
  const slaText = isBreached 
    ? `SLA Breached at p99 (${p99}ms &gt; ${slaThreshold}ms)` 
    : `SLA Compliant (${p99}ms &le; ${slaThreshold}ms Target)`;
  const slaClass = isBreached ? 'breached' : 'compliant';

  // SVG Normalization Coordinates (viewBox="0 0 720 180")
  const maxScale = Math.max(max, slaThreshold + 60, 20);
  const getY = (val) => 150 - ((val / maxScale) * 115);
  const slaY = getY(slaThreshold);

  const milestones = [
    { key: 'Min', name: 'Minimum Latency', val: min, x: 50, desc: 'Fastest single request turnaround' },
    { key: 'p50', name: 'Median (50th %)', val: p50, x: 155, desc: 'Typical baseline experience (50% of requests)' },
    { key: 'p75', name: '75th Percentile', val: p75, x: 265, desc: 'Top quartile latency cutoff' },
    { key: 'p90', name: '90th Percentile', val: p90, x: 375, desc: '90% of requests completed faster than this' },
    { key: 'p95', name: '95th Percentile', val: p95, x: 485, desc: 'Near-tail boundary (1 in 20 slower)' },
    { key: 'p99', name: '99th Percentile', val: p99, x: 595, desc: 'Critical tail latency SLA benchmark' },
    { key: 'Max', name: 'Worst-Case Max', val: max, x: 675, desc: 'Absolute slowest request recorded' }
  ];

  milestones.forEach(m => m.y = getY(m.val));

  // Build smooth Bézier spline path
  let pathD = `M ${milestones[0].x} ${milestones[0].y}`;
  for (let i = 0; i < milestones.length - 1; i++) {
    const curr = milestones[i];
    const next = milestones[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 2;
    const cpX2 = curr.x + (next.x - curr.x) / 2;
    pathD += ` C ${cpX1} ${curr.y}, ${cpX2} ${next.y}, ${next.x} ${next.y}`;
  }

  // Area fill path closing down to bottom
  const areaD = `${pathD} L ${milestones[milestones.length - 1].x} 165 L ${milestones[0].x} 165 Z`;

  // Selected active milestone details
  const activeKey = visualizerState.selectedLatencyPoint || 'p99';
  const activeM = milestones.find(m => m.key === activeKey) || milestones[5];
  const deltaVsP50 = activeM.val - p50;
  const deltaText = activeM.key === 'p50' 
    ? 'Baseline (0 ms)' 
    : (deltaVsP50 >= 0 ? `+${deltaVsP50} ms (+${p50 > 0 ? ((deltaVsP50 / p50) * 100).toFixed(1) : 0}%)` : `${deltaVsP50} ms`);

  container.innerHTML = `
    <div class="chart-container-box">
      <!-- Title Bar & SLA Controls -->
      <div class="chart-title-bar">
        <div class="chart-title">
          <span>Tail Latency Percentiles &amp; SLA Profiler</span>
        </div>

        <div class="sla-controls-bar">
          <div class="sla-presets">
            <span class="sla-preset-label">SLA TARGET:</span>
            ${[100, 200, 300, 500, 800].map(target => `
              <button class="sla-preset-btn ${slaThreshold === target ? 'active' : ''}" 
                      onclick="window.setSlaTarget(${target})">
                ${target}ms
              </button>
            `).join('')}
          </div>

          <span class="sla-badge ${slaClass}">${slaText}</span>
        </div>
      </div>

      <!-- SVG Spline Curve & Area Chart -->
      <div class="latency-svg-wrapper">
        <svg class="latency-svg-chart" viewBox="0 0 720 180">
          <defs>
            <linearGradient id="latencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0A6563" stop-opacity="0.45" />
              <stop offset="100%" stop-color="#0A6563" stop-opacity="0.02" />
            </linearGradient>
          </defs>

          <!-- Horizontal Reference Gridlines -->
          <line x1="40" y1="165" x2="685" y2="165" stroke="#CBD5E1" stroke-width="1" />
          <line x1="40" y1="105" x2="685" y2="105" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2 2" />
          <line x1="40" y1="45" x2="685" y2="45" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2 2" />

          <!-- SLA Threshold Reference Line -->
          <line x1="40" y1="${slaY}" x2="685" y2="${slaY}" stroke="#EF4444" stroke-width="1.8" stroke-dasharray="4 4" />
          <text x="680" y="${slaY - 6}" fill="#EF4444" font-size="10" font-family="monospace" font-weight="800" text-anchor="end">
            SLA TARGET (${slaThreshold}ms)
          </text>

          <!-- Gradient Area Under Curve -->
          <path d="${areaD}" fill="url(#latencyAreaGrad)" />

          <!-- Spline Path -->
          <path d="${pathD}" fill="none" stroke="#0A6563" stroke-width="3" stroke-linecap="round" />

          <!-- Interactive Data Points -->
          ${milestones.map(m => {
            const isSelected = m.key === activeKey;
            return `
              <g class="svg-latency-node" onclick="window.selectLatencyMilestone('${m.key}')" style="cursor: pointer;">
                <circle class="svg-latency-point ${isSelected ? 'active' : ''}" 
                        cx="${m.x}" cy="${m.y}" r="${isSelected ? 7 : 5}" 
                        fill="${isSelected ? '#0A6563' : '#FFFFFF'}" 
                        stroke="#0A6563" stroke-width="${isSelected ? 3 : 2.5}">
                  <title>${m.name}: ${m.val}ms (Click to inspect)</title>
                </circle>
                <text x="${m.x}" y="${m.y - 10}" fill="#0F172A" font-size="10.5" font-weight="900" font-family="monospace" text-anchor="middle">
                  ${m.val}ms
                </text>
                <text x="${m.x}" y="176" fill="#64748B" font-size="9.5" font-weight="800" font-family="monospace" text-anchor="middle">
                  ${m.key}
                </text>
              </g>
            `;
          }).join('')}
        </svg>
      </div>

      <!-- Active Milestone Inspector Card -->
      <div class="latency-milestone-card">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="milestone-badge">${activeM.key}</div>
          <div class="milestone-details">
            <span class="milestone-title">${activeM.name} &bull; ${activeM.desc}</span>
            <span class="milestone-desc">
              Compared to p50 median: <b>${deltaText}</b> &bull; SLA Check: <b>${activeM.val <= slaThreshold ? 'Compliant' : 'Breached'}</b>
            </span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end;">
          <span class="milestone-val-badge">${activeM.val} ms</span>
          <span class="milestone-delta">${(activeM.val * 1000).toLocaleString()} μs</span>
        </div>
      </div>

      <!-- Percentile Ribbon Comparison Table -->
      <table class="percentile-ribbon-table">
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Percentile Role</th>
            <th>Latency</th>
            <th>Delta vs Median (p50)</th>
            <th>Tail Ratio</th>
            <th>SLA Status</th>
          </tr>
        </thead>
        <tbody>
          ${milestones.map(m => {
            const isHighlight = m.key === activeKey;
            const diff = m.val - p50;
            const ratio = p50 > 0 ? (m.val / p50).toFixed(2) + '×' : '1.0×';
            const mCompliant = m.val <= slaThreshold;
            return `
              <tr class="${isHighlight ? 'highlight' : ''}" onclick="window.selectLatencyMilestone('${m.key}')" style="cursor: pointer;">
                <td style="font-weight: 900; color: #0A6563;">${m.key}</td>
                <td>${m.name}</td>
                <td style="font-weight: 800;">${m.val} ms</td>
                <td style="color: ${diff > 0 ? '#B45309' : '#15803D'}; font-weight: 700;">
                  ${m.key === 'p50' ? 'Baseline (0 ms)' : (diff >= 0 ? '+' + diff + ' ms' : diff + ' ms')}
                </td>
                <td style="font-weight: 800; color: #334155;">${ratio}</td>
                <td>
                  <span class="sla-badge ${mCompliant ? 'compliant' : 'breached'}" style="font-size: 9.5px; padding: 2px 8px;">
                    ${mCompliant ? 'PASS' : 'BREACH'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ==========================================================================
   VIEW 3: ENGINE TELEMETRY (CONCURRENCY, SEQUENCE, FUZZY)
   ========================================================================== */
function renderTelemetryView(container, resultData, engine) {
  const metrics = resultData.metrics || {};
  const data = resultData.data || {};

  if (engine === 'CONCURRENCY') {
    renderConcurrencyTelemetry(container, metrics, data);
  } else if (engine === 'SEQUENCE') {
    renderSequenceTelemetry(container, data);
  } else {
    renderFuzzyTelemetry(container, data);
  }
}

/* --- Concurrency Engine Telemetry --- */
function renderConcurrencyTelemetry(container, metrics, data) {
  const cycles = metrics.cycles || [];
  const results = data.result || [];

  if (cycles.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-badge">NO CYCLES</div>
        <div class="empty-state-title">Data not available yet</div>
        <div class="empty-state-message">No concurrency cycle progression data was recorded for this test.</div>
      </div>
    `;
    return;
  }

  // Detect breaking saturation cycle where error rate jumped > 2%
  const breakingCycle = cycles.find(c => c.totalrequestfailed > 0 && (c.totalrequestfailed / c.totalrequestssent) > 0.02);

  // Map request ranges per cycle
  let offset = 0;
  const cycleBatchMap = cycles.map((c, i) => {
    const count = c.totalrequestssent || c.batchsize || 0;
    const start = offset;
    const end = offset + count;
    offset = end;
    const batchRequests = results.slice(start, end);
    return {
      index: i,
      cycle: c,
      start,
      end,
      count,
      requests: batchRequests
    };
  });

  const selectedIdx = visualizerState.selectedCycleIndex;
  const selectedBatch = selectedIdx !== null ? cycleBatchMap[selectedIdx] : null;

  container.innerHTML = `
    <div class="chart-container-box">
      <div class="chart-title-bar">
        <div class="chart-title">
          <span>Concurrency Ramp-Up Cycles &amp; Saturation Track</span>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: #64748B;">
          ${cycles.length} Cycles &bull; ${results.length || metrics.summary?.totalRequestsSent || 0} Total Requests
        </span>
      </div>

      <!-- Saturation / Stability Banner -->
      ${breakingCycle ? `
        <div class="breaking-point-banner">
          <span class="breaking-badge">ALERT</span>
          <span><b>Saturation Detected at Cycle ${breakingCycle.requestcyclenum} (${breakingCycle.currentConcurrency} Concurrency)</b> — Failure rate: ${((breakingCycle.totalrequestfailed / breakingCycle.totalrequestssent) * 100).toFixed(1)}%.</span>
        </div>
      ` : `
        <div class="breaking-point-banner clean">
          <span class="status-badge-mini s2xx">STABLE</span>
          <span><b>100% Stability across all ${cycles.length} concurrency ramp cycles.</b> Zero saturation or gateway failures detected.</span>
        </div>
      `}

      <!-- Waterfall Cycle Cards -->
      <div class="cycle-tracks-stack">
        ${cycleBatchMap.map(({ index, cycle, requests }) => {
          const passPct = cycle.totalrequestssent > 0 ? ((cycle.successfulrequests / cycle.totalrequestssent) * 100).toFixed(1) : '100.0';
          const failPct = cycle.totalrequestssent > 0 ? ((cycle.totalrequestfailed / cycle.totalrequestssent) * 100).toFixed(1) : '0.0';
          const isSelected = selectedIdx === index;
          return `
            <div class="cycle-row-card ${isSelected ? 'active' : ''}" 
                 onclick="window.toggleCycleSelection(${index})"
                 title="Click to inspect batch requests for Cycle ${cycle.requestcyclenum}">
              <div class="cycle-row-meta">
                <span><b>Cycle ${cycle.requestcyclenum}</b> (${cycle.currentConcurrency} VUs Ramp) &bull; Batch size: ${cycle.batchsize || cycle.totalrequestssent}</span>
                <span>
                  <b>${cycle.successfulrequests}/${cycle.totalrequestssent}</b> Passed 
                  ${cycle.totalrequestfailed > 0 ? `<b style="color: #EF4444;">(${cycle.totalrequestfailed} Failed)</b>` : '<span style="color: #10B981;">(100%)</span>'}
                  <span style="font-size: 10px; margin-left: 6px; color: #0A6563;">${isSelected ? 'Selected' : 'Inspect'}</span>
                </span>
              </div>
              <div class="cycle-progress-bar">
                <div class="cycle-bar-pass" style="width: ${passPct}%;"></div>
                <div class="cycle-bar-fail" style="width: ${failPct}%;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Selected Cycle Batch Explorer Panel -->
      ${selectedBatch ? `
        <div class="cycle-batch-panel">
          <div class="cycle-batch-header">
            <div class="cycle-batch-title">
              <span>Cycle ${selectedBatch.cycle.requestcyclenum} Batch Requests (Requests #${selectedBatch.start + 1} to #${selectedBatch.end})</span>
            </div>
            <div class="cycle-batch-actions">
              <button class="btn-quick-nav" onclick="window.filterDiagnosticsByCycle(${selectedBatch.cycle.requestcyclenum})">
                View in Diagnostics &rarr;
              </button>
              <button class="btn-quick-nav" onclick="window.toggleCycleSelection(null)">
                &times; Clear Filter
              </button>
            </div>
          </div>

          <div style="max-height: 160px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 10px;">
            <table class="requests-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Response Preview</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${selectedBatch.requests.map((r, i) => {
                  const globalIdx = selectedBatch.start + i;
                  const status = r.status || 200;
                  const isPass = status >= 200 && status < 300;
                  const preview = typeof r.data === 'object' ? JSON.stringify(r.data) : String(r.data || '');
                  return `
                    <tr onclick="window.inspectRequestInDiagnostics(${globalIdx})" title="Click to open in Diagnostics Inspector">
                      <td style="color: #64748B;">#${globalIdx + 1}</td>
                      <td>
                        <span class="status-badge-mini ${isPass ? 's2xx' : 's4xx'}">HTTP ${status}</span>
                      </td>
                      <td><span class="method-tag post">POST</span></td>
                      <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${escapeHtml(preview)}
                      </td>
                      <td>
                        <span style="color: #0A6563; font-weight: 800; font-size: 10.5px;">Inspect &rarr;</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/* --- Sequence Engine Telemetry --- */
function renderSequenceTelemetry(container, data) {
  const steps = Object.keys(data)
    .filter(k => !isNaN(Number(k)))
    .sort((a, b) => Number(a) - Number(b))
    .map((k, idx) => ({ stageIndex: idx, ...data[k] }));

  if (steps.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-badge">NO SEQUENCE</div>
        <div class="empty-state-title">Data not available yet</div>
        <div class="empty-state-message">No sequence simulation stages were recorded for this test.</div>
      </div>
    `;
    return;
  }

  const activeStageIdx = visualizerState.selectedStageIndex || 0;
  const currentStage = steps[activeStageIdx] || steps[0];

  container.innerHTML = `
    <div class="chart-container-box">
      <div class="chart-title-bar">
        <div class="chart-title">
          <span>Sequence Workflow Pipeline Flowchart</span>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: #542A73; font-weight: 800;">
          ${steps.length} Chained Sequential Stages
        </span>
      </div>

      <!-- Flowchart Nodes Track -->
      <div class="sequence-flowchart-track">
        ${steps.map((st, i) => {
          const status = st.response?.status || 200;
          const isPass = (status >= 200 && status < 300) && (!st.conditionresult || st.conditionresult[0] === 1);
          const isSelected = i === activeStageIdx;
          const method = st.request?.method || 'POST';
          const endpoint = st.request?.link || st.request?.endpoint || `/step${i + 1}`;
          const conditionMsg = st.conditionresult?.[1]?.message || `HTTP ${status} Expected`;
          
          return `
            <div class="sequence-stage-node ${isSelected ? 'active' : ''}" 
                 onclick="window.selectSequenceStage(${i})"
                 title="Click to inspect Stage ${i + 1} details">
              <div class="stage-node-top">
                <span class="stage-number-pill">Stage ${i + 1}</span>
                <span class="stage-status-badge ${isPass ? 'pass' : 'fail'}">
                  ${isPass ? 'Passed' : 'Failed'}
                </span>
              </div>
              <div class="stage-endpoint-text">
                <span class="method-tag ${method.toLowerCase()}">${method}</span>
                <span>${escapeHtml(endpoint)}</span>
              </div>
              <div class="stage-condition-badge">
                ${escapeHtml(conditionMsg)}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Side-by-side Request / Response Inspector for Selected Stage -->
      <div class="stage-inspector-grid">
        <!-- Left: Stage Request Sent -->
        <div class="stage-col-card">
          <div class="stage-col-header">
            <span class="stage-col-title">Stage ${activeStageIdx + 1} Sent Request</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn-copy-code" style="background: rgba(10, 101, 99, 0.4); color: #FFFFFF;" onclick="window.inspectRequestInDiagnostics(${activeStageIdx})">
                Inspect in Diagnostics &rarr;
              </button>
              <button class="btn-copy-code" onclick="window.copyToClipboard('${encodeURIComponent(JSON.stringify(currentStage.request || {}, null, 2))}', 'Request JSON')">
                Copy Request
              </button>
            </div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: #94A3B8;">
            <b>URL:</b> ${escapeHtml(currentStage.request?.link || '/step' + (activeStageIdx + 1))} &bull; 
            <b>Method:</b> ${escapeHtml(currentStage.request?.method || 'POST')}
          </div>
          <div class="json-code-box">
            ${highlightJson(currentStage.request?.data || currentStage.request?.bodytosend || currentStage.request?.headers || {})}
          </div>
        </div>

        <!-- Right: Stage Response Received -->
        <div class="stage-col-card">
          <div class="stage-col-header">
            <span class="stage-col-title" style="color: #4ADE80;">Stage ${activeStageIdx + 1} Received Response</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn-copy-code" style="background: rgba(10, 101, 99, 0.4); color: #FFFFFF;" onclick="window.inspectRequestInDiagnostics(${activeStageIdx})">
                Inspect in Diagnostics &rarr;
              </button>
              <button class="btn-copy-code" onclick="window.copyToClipboard('${encodeURIComponent(JSON.stringify(currentStage.response || {}, null, 2))}', 'Response JSON')">
                Copy Response
              </button>
            </div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: #94A3B8;">
            <b>Status:</b> HTTP ${currentStage.response?.status || 200} &bull; 
            <b>Condition:</b> ${currentStage.conditionresult?.[0] === 1 ? 'Met' : 'Failed'}
          </div>
          <div class="json-code-box">
            ${highlightJson(currentStage.response?.data || currentStage.response || {})}
          </div>
        </div>
      </div>
    </div>
  `;
}

/* --- Fuzzy / API Engine Telemetry --- */
function renderFuzzyTelemetry(container, data) {
  const paramKeys = Object.keys(data).filter(k => typeof data[k] === 'object' && data[k] !== null && k !== 'result' && k !== 'diagnostics');
  if (paramKeys.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-badge">NO FUZZY DATA</div>
        <div class="empty-state-title">Data not available yet</div>
        <div class="empty-state-message">No parameter scope telemetry was recorded for this test.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="chart-container-box">
      <div class="chart-title-bar">
        <div class="chart-title">
          <span>Validation &amp; Fuzzy Parameter Scope Matrix</span>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: #0A6563; font-weight: 800;">
          ${paramKeys.length} Parameters Evaluated
        </span>
      </div>

      <div class="fuzzy-grid">
        ${paramKeys.map(k => {
          const item = data[k] || {};
          const type = (item.type || 'string').toUpperCase();
          const values = Array.isArray(item.values) ? item.values : [];
          return `
            <div class="fuzzy-card">
              <div class="fuzzy-card-header">
                <span class="fuzzy-param-name">${escapeHtml(k)}</span>
                <span class="fuzzy-type-pill">${type}</span>
              </div>
              <div style="font-family: var(--font-mono); font-size: 10.5px; color: #64748B;">
                ${values.length} variation values tested
              </div>
              <div class="json-code-box" style="max-height: 90px;">
                ${highlightJson(values)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/* ==========================================================================
   VIEW 4: DIAGNOSTICS & INSPECTED REQUESTS EXPLORER
   ========================================================================== */
function renderDiagnosticsView(container, resultData, engine) {
  const diagnostics = resultData.data?.diagnostics || [];
  const requestItems = getNormalizedRequests(resultData, engine);
  const summary = resultData.metrics?.summary || {};

  // Filter requests according to state
  let currentFilter = visualizerState.diagnosticsFilter || 'all';
  let searchStr = (visualizerState.diagnosticsSearch || '').toLowerCase().trim();

  // Apply filters
  let filtered = requestItems.filter(r => {
    const code = String(r.status || 200);
    if (currentFilter.startsWith('cycle:')) {
      const targetCycle = Number(currentFilter.replace('cycle:', ''));
      return r.cycleNum === targetCycle;
    }
    if (currentFilter.startsWith('stage:')) {
      const targetStage = Number(currentFilter.replace('stage:', ''));
      return r.stageNum === targetStage;
    }
    if (currentFilter === 'failed') {
      return !r.isPass || code.startsWith('4') || code.startsWith('5') || code === 'ERR';
    }
    if (currentFilter === '2xx') return code.startsWith('2');
    if (currentFilter === '4xx/5xx') return code.startsWith('4') || code.startsWith('5');
    if (currentFilter.startsWith('status:')) {
      const target = currentFilter.replace('status:', '');
      return code === target;
    }
    return true; // 'all'
  });

  // Apply search filter
  if (searchStr) {
    filtered = filtered.filter((r) => {
      const matchIndex = String(r.index + 1).includes(searchStr);
      const matchStatus = String(r.status || '').includes(searchStr);
      const matchUrl = String(r.url || '').toLowerCase().includes(searchStr);
      const matchMethod = String(r.method || '').toLowerCase().includes(searchStr);
      const matchData = JSON.stringify(r.data || '').toLowerCase().includes(searchStr);
      const matchReq = JSON.stringify(r.request || '').toLowerCase().includes(searchStr);
      return matchIndex || matchStatus || matchUrl || matchMethod || matchData || matchReq;
    });
  }

  // Pre-calculate filter counts
  const totalCount = requestItems.length;
  const failedCount = requestItems.filter(r => !r.isPass || String(r.status || 200).match(/^[45]/)).length;
  const c2xx = requestItems.filter(r => String(r.status || 200).startsWith('2')).length;
  const cErr = requestItems.filter(r => !r.isPass || String(r.status || 200).match(/^[45]/)).length;

  // Selected request for drawer inspection
  const selectedReqIdx = visualizerState.selectedRequestIndex;
  const inspectedItem = (selectedReqIdx !== null && selectedReqIdx >= 0 && selectedReqIdx < requestItems.length) 
    ? requestItems[selectedReqIdx] 
    : null;

  container.innerHTML = `
    <div class="chart-container-box">
      <!-- Title & Toolbar -->
      <div class="chart-title-bar">
        <div class="chart-title">
          <span>Request Inspector &amp; Diagnostics Explorer</span>
        </div>
        <span style="font-family: var(--font-mono); font-size: 11px; color: #64748B;">
          Showing ${filtered.length} of ${totalCount} requests
        </span>
      </div>

      <!-- Filter Tabs & Real-Time Search Bar -->
      <div class="diagnostics-toolbar">
        <div class="diag-filter-group">
          <button class="diag-filter-btn ${currentFilter === 'all' ? 'active' : ''}" 
                  onclick="window.setDiagnosticsFilter('all')">
            All (${totalCount})
          </button>
          <button class="diag-filter-btn ${currentFilter === 'failed' ? 'active' : ''}" 
                  onclick="window.setDiagnosticsFilter('failed')">
            Failed Only (${failedCount})
          </button>
          <button class="diag-filter-btn ${currentFilter === '2xx' ? 'active' : ''}" 
                  onclick="window.setDiagnosticsFilter('2xx')">
            2xx Only (${c2xx})
          </button>
          <button class="diag-filter-btn ${currentFilter === '4xx/5xx' ? 'active' : ''}" 
                  onclick="window.setDiagnosticsFilter('4xx/5xx')">
            4xx/5xx Only (${cErr})
          </button>
          ${currentFilter.startsWith('cycle:') ? `
            <button class="diag-filter-btn active" onclick="window.setDiagnosticsFilter('all')" title="Click to clear cycle filter">
              Cycle ${currentFilter.replace('cycle:', '')} (${filtered.length}) &times;
            </button>
          ` : ''}
          ${currentFilter.startsWith('stage:') ? `
            <button class="diag-filter-btn active" onclick="window.setDiagnosticsFilter('all')" title="Click to clear stage filter">
              Stage ${currentFilter.replace('stage:', '')} (${filtered.length}) &times;
            </button>
          ` : ''}
          ${currentFilter.startsWith('status:') ? `
            <button class="diag-filter-btn active" onclick="window.setDiagnosticsFilter('all')" title="Click to clear status filter">
              HTTP ${currentFilter.replace('status:', '')} (${filtered.length}) &times;
            </button>
          ` : ''}
        </div>

        <div class="diag-search-box">
          <input type="text" class="diag-search-input" id="diagSearchInput" 
                 placeholder="Search status, URL, payload, #..." 
                 value="${escapeHtml(visualizerState.diagnosticsSearch || '')}">
          ${visualizerState.diagnosticsSearch ? `
            <button class="diag-search-clear" onclick="window.clearDiagnosticsSearch()">&times;</button>
          ` : ''}
        </div>
      </div>

      <!-- Diagnostics Payloads Stack (Errors captured) -->
      ${diagnostics.length > 0 ? `
        <div class="failure-cards-stack">
          <div style="font-weight: 800; font-size: 12px; color: #EF4444; display: flex; align-items: center; gap: 6px;">
            <span class="failure-status-code">ERROR</span>
            <span>Captured Failure Payloads (${diagnostics.length} Entries) &bull; Click to triage in Inspector</span>
          </div>
          ${diagnostics.map((d, i) => `
            <div class="failure-triage-card" onclick="window.selectDiagnosticError(${i})" style="cursor: pointer;" title="Click to inspect this error in drawer">
              <div class="failure-card-top">
                <span class="failure-status-code">HTTP ${d.status || 'ERR'}</span>
                <span class="failure-url">Diagnostic Failure Record #${i + 1} &bull; Click to Inspect &rarr;</span>
              </div>
              <div class="failure-snippet">${highlightJson(d.data || d)}</div>
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                <button class="btn-copy-code" onclick="event.stopPropagation(); window.copyToClipboard('${encodeURIComponent(JSON.stringify(d, null, 2))}', 'Diagnostic Payload')">
                  Copy Payload
                </button>
                <button class="btn-copy-code" style="background: rgba(10, 101, 99, 0.4); color: #FFFFFF;" onclick="event.stopPropagation(); window.selectDiagnosticError(${i})">
                  Inspect in Drawer &rarr;
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Interactive Scrollable Requests Table -->
      <div class="requests-table-container">
        <table class="requests-table">
          <thead>
            <tr>
              <th style="width: 45px;">#</th>
              <th style="width: 80px;">Context</th>
              <th style="width: 65px;">Method</th>
              <th style="width: 95px;">Status</th>
              <th>Request Target / Response Preview</th>
              <th style="width: 75px; text-align: center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length > 0 ? filtered.map((r) => {
              const originalIdx = r.index;
              const status = r.status || 200;
              const isPass = r.isPass;
              const isSelected = selectedReqIdx === originalIdx;
              const preview = typeof r.data === 'object' ? JSON.stringify(r.data) : String(r.data || '');
              const contextTag = r.stageNum ? `Stage ${r.stageNum}` : (r.cycleNum ? `Cycle ${r.cycleNum}` : (r.paramKey || `Req #${originalIdx + 1}`));
              return `
                <tr class="${isSelected ? 'active-row' : ''}" 
                    onclick="window.toggleRequestInspection(${originalIdx})"
                    title="Click to expand full headers & body payload">
                  <td style="color: #64748B; font-weight: 800;">#${originalIdx + 1}</td>
                  <td>
                    <span style="font-family: var(--font-mono); font-size: 10px; font-weight: 800; color: #475569; background: #E2E8F0; padding: 2px 6px; border-radius: 4px;">
                      ${escapeHtml(contextTag)}
                    </span>
                  </td>
                  <td><span class="method-tag ${(r.method || 'post').toLowerCase()}">${escapeHtml(r.method || 'POST')}</span></td>
                  <td>
                    <span class="status-badge-mini ${isPass ? 's2xx' : 's4xx'}">
                      HTTP ${status}
                    </span>
                  </td>
                  <td style="max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <span style="color: #64748B; font-size: 10px; margin-right: 6px;">${escapeHtml(r.url || '')}</span>
                    <span>${escapeHtml(preview)}</span>
                  </td>
                  <td style="text-align: center;">
                    <span style="color: #0A6563; font-weight: 800; font-size: 11px;">
                      ${isSelected ? 'Close' : 'Open'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="6" style="text-align: center; padding: 24px; color: #64748B;">
                  No requests match the filter criteria.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- Collapsible Request Inspector Drawer -->
      ${inspectedItem ? `
        <div class="inspector-drawer">
          <div class="inspector-drawer-header">
            <div class="inspector-title">
              <span>Transaction #${inspectedItem.index + 1} Inspection</span>
              ${inspectedItem.stageNum ? `<span style="font-family: var(--font-mono); font-size: 10.5px; color: #38BDF8; font-weight: 800;">Stage ${inspectedItem.stageNum}</span>` : ''}
              ${inspectedItem.cycleNum ? `<span style="font-family: var(--font-mono); font-size: 10.5px; color: #38BDF8; font-weight: 800;">Cycle ${inspectedItem.cycleNum}</span>` : ''}
              <span class="status-badge-mini ${inspectedItem.isPass ? 's2xx' : 's4xx'}">
                HTTP ${inspectedItem.status || 200}
              </span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-copy-code" onclick="window.copyToClipboard('${encodeURIComponent(JSON.stringify(inspectedItem, null, 2))}', 'Full Transaction')">
                Copy Full JSON
              </button>
              <button class="btn-copy-code" style="background: rgba(239, 68, 68, 0.2);" onclick="window.toggleRequestInspection(null)">
                &times; Close
              </button>
            </div>
          </div>

          <div style="font-family: var(--font-mono); font-size: 11px; color: #94A3B8; margin-bottom: 8px;">
            <b>Endpoint:</b> <span style="color: #F8FAFC;">${escapeHtml(inspectedItem.url || '')}</span> &bull; 
            <b>Method:</b> <span style="color: #F8FAFC;">${escapeHtml(inspectedItem.method || 'POST')}</span>
            ${inspectedItem.conditionresult ? ` &bull; <b>Condition:</b> <span style="color: ${inspectedItem.conditionresult[0] === 1 ? '#4ADE80' : '#F87171'};">${inspectedItem.conditionresult[0] === 1 ? 'Met (Pass)' : 'Failed'}</span>` : ''}
          </div>

          <div class="inspector-grid">
            <!-- Left: Sent Request -->
            <div class="inspector-pane">
              <div class="inspector-pane-title">
                <span>Request Headers &amp; Sent Payload</span>
                <button class="btn-copy-code" onclick="window.copyToClipboard('${encodeURIComponent(JSON.stringify(inspectedItem.request || {}, null, 2))}', 'Request Data')">
                  Copy
                </button>
              </div>
              <div class="json-code-box">
                ${highlightJson(inspectedItem.request || { headers: { "Content-Type": "application/json" }, data: {} })}
              </div>
            </div>

            <!-- Right: Received Response -->
            <div class="inspector-pane">
              <div class="inspector-pane-title">
                <span style="color: #4ADE80;">Response Headers &amp; Body</span>
                <button class="btn-copy-code" onclick="window.copyToClipboard('${encodeURIComponent(JSON.stringify(inspectedItem.data || {}, null, 2))}', 'Response Body')">
                  Copy
                </button>
              </div>
              <div class="json-code-box">
                ${highlightJson(inspectedItem.data !== undefined ? inspectedItem.data : inspectedItem)}
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Search input live event
  const searchInput = document.getElementById('diagSearchInput');
  if (searchInput) {
    if (visualizerState.diagnosticsSearch && typeof searchInput.focus === 'function') {
      searchInput.focus();
      try {
        const len = searchInput.value.length;
        if (typeof searchInput.setSelectionRange === 'function') {
          searchInput.setSelectionRange(len, len);
        }
      } catch (err) {}
    }

    searchInput.addEventListener('input', (e) => {
      visualizerState.diagnosticsSearch = e.target.value;
      renderActiveMetric();
    });
  }
}

/* ==========================================================================
   CLIPBOARD & SYNTAX HIGHLIGHTING UTILITIES
   ========================================================================== */
window.copyToClipboard = function(encoded, label = 'JSON') {
  const text = decodeURIComponent(encoded);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      window.showInfoBox?.({
        type: 'success',
        title: 'Copied',
        message: `${label} copied to clipboard!`,
        duration: 2500
      });
    }).catch(() => fallbackCopy(text, label));
  } else {
    fallbackCopy(text, label);
  }
};

function fallbackCopy(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  window.showInfoBox?.({
    type: 'success',
    title: 'Copied',
    message: `${label} copied to clipboard!`,
    duration: 2500
  });
}

function highlightJson(jsonObj) {
  if (jsonObj === undefined || jsonObj === null) return '<span class="json-null">null</span>';
  let jsonStr = '';
  try {
    jsonStr = typeof jsonObj === 'string' ? jsonObj : JSON.stringify(jsonObj, null, 2);
  } catch (e) {
    jsonStr = String(jsonObj);
  }

  return escapeHtml(jsonStr)
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
}

function getStatusCodesDistribution(summary, resultList) {
  if (summary?.statusCodes && Object.keys(summary.statusCodes).length > 0) {
    return summary.statusCodes;
  }
  const dist = {};
  if (Array.isArray(resultList)) {
    resultList.forEach(r => {
      const code = String(r.status || (r.response?.status) || 200);
      dist[code] = (dist[code] || 0) + 1;
    });
  }
  return dist;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
