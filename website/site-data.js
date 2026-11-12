/*
 * Central Site Data & Configuration
 *
 * DOWNLOADS CONFIGURATION (Single Source of Truth):
 * To change download links for all platforms at once, edit `downloadTemplate` below.
 * '<os>' is the placeholder and will automatically resolve to 'linux', 'windows', or 'macos'.
 * Example: 'https://github.com/Naseer-fez/APITestLab/releases/download/v1/apitestlab_<os>.zip'
 */
window.API_TEST_LAB_SITE_DATA = {
  // Singular point of change for all OS downloads:
  downloadTemplate: 'https://github.com/Naseer-fez/APITestLab/releases/download/v1/apitestlab_<os>.zip',

  getDownloadUrl(osKey) {
    const platform = this.platforms?.[osKey];
    const custom = platform?._downloadUrl;
    if (custom && custom.trim()) {
      return custom.trim().replace(/<os>/gi, platform?.osKey || osKey);
    }
    const template = this.downloadTemplate || '';
    if (template && template.trim()) {
      return template.trim().replace(/<os>/gi, platform?.osKey || osKey);
    }
    return '';
  },

  platforms: {
    linux: {
      name: 'Linux',
      osKey: 'linux',
      get downloadUrl() {
        return window.API_TEST_LAB_SITE_DATA?.getDownloadUrl('linux');
      }
    },
    windows: {
      name: 'Windows',
      osKey: 'windows',
      get downloadUrl() {
        return window.API_TEST_LAB_SITE_DATA?.getDownloadUrl('windows');
      }
    },
    macos: {
      name: 'Apple / macOS',
      osKey: 'macos',
      get downloadUrl() {
        return window.API_TEST_LAB_SITE_DATA?.getDownloadUrl('macos');
      }
    }
  },
  routes: {
    fuzzy: {
      name: 'Fuzzy',
      method: 'POST',
      path: '/api/apitests',
      fileUploadPath: '/api/apitests/file',
      tag: 'Input Validation & Boundary Testing',
      description: 'The Fuzzy testing endpoint evaluates the input validation, boundary handling, and fault tolerance of your target API. It systematically generates test permutations across diverse data types (integer, float, string, array, object, boolean) and numerical or string ranges. This verifies that your API gracefully handles malformed, missing, or boundary inputs with appropriate 4xx status codes without crashing or leaking stack traces.',
      useCase: 'The Fuzzy testing endpoint evaluates the input validation, boundary handling, and fault tolerance of your target API. It systematically generates test permutations across diverse data types (integer, float, string, array, object, boolean) and numerical or string ranges. This verifies that your API gracefully handles malformed, missing, or boundary inputs with appropriate 4xx status codes without crashing or leaking stack traces.',
      testingProcess: [
        '<strong>1. Define Target & Mode:</strong> Set <code>link</code> to your target server, optional <code>endpoint</code> path, HTTP <code>method</code> (GET, POST, PUT, DELETE — default GET), and total <code>requests</code> count (default 100).',
        '<strong>2. Specify Field Schemas in <code>data</code>:</strong> Add target parameter keys. For each key, define <code>type</code> ("int", "float", "string", "array", "object", "boolean"). Optionally provide explicit test values via <code>values: [...]</code> or generation intervals via <code>range: [start, end, step]</code>.',
        '<strong>3. Health Check Fallback:</strong> If <code>data</code> is left empty, a single lightweight health check ping is dispatched to verify target availability.',
        '<strong>4. Analyze Performance & Diagnostics:</strong> The test runner executes permutations and returns comprehensive metrics including latency distribution (min, max, average, p50, p90, p95, p99), success/failure rates, byte throughput, and iteration diagnostics.'
      ],
      howCalled: 'Send a POST request to /api/apitests with a JSON payload defining your target link, method, request count, and schema definitions in the data object.',
      nodeCode: `// Node.js (v18+) - Calling the Fuzzy Testing Endpoint
const runFuzzyTest = async () => {
  const testLabUrl = 'http://localhost:3000/api/apitests';

  const payload = {
    link: 'http://localhost:3000/tests/sampleendpoint',
    endpoint: '/apitest',
    endpointavailable: true,
    method: 'POST',
    requests: 50,
    headers: {
      'Content-Type': 'application/json'
    },
    // Define field rules: type, test values, or generation ranges
    data: {
      name: {
        type: 'string',
        values: ['Alice', 'Bob', '12345', '']
      },
      age: {
        type: 'int',
        range: [18, 65, 10]
      },
      salary: {
        type: 'float',
        range: [30000.0, 90000.0, 15000.0]
      },
      tags: {
        type: 'array'
      }
    }
  };

  try {
    const response = await fetch(testLabUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Message:', result.message);
    console.log('Latency Metrics:', result.metrics?.latency);
    console.log('Summary:', result.metrics?.summary);
  } catch (error) {
    console.error('Fuzzy test execution failed:', error.message);
  }
};

runFuzzyTest();`,
      response: `{
  "message": "API Test completed successfully",
  "metrics": {
    "latency": {
      "count": 50,
      "average": 14.82,
      "averageMs": 14.82,
      "min": 4.1,
      "max": 38.6,
      "p50": 12.4,
      "p90": 24.1,
      "p95": 29.8,
      "p99": 38.6
    },
    "summary": {
      "totalRequestsSent": 50,
      "successfulRequests": 48,
      "totalRequestsFailed": 2,
      "successRate": 96.0,
      "failureRate": 4.0
    },
    "dataprocessed": {
      "sent": 6120,
      "received": 14850
    },
    "cycles": []
  },
  "data": {
    "result": [
      { "status": 200, "count": 48 },
      { "status": 400, "count": 2 }
    ],
    "diagnostics": [
      {
        "iteration": 4,
        "input": { "name": "", "age": 18, "salary": 30000 },
        "status": 400,
        "note": "Missing or empty required field"
      }
    ]
  }
}`,
      parameters: [
        { name: 'link', type: 'string', required: true, default: '—', description: 'The base URL of your target API server (e.g., http://localhost:3000/tests/sampleendpoint).' },
        { name: 'endpoint', type: 'string', required: false, default: '""', description: 'Path appended to link to form the full URL. Useful when testing multiple endpoints on the same server without retyping the base URL.' },
        { name: 'endpointavailable', type: 'boolean', required: false, default: 'false', description: 'Set to true when endpoint is provided. If false or omitted, link is used as the complete URL.' },
        { name: 'method', type: 'string', required: false, default: '"GET"', description: 'HTTP method to use: GET, POST, PUT, DELETE, or PATCH. Auto-uppercased. GET converts all data fields into URL query parameters automatically.' },
        { name: 'requests', type: 'number', required: false, default: '1000', description: 'Total number of test requests to dispatch. Set to 0 or a negative number to auto-calculate based on all data permutations.' },
        { name: 'headers', type: 'object', required: false, default: '{"Content-Type":"application/json"}', description: 'Custom HTTP headers to send with each request. If omitted, defaults to JSON content type. Do not send sensitive credentials here — rotate tokens between tests.' },
        { name: 'data', type: 'object', required: false, default: '—', description: 'Field schema definitions object. Each key represents a parameter name and maps to a schema object with type, values, and range. If empty or omitted, a single health-check ping is sent instead.' },
        { name: 'data[key].type', type: 'string', required: true, default: '—', description: 'The data type for this field. Valid types: "int", "float", "string", "array", "object", "boolean". Controls how test values are generated and sent.' },
        { name: 'data[key].values', type: 'array', required: false, default: 'auto-generated', description: 'Explicit list of test values to use. If omitted, default values for the declared type are auto-generated. Example: ["Alice", "Bob", ""].' },
        { name: 'data[key].range', type: 'array', required: false, default: '[]', description: 'Value generation range as [start, end, step]. Works for int, float, and string (character codes). Supports 2D/3D nested arrays — all are flattened to 1D before use.' },
        { name: 'fileavailable', type: 'boolean', required: false, default: 'false', description: 'Set to true to enable file upload mode. When true, the system expects a file to be provided (via multipart upload or filepath in data). Raises an error if no file is found.' }
      ],
      curlExample: `curl -X POST http://localhost:3000/api/apitests \\
  -H "Content-Type: application/json" \\
  -d '{
    "link": "http://your-api.com",
    "endpoint": "/users",
    "endpointavailable": true,
    "method": "POST",
    "requests": 50,
    "data": {
      "name": { "type": "string", "values": ["Alice", "Bob", ""] },
      "age": { "type": "int", "range": [1, 100, 25] }
    }
  }'`,
      errorResponses: [
        { status: 404, description: 'No valid link provided in the request body. The "link" field is required and must be a valid URL.' },
        { status: 400, description: 'Invalid HTTP method specified. Allowed methods: GET, POST, PUT, DELETE, PATCH.' },
        { status: 401, description: 'A field in the data object has an invalid or missing "type". Valid types: int, float, string, array, object, boolean.' },
        { status: 400, description: 'fileavailable is set to true but no file was provided via upload or filepath.' }
      ],
      responseFields: [
        { field: 'message', type: 'string', description: 'Human-readable result summary (e.g., "API Test completed successfully").' },
        { field: 'metrics.latency.count', type: 'number', description: 'Total number of requests measured for latency.' },
        { field: 'metrics.latency.average', type: 'number', description: 'Mean latency across all requests in milliseconds.' },
        { field: 'metrics.latency.min / max', type: 'number', description: 'Fastest and slowest individual request latencies (ms).' },
        { field: 'metrics.latency.p50 / p90 / p95 / p99', type: 'number', description: 'Percentile latencies — p50 is the median, p99 captures tail latency.' },
        { field: 'metrics.summary.totalRequestsSent', type: 'number', description: 'Total requests dispatched during the test.' },
        { field: 'metrics.summary.successfulRequests', type: 'number', description: 'Count of requests that received a 2xx response.' },
        { field: 'metrics.summary.totalRequestsFailed', type: 'number', description: 'Count of requests that returned non-2xx or errored out.' },
        { field: 'metrics.summary.successRate / failureRate', type: 'number', description: 'Percentage of successful vs failed requests.' },
        { field: 'metrics.dataprocessed.sent / received', type: 'number', description: 'Total bytes sent to and received from the target server.' },
        { field: 'data.result', type: 'array', description: 'Grouped status code breakdown — each entry has a status code and count of requests that returned it.' },
        { field: 'data.diagnostics', type: 'array', description: 'Detailed failure information — includes the iteration number, the exact input sent, the status returned, and a diagnostic note.' }
      ],
      notes: [
        'If the data object is empty or omitted entirely, a single lightweight health-check ping is dispatched to verify the target is reachable.',
        'GET requests automatically convert all data fields into URL query parameters instead of sending a JSON body.',
        'The range field supports nested arrays (2D/3D) which are flattened to 1D before test execution — useful for covering multiple sub-ranges in one definition.',
        'Do not include sensitive credentials (API keys, tokens) directly in headers — rotate or regenerate between test runs where possible.',
        'No fuzzy matching is performed on data keys — field names must exactly match what your target API expects.',
        'The file upload variant is available at /api/apitests/file using multipart/form-data with the field name "file". You can upload multiple files in a single request.'
      ]
    },
    concurrency: {
      name: 'Concurrency',
      method: 'POST',
      path: '/api/concurrencetest',
      fileUploadPath: '/api/concurrencetest/file',
      tag: 'Load, Throughput & Stress Testing',
      description: 'The Concurrency testing endpoint stresses your target service under high parallel loads to measure raw throughput, latency degradation, and breaking thresholds. Unlike fuzzy validation, it repeatedly fires a valid payload to observe how server resources (event loop, thread pool, database connections) behave under concurrent demand and traffic spikes.',
      useCase: 'The Concurrency testing endpoint stresses your target service under high parallel loads to measure raw throughput, latency degradation, and breaking thresholds. Unlike fuzzy validation, it repeatedly fires a valid payload to observe how server resources (event loop, thread pool, database connections) behave under concurrent demand and traffic spikes.',
      testingProcess: [
        '<strong>1. Base Request Definition:</strong> Provide <code>link</code>, target <code>endpoint</code>, HTTP <code>method</code>, and a single valid request payload in <code>bodytosend</code> (or query params for GET).',
        '<strong>2. Load Profile Configuration in <code>data</code>:</strong> Configure <code>requests</code> (total requests, default 100), <code>concurency</code> (in-flight simultaneous workers, e.g. 50), <code>increment</code> (concurrency ramp-up rate per cycle), <code>interval</code> (cycle cooldown in ms, e.g. 1000), and <code>timeout</code> (maximum wait time before marking crash, e.g. 50000 ms).',
        '<strong>3. Large File Streaming:</strong> Enable <code>blobmode: true</code> if sending large files to stream chunks directly via Blob without overloading system RAM.',
        '<strong>4. Cycle Breakdown & Percentile Latencies:</strong> Inspect cycle-by-cycle metrics including active concurrency, batch sizes, success/failure counts, and p50/p90/p95/p99 latency percentiles to detect performance degradation.'
      ],
      howCalled: 'Send a POST request to /api/concurrencetest with target endpoint details in bodytosend and execution limits (requests, concurency, increment, interval, timeout) in data.',
      nodeCode: `// Node.js (v18+) - Calling the Concurrency Testing Endpoint
const runConcurrencyTest = async () => {
  const testLabUrl = 'http://localhost:3000/api/concurrencetest';

  const payload = {
    link: 'http://localhost:3000/tests/sampleendpoint',
    endpoint: '/health',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    // Single valid body dispatched repeatedly to measure load
    bodytosend: {
      action: 'process_transaction',
      amount: 199.99,
      currency: 'USD'
    },
    // Concurrency engine configuration
    data: {
      requests: 200,      // Total requests to dispatch
      concurency: 20,     // Simultaneous worker requests
      increment: 10,      // Step-up concurrency increase per cycle
      interval: 500,      // Cooldown between cycles in ms
      timeout: 30000      // Timeout per request in ms
    }
  };

  try {
    const response = await fetch(testLabUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Summary:', result.metrics?.summary);
    console.log('Latency (p95):', result.metrics?.latency?.p95, 'ms');
    console.log('Cycle Breakdown:', result.metrics?.cycles);
  } catch (error) {
    console.error('Concurrency test execution failed:', error.message);
  }
};

runConcurrencyTest();`,
      response: `{
  "message": "Concurrency test completed successfully",
  "metrics": {
    "latency": {
      "count": 200,
      "average": 42.6,
      "averageMs": 42.6,
      "min": 11.2,
      "max": 184.5,
      "p50": 34.0,
      "p90": 78.5,
      "p95": 92.1,
      "p99": 142.0
    },
    "summary": {
      "totalRequestsSent": 200,
      "successfulRequests": 200,
      "totalRequestsFailed": 0,
      "successRate": 100.0,
      "failureRate": 0.0
    },
    "dataprocessed": {
      "sent": 18400,
      "received": 24800
    },
    "cycles": [
      {
        "requestcyclenum": 1,
        "batchsize": 50,
        "currentConcurrency": 20,
        "totalrequestssent": 50,
        "successfulrequests": 50,
        "totalrequestfailed": 0
      },
      {
        "requestcyclenum": 2,
        "batchsize": 50,
        "currentConcurrency": 30,
        "totalrequestssent": 50,
        "successfulrequests": 50,
        "totalrequestfailed": 0
      }
    ]
  },
  "data": {
    "status": "PASS"
  }
}`,
      parameters: [
        { name: 'link', type: 'string', required: true, default: '—', description: 'The base URL of your target API server.' },
        { name: 'endpoint', type: 'string', required: false, default: '""', description: 'Path appended to link to form the full URL.' },
        { name: 'endpointavailable', type: 'boolean', required: false, default: 'false', description: 'Set to true when endpoint is provided.' },
        { name: 'method', type: 'string', required: false, default: '"POST"', description: 'HTTP method: GET, POST, PUT, DELETE, or PATCH. Default is POST for concurrency tests.' },
        { name: 'headers', type: 'object', required: false, default: '{"Content-Type":"application/json"}', description: 'Custom HTTP headers. Defaults to JSON content type if omitted.' },
        { name: 'bodytosend', type: 'object', required: false, default: '{}', description: 'The single valid request payload that gets repeated for every request. Unlike Fuzzy testing, this is one fixed body sent identically each time to measure pure load handling.' },
        { name: 'data.requests', type: 'number', required: false, default: '10000', description: 'Total number of requests to dispatch across all cycles.' },
        { name: 'data.concurency', type: 'number', required: false, default: '100', description: 'Number of simultaneous in-flight requests at any given moment. This controls how many parallel workers are active.' },
        { name: 'data.increment', type: 'number', required: false, default: '10', description: 'Concurrency ramp-up rate — how many additional parallel workers are added after each cycle completes.' },
        { name: 'data.interval', type: 'number', required: false, default: '1000', description: 'Cooldown period between cycles in milliseconds. Gives the target server breathing room between load bursts.' },
        { name: 'data.timout', type: 'number', required: false, default: '50000', description: 'Maximum wait time (ms) for a single request before marking it as timed out / crashed.' },
        { name: 'data.isfile', type: 'number', required: false, default: '0', description: 'Set to 1 to enable file sending. When enabled, the server looks for the file and raises an error if not found.' },
        { name: 'data.filepath', type: 'string', required: false, default: '""', description: 'Absolute or relative path to the file to send with each request (when isfile is enabled).' },
        { name: 'data.filekey', type: 'string', required: false, default: '"file"', description: 'The form field name used when uploading the file to your target API.' },
        { name: 'blobmode', type: 'boolean', required: false, default: 'false', description: 'When true, streams the file as Blob chunks instead of loading the entire file into RAM. Recommended for large files (>10MB).' }
      ],
      curlExample: `curl -X POST http://localhost:3000/api/concurrencetest \\
  -H "Content-Type: application/json" \\
  -d '{
    "link": "http://your-api.com",
    "endpoint": "/health",
    "method": "POST",
    "bodytosend": {
      "action": "process",
      "amount": 99.99
    },
    "data": {
      "requests": 200,
      "concurency": 20,
      "increment": 10,
      "interval": 500,
      "timout": 30000
    }
  }'`,
      errorResponses: [
        { status: 400, description: 'Invalid body format — the request body must be a valid JSON object, not an array or primitive.' },
        { status: 400, description: 'No link provided. The "link" field is required and must point to your target server.' },
        { status: 400, description: 'Invalid HTTP method. Allowed: GET, POST, PUT, DELETE, PATCH.' },
        { status: 400, description: 'Invalid value for a data config key (requests, concurency, increment, interval, timout). All must be positive numbers.' },
        { status: 400, description: 'isfile is enabled but filepath is empty or the file was not found at the specified path.' }
      ],
      responseFields: [
        { field: 'message', type: 'string', description: 'Human-readable result summary.' },
        { field: 'metrics.latency.*', type: 'number', description: 'Latency statistics: count, average, min, max, and percentiles (p50, p90, p95, p99) in milliseconds.' },
        { field: 'metrics.summary.totalRequestsSent', type: 'number', description: 'Total requests dispatched across all cycles.' },
        { field: 'metrics.summary.successfulRequests', type: 'number', description: 'Count of requests that returned a 2xx status.' },
        { field: 'metrics.summary.totalRequestsFailed', type: 'number', description: 'Count of requests that failed, timed out, or returned non-2xx.' },
        { field: 'metrics.summary.successRate / failureRate', type: 'number', description: 'Percentage breakdown of successful vs failed requests.' },
        { field: 'metrics.dataprocessed.sent / received', type: 'number', description: 'Total bytes transferred to and from the target server.' },
        { field: 'metrics.cycles', type: 'array', description: 'Per-cycle breakdown showing: requestcyclenum (cycle index), batchsize (requests in this cycle), currentConcurrency (active parallel workers), and success/failure counts for that cycle.' },
        { field: 'data.status', type: 'string', description: 'Overall test result — "PASS" if all requests succeeded.' }
      ],
      notes: [
        'Unlike Fuzzy testing, Concurrency sends the same bodytosend payload every time — the goal is to measure load handling, not input validation.',
        'The concurrency engine ramps up workers: it starts at data.concurency workers, then adds data.increment more workers after each cycle.',
        'Set data.interval to give the target server cooldown time between cycles — helps distinguish sustained load from burst load behavior.',
        'Use blobmode: true when sending large files (>10MB) to avoid loading the entire file into Node.js memory.',
        'The file upload variant is available at /api/concurrencetest/file using multipart/form-data with the field name "file".',
        'Monitor the cycles array in the response to identify the exact concurrency level where your server starts degrading or failing.'
      ]
    },
    sequence: {
      name: 'Sequence',
      method: 'POST',
      path: '/api/sequencetest',
      fileUploadPath: '/api/sequencetest/file',
      sseEventsPath: '/api/sequencetest/events/:jobid',
      tag: 'Multi-Step Workflow & State Simulation',
      description: 'The Sequence testing endpoint executes stateful, multi-step API simulation pipelines. Each step runs in strict sequence where dynamic data, extracted IDs, and authorization tokens from previous responses are passed into subsequent requests. This allows end-to-end simulation of real user journeys like registration -> login -> token extraction -> authenticated transaction.',
      useCase: 'The Sequence testing endpoint executes stateful, multi-step API simulation pipelines. Each step runs in strict sequence where dynamic data, extracted IDs, and authorization tokens from previous responses are passed into subsequent requests. This allows end-to-end simulation of real user journeys like registration -> login -> token extraction -> authenticated transaction.',
      testingProcess: [
        '<strong>1. Pipeline Definition:</strong> Provide an ordered <code>request</code> array where each element represents an individual step in the workflow.',
        '<strong>2. Step Options & Persistence:</strong> Set <code>link</code>, <code>endpoint</code>, <code>method</code>, <code>data</code>, and flags: <code>storeheader: true</code> to capture response headers, <code>storedata: true</code> to capture response body JSON, and <code>expectedstatus: 200</code> to validate outcomes.',
        '<strong>3. Dynamic Conditions & Extraction:</strong> In <code>conditions.if</code>, specify match criteria like <code>condition: "{{response.status}} == 200"</code>. Map extracted fields into state variables via <code>data: { token: "{{response.data.token}}" }</code> and inject downstream headers via <code>header: { Authorization: "Bearer {{response.data.token}}" }</code>.',
        '<strong>4. Downstream Interpolation:</strong> Reference extracted variables in subsequent steps using double curly braces (e.g. <code>{{Authorization}}</code>, <code>{{userId}}</code>) in URLs, headers, or body data.',
        '<strong>5. Live Event Streaming:</strong> Optionally stream real-time execution progress and checkpoints via the SSE events endpoint <code>/api/sequencetest/events/:jobid</code>.'
      ],
      howCalled: 'Send a POST request to /api/sequencetest with a request array containing chained step objects and condition-based variable extraction rules.',
      nodeCode: `// Node.js (v18+) - Calling the Sequence Testing Endpoint
const runSequenceTest = async () => {
  const testLabUrl = 'http://localhost:3000/api/sequencetest';

  const payload = {
    request: [
      {
        // Step 1: Authenticate and capture session token
        link: 'http://localhost:3000/tests',
        endpoint: '/auth/login',
        endpointavailable: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { username: 'dev_user', password: 'secretpassword' },
        storeheader: false,
        storedata: true,
        expectedstatus: 200,
        ignoreerrors: false,
        // Extract token and user ID into context variables
        conditions: {
          if: {
            condition: '{{response.status}} == 200',
            raisecheckpoint: true,
            data: {
              token: '{{response.data.token}}',
              userId: '{{response.data.user.id}}'
            },
            header: {
              Authorization: 'Bearer {{response.data.token}}'
            },
            overwritenextdata: true,
            overwriteheader: true
          }
        }
      },
      {
        // Step 2: Use captured token to fetch protected profile
        link: 'http://localhost:3000/tests',
        endpoint: '/users/profile',
        endpointavailable: true,
        method: 'GET',
        headers: {
          Authorization: '{{Authorization}}'
        },
        data: {},
        storedata: true,
        expectedstatus: 200,
        ignoreerrors: false
      }
    ]
  };

  try {
    const response = await fetch(testLabUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Sequence Results:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Sequence test execution failed:', error.message);
  }
};

runSequenceTest();`,
      response: `{
  "message": "Sequence test completed successfully",
  "success": "PASS",
  "metrics": {
    "totalSteps": 2,
    "completedSteps": 2,
    "failedSteps": 0,
    "totalDurationMs": 86.4,
    "checkpoints": [
      {
        "step": 1,
        "name": "login",
        "status": 200,
        "extracted": {
          "userId": "usr_94821",
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
        }
      },
      {
        "step": 2,
        "name": "profile",
        "status": 200,
        "extracted": {}
      }
    ]
  },
  "data": {
    "finalResponse": {
      "id": "usr_94821",
      "username": "dev_user",
      "email": "dev_user@example.com",
      "role": "developer"
    }
  }
}`,
      parameters: [
        { name: 'request', type: 'array', required: true, default: '—', description: 'Ordered array of step objects. Each object defines one request in the simulation pipeline. Steps execute strictly in order — step 2 waits for step 1 to complete.' },
        { name: 'request[].link', type: 'string', required: true, default: '—', description: 'Target server base URL for this step. If omitted in step 2+, the previous step\'s link is reused.' },
        { name: 'request[].endpoint', type: 'string', required: false, default: '""', description: 'Path appended to link. Useful when all steps hit the same server but different routes (e.g., /auth/login, /users/profile).' },
        { name: 'request[].endpointavailable', type: 'boolean', required: false, default: 'false', description: 'Set true when endpoint is provided. If false, link alone is the full URL.' },
        { name: 'request[].method', type: 'string', required: false, default: '"POST"', description: 'HTTP method for this step. Default is POST. GET auto-converts data to query parameters.' },
        { name: 'request[].headers', type: 'object', required: false, default: '{}', description: 'HTTP headers for this step. Can include dynamic variables from prior steps via {{}} syntax (e.g., Authorization: "Bearer {{response.data.token}}").' },
        { name: 'request[].data', type: 'object', required: false, default: '{}', description: 'Request body payload. For GET, converted to query params. Supports {{}} variable interpolation from prior step responses.' },
        { name: 'request[].storeheader', type: 'boolean', required: false, default: 'true (from step 1)', description: 'When true, stores response headers for use in subsequent steps. The first step\'s value becomes the global default.' },
        { name: 'request[].storedata', type: 'boolean', required: false, default: 'true (from step 1)', description: 'When true, stores response body data for extraction and use in subsequent steps.' },
        { name: 'request[].expectedstatus', type: 'number|array', required: false, default: '200', description: 'Expected HTTP status code(s). Can be a single number or an array of acceptable codes. Helps identify unexpected failures.' },
        { name: 'request[].ignoreerrors', type: 'boolean', required: false, default: 'false', description: 'When true, continues the pipeline even if this step fails. When false, a failure halts the entire sequence.' },
        { name: 'request[].fileavailable', type: 'boolean', required: false, default: 'false', description: 'Set true to attach a file to this step. The file is sourced from filedata, uploaded files, or filepath.' },
        { name: 'request[].filedata', type: 'object|string', required: false, default: '""', description: 'File data object or path for file upload steps. Contains type and value fields.' },
        { name: 'request[].bodykey', type: 'string', required: false, default: '"body"', description: 'The form field name your target API expects for the JSON body in multipart requests.' },
        { name: 'request[].filekey', type: 'string', required: false, default: '"file"', description: 'The form field name your target API expects for file uploads.' },
        { name: 'request[].conditions', type: 'object', required: false, default: '{}', description: 'Conditional logic block for extracting data, injecting headers, and controlling flow between steps. Contains if/elseif/else blocks.' },
        { name: 'conditions.if.condition', type: 'string', required: false, default: '—', description: 'Expression to evaluate using {{}} template syntax. Example: "{{response.status}} == 200". Operators: ==, ===, !=, !==, >, <, >=, <=.' },
        { name: 'conditions.if.raiseerror', type: 'boolean', required: false, default: 'false', description: 'When true, raises an error event if the condition is met. Use with ignoreerror to log but continue.' },
        { name: 'conditions.if.raisecheckpoint', type: 'boolean', required: false, default: 'false', description: 'When true, emits a checkpoint event (via SSE) for real-time progress monitoring.' },
        { name: 'conditions.if.data', type: 'object', required: false, default: '{}', description: 'Variables to extract from the response. Example: { token: "{{response.data.token}}" }. These become available in subsequent steps.' },
        { name: 'conditions.if.header', type: 'object', required: false, default: '{}', description: 'Headers to set for the next step. Example: { Authorization: "Bearer {{response.data.token}}" }.' },
        { name: 'conditions.if.overwritenextdata', type: 'boolean', required: false, default: 'true', description: 'When true, completely replaces the next step\'s data. When false, merges extracted data via template resolution.' },
        { name: 'conditions.if.overwriteheader', type: 'boolean', required: false, default: 'true', description: 'When true, completely replaces the next step\'s headers. When false, merges with existing headers.' },
        { name: 'conditions.if.message', type: 'string', required: false, default: '""', description: 'Optional message sent via SSE when this condition triggers — useful for streaming progress updates.' }
      ],
      curlExample: `curl -X POST http://localhost:3000/api/sequencetest \\
  -H "Content-Type: application/json" \\
  -d '{
    "request": [
      {
        "link": "http://your-api.com",
        "endpoint": "/auth/login",
        "endpointavailable": true,
        "method": "POST",
        "data": { "username": "admin", "password": "secret" },
        "storedata": true,
        "expectedstatus": 200,
        "conditions": {
          "if": {
            "condition": "{{response.status}} == 200",
            "raisecheckpoint": true,
            "data": { "token": "{{response.data.token}}" },
            "header": { "Authorization": "Bearer {{response.data.token}}" },
            "overwriteheader": true
          }
        }
      },
      {
        "link": "http://your-api.com",
        "endpoint": "/users/profile",
        "endpointavailable": true,
        "method": "GET",
        "headers": { "Authorization": "{{Authorization}}" },
        "expectedstatus": 200
      }
    ]
  }'`,
      errorResponses: [
        { status: 400, description: 'No body provided for the request. The request body must contain a "request" array with at least one step.' },
        { status: 400, description: 'Failed to parse a step\'s body — invalid link, missing required fields, or malformed data.' },
        { status: 400, description: 'Condition not met — an if/elseif/else condition failed and ignoreerrors is false, halting the pipeline.' },
        { status: 400, description: 'headeravailable is true but the header field is missing in the condition block.' },
        { status: 400, description: 'dataavailable is true but the data field is missing in the condition block.' }
      ],
      responseFields: [
        { field: 'message', type: 'string', description: 'Human-readable result — "Sequence test completed successfully" or the condition failure message.' },
        { field: 'metrics.totalSteps', type: 'number', description: 'Total number of steps defined in the request array.' },
        { field: 'metrics.completedSteps', type: 'number', description: 'Number of steps that executed successfully.' },
        { field: 'metrics.failedSteps', type: 'number', description: 'Number of steps that failed or were skipped due to errors.' },
        { field: 'metrics.totalDurationMs', type: 'number', description: 'Total wall-clock time for the entire sequence in milliseconds.' },
        { field: 'metrics.checkpoints', type: 'array', description: 'Array of checkpoint events emitted during execution — each has step index, name, status, and any extracted variables.' },
        { field: 'metrics.latency.*', type: 'number', description: 'Per-request latency breakdown (count, average, min, max, percentiles) across all steps.' },
        { field: 'metrics.summary.*', type: 'object', description: 'Aggregate success/failure counts and rates across all steps in the sequence.' },
        { field: 'data.finalResponse', type: 'object', description: 'The complete response body from the last step in the sequence.' }
      ],
      notes: [
        'The first step\'s storeheader, storedata, expectedstatus, and ignoreerrors values become the global defaults for all subsequent steps unless explicitly overridden.',
        'Use {{response.data.fieldname}} to extract values from the previous step\'s response body. Use {{response.status}} for the status code.',
        'Conditions support operators: == (loose equal), === (strict equal), != , !==, >, <, >=, <=. Nested conditions are not yet supported.',
        'The only valid reference prefixes in {{}} templates are: response (received response), header (sent headers), and data (sent body).',
        'If a step omits link, the previous step\'s link is reused. If endpoint is provided, it is appended to the inherited or current link.',
        'Live progress streaming is available via SSE at /api/sequencetest/events/:jobid — append ?jobid=<id> to the test request to enable it.',
        'Rate limiting should be disabled on your target server during sequence tests, since requests are sent strictly in order and rate limits can cause false failures.',
        'The file upload variant is available at /api/sequencetest/file using multipart/form-data with the field name "file".'
      ]
    },
    results: {
      name: 'Results & History',
      method: 'GET',
      path: '/api/results/:resultno',
      paginationPath: '/api/results/page/:pageno',
      tag: 'History & Performance Reporting',
      description: 'The Results API allows developers and CI/CD pipelines to query, filter, and inspect past test executions. Test metrics, status code distributions, latency percentiles, and failure diagnostics from Fuzzy, Concurrency, and Sequence runs are automatically recorded and queryable by result index or page.',
      useCase: 'Programmatically verify test outcomes in automated deployment pipelines, extract latency metrics for regression tracking, or inspect iteration diagnostics without accessing local log files.',
      testingProcess: [
        '<strong>1. Query by Result Number:</strong> Dispatch a GET request to <code>/api/results/:resultno</code> where <code>:resultno</code> is the 1-indexed run ID. Pass <code>resultno=0</code> to retrieve all stored records.',
        '<strong>2. Field-Level Filtering:</strong> Append query parameters such as <code>?metrics=true</code> or <code>?data=true</code> to isolate specific subsections of the execution report without downloading full payloads.',
        '<strong>3. Status Filtering:</strong> Filter history records by adding <code>?success=true</code> or <code>?failure=true</code> to isolate passing or failing test suites.',
        '<strong>4. Paginated History Browsing:</strong> Query <code>/api/results/page/:pageno</code> to retrieve past test records in manageable pages (5 records per page), returning total page counts and items.'
      ],
      howCalled: 'Send a GET request to /api/results/:resultno with optional query parameters to filter by success status, metrics, or diagnostic data.',
      nodeCode: `// Node.js (v18+) - Querying Test Results & History
const fetchTestResults = async () => {
  const resultId = 1; // 1-indexed, or 0 for all records
  const url = new URL(\`http://localhost:3000/api/results/\${resultId}\`);

  // Optional: filter by specific fields or success status
  // url.searchParams.append('success', 'true');
  // url.searchParams.append('metrics', 'true');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const data = await response.json();
    console.log('Result Status:', response.status);
    console.log('Execution Summary:', data.metrics?.summary || data);
  } catch (error) {
    console.error('Failed to fetch test results:', error.message);
  }
};

fetchTestResults();`,
      curlExample: `curl -X GET "http://localhost:3000/api/results/1" \\
  -H "Accept: application/json"

# Retrieve all history records:
curl -X GET "http://localhost:3000/api/results/0"

# Filter by success only:
curl -X GET "http://localhost:3000/api/results/1?success=true"

# Browse paginated history:
curl -X GET "http://localhost:3000/api/results/page/1"`,
      response: `{
  "message": "API Test completed successfully",
  "success": "PASS",
  "metrics": {
    "latency": {
      "count": 50,
      "average": 14.82,
      "min": 4.1,
      "max": 38.6,
      "p50": 12.4,
      "p90": 24.1,
      "p95": 29.8,
      "p99": 38.6
    },
    "summary": {
      "totalRequestsSent": 50,
      "successfulRequests": 48,
      "totalRequestsFailed": 2,
      "successRate": 96.0,
      "failureRate": 4.0
    },
    "dataprocessed": {
      "sent": 6120,
      "received": 14850
    }
  },
  "data": {
    "result": [
      { "status": 200, "count": 48 },
      { "status": 400, "count": 2 }
    ],
    "diagnostics": [
      {
        "iteration": 4,
        "input": { "name": "", "age": 18, "salary": 30000 },
        "status": 400,
        "note": "Missing or empty required field"
      }
    ]
  }
}`,
      parameters: [
        { name: 'resultno', type: 'integer (path param)', required: true, default: '—', description: 'The 1-indexed result number to retrieve. Use 0 to fetch all recorded history runs across all files.' },
        { name: 'pageno', type: 'integer', required: false, default: '—', description: 'The 1-based page number to retrieve. Each page contains up to five records.' },
        { name: 'success', type: 'boolean (query param)', required: false, default: '—', description: 'When provided (e.g. ?success=true), filters records to only include successful tests (PASS).' },
        { name: 'failure', type: 'boolean (query param)', required: false, default: '—', description: 'When provided (e.g. ?failure=true), filters records to only include failed tests (FAIL).' },
        { name: 'message', type: 'boolean (query param)', required: false, default: '—', description: 'When specified, isolates and returns only the message field from the record.' },
        { name: 'metrics', type: 'boolean (query param)', required: false, default: '—', description: 'When specified, isolates and returns only the metrics object from the record.' },
        { name: 'data', type: 'boolean (query param)', required: false, default: '—', description: 'When specified, isolates and returns only the raw payload and diagnostic data.' }
      ],
      errorResponses: [
        { status: 400, description: 'Missing resultno or invalid integer format (must be a positive integer or 0).' },
        { status: 400, description: 'Invalid page number — pageno is out of the valid range (1 to totalPages).' },
        { status: 400, description: 'Invalid query field specified in filter request.' },
        { status: 404, description: 'Record not found — the requested result number does not exist in history.' },
        { status: 404, description: 'History file is empty or no test runs have been recorded yet.' }
      ],
      responseFields: [
        { field: 'message', type: 'string', description: 'Outcome summary string from the test execution.' },
        { field: 'success', type: 'string', description: 'Overall test status ("PASS" or "FAIL").' },
        { field: 'metrics', type: 'object', description: 'Aggregated performance metrics including latency percentiles, summary counts, and byte transfer metrics.' },
        { field: 'data', type: 'object', description: 'Result breakdowns by status code, iteration inputs, and diagnostic failure notes.' }
      ],
      notes: [
        'All test runs (Fuzzy, Concurrency, Sequence) automatically persist their results to history files.',
        'Records are 1-indexed. The oldest test run is #1.',
        'Pass resultno=0 to dump all history records across all files in a single JSON response.',
        'Use query parameters (?metrics=true, ?data=true) to selectively fetch only the data you need for CI/CD checks.',
        'History is partitioned into chunks of 1000 records per file for high-throughput disk efficiency.'
      ]
    }
  },
  libraryGuide: {
    apiOverview: 'Run API Test Lab from the command line with a JSON payload file. The same commands work locally and in CI/CD pipelines.',
    defaultPort: 3000,
    endpoints: [
      { name: 'Fuzzy Testing', routeKey: 'fuzzy', summary: 'Check input validation with chosen values and ranges.' },
      { name: 'Concurrency Testing', routeKey: 'concurrency', summary: 'Measure latency and failures under parallel load.' },
      { name: 'Sequence Testing', routeKey: 'sequence', summary: 'Simulate multi-step workflows and pass response data forward.' }
    ],
    resultsEndpoints: [
      { name: 'Get Result by Number', description: 'Read one saved test result. Use 0 to print all recorded runs.' },
      { name: 'Recent Results', description: 'Review the latest saved test runs from your terminal.' }
    ],
    resultsInfo: 'Every test run is automatically saved to history. Use the CLI results and recent commands to review outcomes in local scripts or CI/CD.',
    resultsCliExamples: [
      { label: 'Fetch result #1', command: 'apitestlab results 1' },
      { label: 'Fetch all results', command: 'apitestlab results 0' },
      { label: 'Fetch recent results', command: 'apitestlab recent 1' }
    ],
    fileUploadNote: 'File upload options are documented in the route guide when available. Use them when your target API accepts files.',
    commonHeaders: '{ "Content-Type": "application/json" }',
    authNote: 'API Test Lab itself does not require authentication. However, you should include any authentication headers (Bearer tokens, API keys) needed by your target API in the headers field of each test request.'
  },
  apiSelectorRoutes: {
    fuzzy: 'fuzzy',
    sequence: 'sequence',
    concurrency: 'concurrency'
  },
  licenseText: `MIT License

Copyright (c) 2026 Shaik Naseer John Ahmed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
};
