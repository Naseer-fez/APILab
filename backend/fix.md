# Sequence Test Engine: Technical Fix & Coordination Specification

**Target System:** API Integration Simulation Engine (`sequencetest`)  
**Scope Files:**
* `src/routes/sequencetest.js`
* `src/controllers/sequencetest.js`
* `src/services/sequencetest.js`

---

## 1. Executive Summary & Objective

The **Sequence Test Engine** enables end-to-end simulation workflows by executing a series of dependent API requests in order. The engine must support:
1. Dynamic URL assembly (inheriting base URLs and appending endpoints).
2. State carry-forward across sequence steps (`useheader`, `usedata`, `storeheader`, `storedata`).
3. Runtime placeholder interpolation (`{{response.data.id}}` or `{{response.0.data.token}}`).
4. Conditional execution and action branching (`if`, `elseif`, `else`) with assertions, payload mutations, and client progress checkpoints.

Currently, coordination across the route, controller, and service fails due to contract mismatches, data loss during parsing, premature interpolation, and missing state-dispatch mechanisms. This document outlines the technical specification and exact action items required to make the system robust and fully operational.

---

## 2. Coordination Architecture & Data Flow

```
[Client Payload: { request: [...] }]
               │
               ▼
┌────────────────────────────────────────────────────────┐
│ 1. ROUTE (src/routes/sequencetest.js)                  │
│    POST /api/sequencetest                              │
│    POST /api/sequencetest/file (multer upload)         │
└───────────────────────┬────────────────────────────────┘
                        │ req.body, req.file
                        ▼
┌────────────────────────────────────────────────────────┐
│ 2. CONTROLLER - Step Parsing Loop                      │
│    (src/controllers/sequencetest.js)                   │
│    Iterates req.body.request, accumulates globalConfig │
└───────────────────────┬────────────────────────────────┘
                        │ parsebody(request, file, globalConfig)
                        ▼
┌────────────────────────────────────────────────────────┐
│ 3. SERVICE - Normalization & Validation                │
│    (src/services/sequencetest.js)                      │
│    - Combines links / defaults                         │
│    - Validates file paths & attachments                │
│    - Validates condition rules (if, elseif, else)      │
│    - Returns sanitized [status, dataobject, code]      │
└───────────────────────┬────────────────────────────────┘
                        │ Validated request objects array
                        ▼
┌────────────────────────────────────────────────────────┐
│ 4. CONTROLLER - Execution Pipeline (handelrequests)   │
│    - Injects state from previous steps (headers/data)  │
│    - Resolves dynamic references via resolvedata       │
│    - Executes HTTP call (sendrequest)                  │
│    - Evaluates assertions & branching conditions       │
│    - Emits progress checkpoints (WebSocket / stream)   │
│    - Propagates next-request headers/data modifications│
└────────────────────────────────────────────────────────┘
```

---

## 3. High-Priority Issues & Root Causes

### A. Contract Mismatches & Typo Inconsistencies
1. **Conditions Key Pluralization:**
   * **Issue:** Routes and test payloads supply `conditions: { if: { ... } }`, but the service originally looked only for `body.condition` (singular).
   * **Fix:** Standardize on `conditions` (read `body.conditions ?? body.condition`), and output `dataobject.conditions`.
2. **Flag Spellings:**
   * **Issue:** `endpointavailble` vs `endpointavailable`, `conditionavailble` vs `conditionavailable`, and `fileavailabe` vs `fileavailable`.
   * **Fix:** Enforce the correct English spelling (`endpointavailable`, `conditionavailable`, `fileavailable`) throughout all files.
3. **Else-If Branching Key:**
   * **Issue:** Service parsed `"elseif"` while controller and documentation checked `"else if"`.
   * **Fix:** Standardize strictly on `"elseif"` (no spaces) across both service and controller.
4. **File Property Representation:**
   * **Issue:** The service stored parsed file information in `filedata`, while the controller destructured `{ file }`.
   * **Fix:** Unify parameter names to `filedata` and pass it to `sendfile`.

---

### B. Critical Runtime Bugs in Service (`src/services/sequencetest.js`)

1. **Condition Value Overwrite (Line 392):**
   * **Bug:** `objtosend[key] = value !== undefined;` overwrote strings, messages, and objects with boolean `true`.
   * **Fix:** Assign the actual value: `objtosend[key] = value;` and store the boolean flag in `objtosend[`${key}available`] = true;`.
2. **Bracket Validation Crash (Lines 400 & 434):**
   * **Bug:** Calling `validatebrackets` on booleans/objects caused `values = null`, throwing `TypeError: values is not iterable`. Additionally, it erroneously rejected static payloads that did not contain `{{}}`.
   * **Fix:** Only run bracket validation on `condition.condition` (the dynamic expression string). Allow static header and body objects to pass through untouched.
3. **Premature Condition Dropping (Line 356):**
   * **Bug:** If `status` was omitted, the condition was completely discarded (`return [-1]`), ignoring expression-only rules like `"condition": "{{response.status}} == 200"`.
   * **Fix:** Allow conditions to have `condition` expressions, `status` codes, or both. Only reject if neither is present.
4. **Link Fallback Logic (Line 81):**
   * **Bug:** A hardcoded `if (false)` caused missing base links to fall through without checking `previouslink`.
   * **Fix:** If `link == null`, check `if (!previouslink) return error;` otherwise, combine `previouslink` + `endpoint`.
5. **False Negative on File Fallback (Line 187):**
   * **Bug:** When `fileavailable` was omitted (`undefined`), the parser assumed a file must be present and raised `"No file is found"`.
   * **Fix:** Check `if (!fileavailable) return [-1, "", 0];` early.

---

### C. Critical Runtime Bugs in Controller (`src/controllers/sequencetest.js`)

1. **State Propagation Between Requests:**
   * **Bug:** The controller loop called `parsebody(request, req.file)` without passing or updating `globalConfig`. Requests could not inherit `link`, defaults, or previous configurations.
   * **Fix:** Maintain an accumulator `globalConfig` and pass `parsebody(request, req.file, globalConfig, reqnum === 0 ? 1 : 0)`.
2. **Missing Implementation of `useheader` and `usedata`:**
   * **Bug:** Neither service nor controller implemented the storage and inheritance of headers or data.
   * **Fix:** In `handelrequests`, store sanitized response headers (`storeheader`) and response bodies (`storedata`), and merge them into subsequent requests when `useheader` or `usedata` is `true`.
3. **Hop-by-Hop Header Forwarding Hangs:**
   * **Bug:** When forwarding stored response headers, including `content-length` from a previous response broke subsequent outgoing fetch requests, causing socket hangs.
   * **Fix:** Sanitize stored headers before reusing them by stripping hop-by-hop and payload-specific headers (`content-length`, `content-encoding`, `transfer-encoding`, `connection`, `host`, `date`, `etag`, `keep-alive`, `content-type`).
4. **Premature Condition Interpolation in `resolvedata`:**
   * **Bug:** `resolvedata` traversed the entire request object before dispatching the HTTP call. When it encountered `{{response.status}}` inside `conditions`, it tried to resolve it against the *previous* request and crashed with `Reference "response.status" does not exist`.
   * **Fix:** In `resolvedata`, exclude `conditions` from pre-request interpolation. Conditions must evaluate against the response *after* the request completes.
5. **Condition Reference Evaluation Context:**
   * **Bug:** In `conditionvalidator`, `actual` was set to the raw response object `{ status, data, headers }`. Evaluating `{{response.status}}` looked for `actual.response.status` and failed.
   * **Fix:** Provide a unified resolution context:
     ```javascript
     const context = {
         response: response,
         ...response,
         body: response.data,
         data: response.data,
         status: response.status,
         headers: response.headers
     };
     ```
6. **Unhandled Condition Mismatches:**
   * **Bug:** `conditionschecker` returned `undefined` when no conditions matched, causing `conditionresult[0]` to throw a `TypeError`.
   * **Fix:** Return `[0, "Conditions not met", 400]` as the fallback return tuple.
7. **Condition Next-Action Handler:**
   * **Bug:** Successfully matching an `if` condition never applied its `header`, `body`, or `nextdata` mutations to the subsequent request.
   * **Fix:** When a condition matches, stage its modifications (`pendingNextHeaders`, `pendingNextData`) and inject/overwrite them in the next sequence step.
8. **Checkpoint Handling:**
   * **Bug:** `handelcheckpoint` invoked an undeclared function `sendWebSocketMessage` and checked an out-of-scope variable `res`.
   * **Fix:** Safely inspect `if (websocket && typeof websocket.send === 'function')` before emitting, and return a clean checkpoint tuple.

---

## 4. Step-by-Step Implementation Guide

### Task 1: Update `src/services/sequencetest.js`
* [ ] **Line 5 (`parsebody`):**
  * Support `body.conditions ?? body.condition ?? null`.
  * Standardize `endpointavailable = body.endpointavailable ?? false`.
  * Return `dataobject.conditions` containing the parsed rules.
* [ ] **Line 73 (`pasrselink`):**
  * Remove `if (false)`.
  * If `link == null`:
    * If `!previouslink`, return `[null, "No link provided", 400]`.
    * If `endpointavailable && endpoint`, return `[combinelinks([previouslink, endpoint]), "", 200]`.
    * If `!endpointavailable`, return `[previouslink, "", 200]`.
* [ ] **Line 183 (`filedataparser`):**
  * If `!fileavailable`, return `[-1, "", 0]` immediately.
* [ ] **Line 244 (`conditionparser`):**
  * Standardize valid keys: `const validKeys = { "if": 0, "elseif": 1 };`.
  * Normalize keys using `key.toLowerCase().trim()`.
* [ ] **Line 324 (`validatecondition`):**
  * Make `status` optional if a string `condition` is present.
  * Store actual values in `objtosend[key] = value` instead of boolean flags.
  * Set `objtosend[`${key}available`] = true`.
* [ ] **Line 401 (`validatebrackets`):**
  * Only run against strings. Verify `data.includes("{{") && data.includes("}}")`.

---

### Task 2: Update `src/controllers/sequencetest.js`
* [ ] **Line 7 (`sequencetestController`):**
  * Validate `if (!req.body || !req.body.request)`.
  * Initialize `let globalConfig = {};`.
  * Pass `globalConfig` into `parsebody(request, req.file, globalConfig, ...)`.
  * Update `globalConfig` after each parsed request with `link`, `method`, `storeheader`, `storedata`, `expectedstatus`, `ignoreerrors`.
  * On parse failure (`body[0] === 0`), return `res.status(body[2] || 400).json(body[1])`.
* [ ] **Header Sanitization Helper:**
  * Implement `sanitizeHeaders(headers)` to filter out `content-length`, `content-type`, `host`, `connection`, `transfer-encoding`, `etag`, `date`, `keep-alive`.
* [ ] **Line 39 (`sendrequest`):**
  * Rename parameter to `fileavailable` and `filedata`.
  * Auto-inject `'Content-Type': 'application/json'` on POST/PUT requests if missing.
  * Safely handle response text when response body is not JSON.
* [ ] **Line 96 (`handelrequests`):**
  * Initialize trackers: `lastStoredHeaders = {}`, `lastStoredData = {}`, `pendingNextHeaders = null`, `pendingNextData = null`.
  * Apply `useheader` and `usedata` before dispatching.
  * Apply `pendingNextHeaders` and `pendingNextData` from preceding condition triggers.
  * Store `sanitizeHeaders(response.headers)` when `storeheader: true`.
  * Store `response.data` when `storedata: true`.
  * If a condition matches (`conditionresult[0] === 1` or `-2`), extract `matchedCondition.header` and `matchedCondition.nextdata` / `matchedCondition.body` for the next loop.
  * Check `expectedstatus` and `ignoreerrors` before deciding to abort.
* [ ] **Line 146 (`conditionschecker`):**
  * Check `["if", "elseif", "else"]`.
  * Return `[0, "Conditions not met", 400]` if no branch evaluates to true.
* [ ] **Line 171 (`resolvedata`):**
  * Exclude `key === "conditions"` from placeholder substitution so expressions are preserved for post-request evaluation.
  * Support `response.data.id` (defaulting to the latest response) in addition to index-based paths `response.0.data.id`.
* [ ] **Line 267 (`conditionvalidator`):**
  * Expose a unified lookup context: `{ response, ...response, body: response.data, data: response.data, status: response.status, headers: response.headers }`.
* [ ] **Line 306 (`handelcheckpoint`):**
  * Guard WebSocket calls: `if (websocket && typeof websocket.send === 'function') websocket.send(...)`.

---

## 5. Acceptance Criteria & QA Verification Checklist

| Scenario | Input Configuration | Expected Outcome |
| :--- | :--- | :--- |
| **Basic Sequence Execution** | 2 requests with explicit links | Both requests execute in order; status 200 returned with full history array. |
| **Link Inheritance** | Request 1 provides `link: "http://localhost:3000"`, Request 2 provides only `endpoint: "/health"` and `endpointavailable: true` | Request 2 executes against `http://localhost:3000/health`. |
| **Data Propagation (`usedata`)** | Request 1 has `storedata: true`, Request 2 has `usedata: true` | Request 1 response body is merged into Request 2 payload. |
| **Header Propagation (`useheader`)** | Request 1 has `storeheader: true`, Request 2 has `useheader: true` | Sanitized headers from Request 1 are passed to Request 2 without `content-length` conflicts. |
| **Condition Assertion (`if`)** | `"condition": "{{response.status}} == 200"` | Condition passes, records `conditionresult: [1, ...]` or `[-2, ...]`. |
| **Failed Condition Branching** | `"condition": "{{response.status}} == 404"` when response is 200 | Returns error status 400 with message `"Condition not met"`. |
| **Expected Error Handling** | Target returns 404, but `expectedstatus: [404]` is configured | Engine marks step as successful and continues sequence. |
| **Ignore Errors** | Target returns 500, but `ignoreerrors: true` is configured | Engine records error in results and continues sequence. |

---

*Document created for development reference. Implement according to Karpathy simplicity and surgical precision guidelines.*
