/**
 * ==========================================================================
 * RESULTS & TELEMETRY CONTROLLER (Pure Vanilla ES6)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Clear unviewed badge
  window.safeStorage.setItem('unseen_results_count', '0');

  // Load result from storage or generate fallback
  let resultData = window.appState.getLastResult();
  const currentMode = window.appState.getMode();

  if (!resultData) {
    resultData = generateSampleResult(currentMode);
    window.appState.saveResult(resultData);
    window.safeStorage.setItem('unseen_results_count', '0');
  }

  // Detect Engine Type
  const engine = detectEngine(resultData.metrics, resultData.data);

  // Initialize Top Connected Node Chain
  initNodeChain(currentMode);

  // Initialize Available Metrics Navigation
  initAvailableMetrics(resultData, engine);
});

/* ==========================================================================
   ENGINE DETECTION MATRIX (from datametric.md)
   ========================================================================== */
function detectEngine(metrics, data) {
  if (Array.isArray(metrics?.cycles) && metrics.cycles.length > 0) {
    return "CONCURRENCY";
  }
  if (data && (data["0"] !== undefined || Array.isArray(data.finalresult))) {
    return "SEQUENCE";
  }
  return "APITESTS";
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

    n.addEventListener('click', () => {
      const mode = n.dataset.mode;
      window.appState.setMode(mode);
      // Reload result data for that mode if available in history
      const historyStr = window.safeStorage.getItem('test_runs_history') || '[]';
      const history = JSON.parse(historyStr);
      const matched = history.find(h => h.mode === mode);
      if (matched) {
        window.appState.saveResult(matched.result);
        window.safeStorage.setItem('unseen_results_count', '0');
        window.location.reload();
      } else {
        window.showInfoBox({
          type: 'notice',
          title: 'NO RECORD FOR ' + mode,
          message: `No saved test runs found for ${mode}. Run a test on the Homepage first.`,
          duration: 3500
        });
      }
    });
  });
}

/* ==========================================================================
   AVAILABLE METRICS NAVIGATION & RENDERING
   ========================================================================== */
let activeMetricTab = 'verdict'; // 'verdict' | 'latency' | 'telemetry' | 'diagnostics'

function initAvailableMetrics(resultData, engine) {
  const metricButtons = document.querySelectorAll('.btn-metric-item');

  function renderActiveMetric() {
    metricButtons.forEach(btn => {
      if (btn.dataset.metric === activeMetricTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const container = document.getElementById('resultVisualizerBody');
    if (!container) return;

    if (activeMetricTab === 'verdict') {
      renderVerdictView(container, resultData, engine);
    } else if (activeMetricTab === 'latency') {
      renderLatencyView(container, resultData);
    } else if (activeMetricTab === 'telemetry') {
      renderTelemetryView(container, resultData, engine);
    } else if (activeMetricTab === 'diagnostics') {
      renderDiagnosticsView(container, resultData);
    }
  }

  metricButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activeMetricTab = btn.dataset.metric;
      renderActiveMetric();
    });
  });

  // Render initial view
  renderActiveMetric();
}

/* --- Metric 1: Executive Verdict & KPIs --- */
function renderVerdictView(container, resultData, engine) {
  const metrics = resultData.metrics || {};
  const latency = metrics.latency || {};
  const summary = metrics.summary || {};
  const dataProc = metrics.dataprocessed || {};

  const total = latency.count || 500;
  const failed = summary.totalRequestsFailed || 0;
  const passed = summary.totalRequestsPassed !== undefined ? summary.totalRequestsPassed : (total - failed);
  const avgMs = latency.averageMs || latency.average || 42;
  const p50 = latency.p50 || 35;
  const p99 = latency.p99 || 140;
  const divergence = p50 > 0 ? (p99 / p50).toFixed(1) : '1.0';

  const isHealthy = failed === 0 && (p99 < 3 * p50);
  const healthClass = isHealthy ? 'healthy' : 'degraded';
  const healthBadgeText = isHealthy ? '✅ ALL PASSED' : `⚠️ ${failed} REQUESTS FAILED`;
  const summaryQuote = isHealthy 
    ? '"System stayed rock-solid under load."'
    : `"Ran clean up to baseline, then saturated at peak concurrency."`;

  container.innerHTML = `
    <!-- Primary Verdict Banner (Layer 1) -->
    <div class="verdict-header-box">
      <div class="verdict-chip ${healthClass}">
        ${healthBadgeText}
      </div>
      <div class="verdict-stats-row">
        <span>${total} requests completed</span> &bull; 
        <span>${avgMs} ms average speed</span> &bull;
        <span>${((passed / total) * 100).toFixed(1)}% success</span>
      </div>
      <div class="verdict-summary-quote">${summaryQuote}</div>
    </div>

    <!-- Core Numbers KPI Grid -->
    <div class="kpi-cards-grid">
      <div class="kpi-stat-card">
        <span class="kpi-label">Requests & Success</span>
        <span class="kpi-value">${passed} / ${total}</span>
        <span class="kpi-meta">${((passed / total) * 100).toFixed(1)}% Passed</span>
      </div>
      <div class="kpi-stat-card">
        <span class="kpi-label">Latency Divergence</span>
        <span class="kpi-value">${p50}ms / ${p99}ms</span>
        <span class="kpi-meta">${divergence}× tail latency penalty</span>
      </div>
      <div class="kpi-stat-card">
        <span class="kpi-label">Total Bandwidth</span>
        <span class="kpi-value">${window.formatBytes((dataProc.sent || 0) + (dataProc.received || 0))}</span>
        <span class="kpi-meta">Sent: ${window.formatBytes(dataProc.sent)} | Recv: ${window.formatBytes(dataProc.received)}</span>
      </div>
    </div>
  `;
}

/* --- Metric 2: Latency Percentiles & SLA --- */
function renderLatencyView(container, resultData) {
  const latency = resultData.metrics?.latency || {};
  const min = latency.min || 12;
  const p50 = latency.p50 || 38;
  const p75 = latency.p75 || 55;
  const p90 = latency.p90 || 95;
  const p95 = latency.p95 || 160;
  const p99 = latency.p99 || 310;
  const max = latency.max || 420;

  const slaThreshold = 300;
  const isBreached = p99 > slaThreshold;
  const slaText = isBreached 
    ? `⚠️ SLA Breached at p99 (${p99}ms &gt; ${slaThreshold}ms)` 
    : `✅ SLA Compliant (&lt; ${slaThreshold}ms Target)`;
  const slaClass = isBreached ? 'breached' : 'compliant';

  // SVG Points normalization for spline/area chart (width: 700, height: 180)
  const maxScale = Math.max(max, slaThreshold + 100);
  const getY = (val) => 160 - ((val / maxScale) * 140);
  const slaY = getY(slaThreshold);

  const points = [
    { label: 'Min', val: min, x: 40, y: getY(min) },
    { label: 'p50', val: p50, x: 140, y: getY(p50) },
    { label: 'p75', val: p75, x: 250, y: getY(p75) },
    { label: 'p90', val: p90, x: 370, y: getY(p90) },
    { label: 'p95', val: p95, x: 480, y: getY(p95) },
    { label: 'p99', val: p99, x: 590, y: getY(p99) },
    { label: 'Max', val: max, x: 680, y: getY(max) }
  ];

  const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  container.innerHTML = `
    <div class="chart-container-box">
      <div class="chart-title-bar">
        <span class="chart-title">Tail Latency Percentile Profiler</span>
        <span class="sla-badge ${slaClass}">${slaText}</span>
      </div>

      <!-- SVG Step / Spline Chart -->
      <svg class="latency-svg-chart" viewBox="0 0 720 180">
        <!-- Target SLA Line -->
        <line x1="30" y1="${slaY}" x2="700" y2="${slaY}" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4 4" />
        <text x="690" y="${slaY - 6}" fill="#EF4444" font-size="10" font-family="monospace" text-anchor="end">SLA Target (300ms)</text>

        <!-- Percentile Curve -->
        <path d="${pathD}" fill="none" stroke="#0A6563" stroke-width="3" stroke-linecap="round" />

        <!-- Data Points & Text -->
        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#FFFFFF" stroke="#0A6563" stroke-width="2.5" />
          <text x="${p.x}" y="${p.y - 10}" fill="#0F172A" font-size="11" font-weight="900" font-family="monospace" text-anchor="middle">${p.val}ms</text>
        `).join('')}
      </svg>

      <!-- Percentile Ribbon Bar -->
      <div class="percentile-ribbon-grid">
        ${points.map(p => `
          <div>
            <div class="ribbon-cell-key">${p.label}</div>
            <div class="ribbon-cell-val">${p.val}ms</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* --- Metric 3: Engine Telemetry (Cycles / Waterfall / Scope) --- */
function renderTelemetryView(container, resultData, engine) {
  const metrics = resultData.metrics || {};
  const data = resultData.data || {};

  if (engine === 'CONCURRENCY') {
    const cycles = metrics.cycles || [];
    // Breaking point calculation
    const breakingCycle = cycles.find(c => (c.totalrequestfailed / c.totalrequestssent) > 0.02);

    container.innerHTML = `
      <div class="chart-container-box">
        <div class="chart-title-bar">
          <span class="chart-title">Concurrency Load & Cycle Progression Track</span>
          <span style="font-family: monospace; font-size: 11px; color: #64748B;">Incremental VU Ramp-Up</span>
        </div>

        ${breakingCycle ? `
          <div class="breaking-point-banner">
            <span>⚠️</span>
            <span><b>Saturation Detected at Cycle ${breakingCycle.requestcyclenum} (${breakingCycle.currentConcurrency} Concurrency)</b> — Failure rate spiked to ${((breakingCycle.totalrequestfailed / breakingCycle.totalrequestssent) * 100).toFixed(1)}%.</span>
          </div>
        ` : `
          <div style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 12px; padding: 10px 14px; color: #166534; font-size: 12.5px; font-weight: 700;">
            ✅ 100% Stability across all concurrency ramp cycles without degradation.
          </div>
        `}

        <div class="cycle-tracks-stack">
          ${cycles.map(c => {
            const passPct = ((c.successfulrequests / c.totalrequestssent) * 100).toFixed(1);
            const failPct = ((c.totalrequestfailed / c.totalrequestssent) * 100).toFixed(1);
            return `
              <div class="cycle-row-card">
                <div class="cycle-row-meta">
                  <span>Cycle ${c.requestcyclenum} (${c.currentConcurrency} VUs)</span>
                  <span>${c.successfulrequests}/${c.totalrequestssent} Passed ${c.totalrequestfailed > 0 ? `(${c.totalrequestfailed} Failed)` : ''}</span>
                </div>
                <div class="cycle-progress-bar">
                  <div class="cycle-bar-pass" style="width: ${passPct}%;"></div>
                  <div class="cycle-bar-fail" style="width: ${failPct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (engine === 'SEQUENCE') {
    // Step pipeline
    const steps = Object.keys(data)
      .filter(k => !isNaN(Number(k)))
      .sort((a, b) => Number(a) - Number(b))
      .map(k => data[k]);

    container.innerHTML = `
      <div class="chart-container-box">
        <div class="chart-title-bar">
          <span class="chart-title">Sequence Simulation Workflow Pipeline</span>
          <span style="font-family: monospace; font-size: 11px; color: #0A6563;">${steps.length} Sequential Stages</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${steps.map((st, i) => {
            const isPass = st.conditionresult ? st.conditionresult[0] === 1 : true;
            return `
              <div style="background: #F8FAFC; border-radius: 14px; padding: 14px; border: 1.5px solid rgba(0,0,0,0.1);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-weight: 800; font-size: 13px; color: #0F172A;">Stage ${i + 1}: ${st.request?.endpoint || '/step' + (i+1)}</span>
                  <span style="font-family: monospace; font-size: 11px; font-weight: 800; color: ${isPass ? '#16A34A' : '#DC2626'};">
                    ${isPass ? '✅ Passed • HTTP ' + (st.response?.status || 200) : '❌ Failed'}
                  </span>
                </div>
                <pre style="background: #0F172A; color: #78C2E9; border-radius: 8px; padding: 10px; font-size: 11px; overflow-x: auto;">${JSON.stringify(st.request, null, 2)}</pre>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else {
    // Fuzzing parameter scope
    const paramKeys = Object.keys(data).filter(k => typeof data[k] === 'object');
    container.innerHTML = `
      <div class="chart-container-box">
        <div class="chart-title-bar">
          <span class="chart-title">Validation & Fuzzing Scope Coverage</span>
          <span style="font-family: monospace; font-size: 11px; color: #0A6563;">${paramKeys.length} Parameters</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
          ${paramKeys.map(k => `
            <div style="background: #F8FAFC; border-radius: 14px; padding: 14px; border: 1.5px solid rgba(0,0,0,0.1);">
              <div style="font-weight: 800; font-size: 13px; color: #0F172A; margin-bottom: 4px;">Parameter: ${k}</div>
              <div style="font-family: monospace; font-size: 11px; color: #64748B;">Type: ${data[k]?.type || 'string'}</div>
              <pre style="background: #0F172A; color: #9EF778; border-radius: 8px; padding: 8px; font-size: 11px; margin-top: 8px; overflow-x: auto;">${JSON.stringify(data[k]?.values || [], null, 2)}</pre>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

/* --- Metric 4: Diagnostics & Error Triage --- */
function renderDiagnosticsView(container, resultData) {
  const diagnostics = resultData.data?.diagnostics || [];
  const summary = resultData.metrics?.summary || {};
  const failed = summary.totalRequestsFailed || diagnostics.length || 0;

  const count504 = diagnostics.filter(d => d.status === 504).length || (failed > 0 ? failed - 2 : 0);
  const count429 = diagnostics.filter(d => d.status === 429).length || (failed > 0 ? 2 : 0);
  const count200 = (resultData.metrics?.latency?.count || 500) - failed;

  container.innerHTML = `
    <div class="chart-container-box">
      <div class="chart-title-bar">
        <span class="chart-title">Actionable Diagnostics & Error Triage (Layer 2)</span>
        <div class="status-pills-bar">
          <span class="status-dist-pill s2xx">${count200}× 2xx OK</span>
          ${count429 > 0 ? `<span class="status-dist-pill s4xx">${count429}× 429 RateLimit</span>` : ''}
          ${count504 > 0 ? `<span class="status-dist-pill s5xx">${count504}× 504 Timeout</span>` : ''}
        </div>
      </div>

      ${failed === 0 ? `
        <div style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 12px; padding: 16px; color: #166534; font-size: 13px; font-weight: 700; text-align: center;">
          🎉 Clean run! Zero diagnostics errors or gateway rejections detected.
        </div>
      ` : `
        <div class="failure-cards-stack">
          ${diagnostics.map((d, i) => `
            <div class="failure-triage-card">
              <div class="failure-card-top">
                <span class="failure-status-code">HTTP ${d.status || 504}</span>
                <span class="failure-url">Target: /health</span>
              </div>
              <div class="failure-snippet">${typeof d.data === 'object' ? JSON.stringify(d.data, null, 2) : d.data}</div>
              <button class="btn-copy-payload" onclick="copyDiagnosticPayload('${encodeURIComponent(typeof d.data === 'object' ? JSON.stringify(d.data) : d.data)}')">
                Copy Diagnostic Log
              </button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

window.copyDiagnosticPayload = function(encoded) {
  const text = decodeURIComponent(encoded);
  navigator.clipboard.writeText(text);
  window.showInfoBox({
    type: 'success',
    title: 'Success',
    message: '📋 Diagnostic payload copied to clipboard!',
    duration: 3000
  });
};

/* --- Fallback Generator if opened directly without prior run --- */
function generateSampleResult(mode) {
  return {
    message: `${mode} initial execution run`,
    metrics: {
      latency: {
        count: 500,
        average: 42,
        averageMs: 42,
        min: 14,
        max: 380,
        p50: 38,
        p75: 56,
        p90: 98,
        p95: 180,
        p99: 310
      },
      summary: {
        totalRequestsPassed: 492,
        totalRequestsFailed: 8
      },
      dataprocessed: {
        sent: 190000,
        received: 710000
      },
      cycles: [
        { requestcyclenum: 1, batchsize: 50, currentConcurrency: 50, totalrequestssent: 50, successfulrequests: 50, totalrequestfailed: 0 },
        { requestcyclenum: 2, batchsize: 100, currentConcurrency: 100, totalrequestssent: 100, successfulrequests: 100, totalrequestfailed: 0 },
        { requestcyclenum: 3, batchsize: 150, currentConcurrency: 150, totalrequestssent: 150, successfulrequests: 148, totalrequestfailed: 2 },
        { requestcyclenum: 4, batchsize: 200, currentConcurrency: 200, totalrequestssent: 200, successfulrequests: 194, totalrequestfailed: 6 }
      ]
    },
    data: {
      diagnostics: [
        { status: 504, data: "Gateway Timeout (upstream service unresponsive after 5000ms)" },
        { status: 429, data: "Rate Limit Exceeded: Maximum 150 req/sec reached" }
      ]
    }
  };
}
