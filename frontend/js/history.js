/**
 * ==========================================================================
 * RUN HISTORY & A/B COMPARATOR CONTROLLER (Pure Vanilla ES6)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const historyListEl = document.getElementById('historyList');
  const selectRunA = document.getElementById('selectRunA');
  const selectRunB = document.getElementById('selectRunB');
  const btnOpenResult = document.getElementById('btnOpenResult');

  // Load history from safeStorage
  const historyStr = window.safeStorage.getItem('test_runs_history') || '[]';
  let history = JSON.parse(historyStr);

  // If empty, generate two sample benchmark historical runs
  if (!history || history.length < 2) {
    history = [
      {
        id: 'run_baseline_1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        mode: 'CONCURRENCY',
        result: {
          metrics: {
            latency: { count: 500, averageMs: 38, p50: 34, p99: 110 },
            summary: { totalRequestsPassed: 500, totalRequestsFailed: 0 },
            dataprocessed: { sent: 180000, received: 680000 }
          }
        }
      },
      {
        id: 'run_peak_2',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        mode: 'CONCURRENCY',
        result: {
          metrics: {
            latency: { count: 500, averageMs: 44, p50: 39, p99: 310 },
            summary: { totalRequestsPassed: 492, totalRequestsFailed: 8 },
            dataprocessed: { sent: 190000, received: 710000 },
            cycles: [
              { requestcyclenum: 1, batchsize: 50, currentConcurrency: 50, totalrequestssent: 50, successfulrequests: 50, totalrequestfailed: 0 },
              { requestcyclenum: 2, batchsize: 100, currentConcurrency: 100, totalrequestssent: 100, successfulrequests: 100, totalrequestfailed: 0 },
              { requestcyclenum: 3, batchsize: 150, currentConcurrency: 150, totalrequestssent: 150, successfulrequests: 148, totalrequestfailed: 2 },
              { requestcyclenum: 4, batchsize: 200, currentConcurrency: 200, totalrequestssent: 200, successfulrequests: 194, totalrequestfailed: 6 }
            ]
          },
          data: {
            diagnostics: [{ status: 504, data: "Gateway Timeout" }]
          }
        }
      }
    ];
    window.safeStorage.setItem('test_runs_history', JSON.stringify(history));
  }

  // Render Run List
  renderHistoryList(history);

  // Populate Selectors
  populateSelectors(history);

  // Initial Delta Comparison
  updateComparison(history);

  selectRunA.addEventListener('change', () => updateComparison(history));
  selectRunB.addEventListener('change', () => updateComparison(history));

  btnOpenResult.addEventListener('click', () => {
    const selectedId = selectRunA.value;
    const run = history.find(h => h.id === selectedId);
    if (run && run.result) {
      window.appState.saveResult(run.result);
      window.safeStorage.setItem('unseen_results_count', '0');
      window.location.href = 'result.html';
    }
  });

  function renderHistoryList(runs) {
    historyListEl.innerHTML = '';

    runs.forEach((r, idx) => {
      const card = document.createElement('div');
      card.className = 'history-entry-card';

      const metrics = r.result?.metrics || {};
      const latency = metrics.latency || {};
      const summary = metrics.summary || {};
      const total = latency.count || 500;
      const failed = summary.totalRequestsFailed || 0;
      const successPct = total > 0 ? (((total - failed) / total) * 100).toFixed(1) : '100.0';
      const avgSpeed = latency.averageMs || latency.average || 40;

      const dateStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      card.innerHTML = `
        <div class="history-entry-top">
          <span class="history-entry-mode ${r.mode}">${r.mode}</span>
          <span class="history-entry-time">${dateStr}</span>
        </div>
        <div class="history-entry-metrics">
          <span><b>${total}</b> Reqs</span> &bull; 
          <span style="color: ${failed > 0 ? '#DC2626' : '#16A34A'}"><b>${successPct}%</b> Pass</span> &bull;
          <span><b>${avgSpeed}ms</b> Avg</span>
        </div>
      `;

      card.addEventListener('click', () => {
        selectRunA.value = r.id;
        updateComparison(runs);
      });

      historyListEl.appendChild(card);
    });
  }

  function populateSelectors(runs) {
    selectRunA.innerHTML = '';
    selectRunB.innerHTML = '';

    runs.forEach((r, idx) => {
      const dateStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const optText = `Run #${runs.length - idx} (${r.mode} - ${dateStr})`;

      const optA = document.createElement('option');
      optA.value = r.id;
      optA.textContent = optText;
      selectRunA.appendChild(optA);

      const optB = document.createElement('option');
      optB.value = r.id;
      optB.textContent = optText;
      selectRunB.appendChild(optB);
    });

    if (runs.length >= 2) {
      selectRunA.selectedIndex = 0;
      selectRunB.selectedIndex = 1;
    }
  }

  function updateComparison(runs) {
    const idA = selectRunA.value;
    const idB = selectRunB.value;

    const runA = runs.find(r => r.id === idA);
    const runB = runs.find(r => r.id === idB);

    if (!runA || !runB) return;

    const latA = runA.result?.metrics?.latency?.averageMs || 40;
    const latB = runB.result?.metrics?.latency?.averageMs || 40;
    const deltaLat = latA - latB;

    const sumA = runA.result?.metrics?.summary || {};
    const sumB = runB.result?.metrics?.summary || {};
    const totA = runA.result?.metrics?.latency?.count || 500;
    const totB = runB.result?.metrics?.latency?.count || 500;
    const failA = sumA.totalRequestsFailed || 0;
    const failB = sumB.totalRequestsFailed || 0;

    const succPctA = ((totA - failA) / totA) * 100;
    const succPctB = ((totB - failB) / totB) * 100;
    const deltaSucc = (succPctA - succPctB).toFixed(1);

    const deltaReq = totA - totB;
    const deltaFail = failA - failB;

    document.getElementById('deltaLatency').innerHTML = formatDelta(deltaLat, 'ms', true);
    document.getElementById('deltaSuccess').innerHTML = formatDelta(deltaSucc, '%', false);
    document.getElementById('deltaRequests').innerHTML = formatDelta(deltaReq, ' reqs', false);
    document.getElementById('deltaErrors').innerHTML = formatDelta(deltaFail, ' errors', true);
  }

  function formatDelta(val, unit, lowerIsBetter) {
    const num = Number(val);
    if (num === 0) return `<span class="delta-value neutral">0${unit}</span>`;
    const sign = num > 0 ? `+${num}` : `${num}`;
    const isGood = lowerIsBetter ? num < 0 : num > 0;
    const cls = isGood ? 'positive' : 'negative';
    return `<span class="delta-value ${cls}">${sign}${unit}</span>`;
  }
});
