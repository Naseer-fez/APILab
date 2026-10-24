# apitestlab

> Self-hosted API experimentation, testing, and performance platform.

## Overview

`apitestlab` is a developer-centric tool for API experimentation, concurrency/load testing, fuzzy validation, and sequence testing with a built-in UI and CLI runner.

## Installation

```bash
# Install globally
npm install -g apitestlab

# Or run directly via npx
npx apitestlab start
```

## Quick Start

### 1. Launch the Server and Web UI
```bash
apitestlab start [port]
```
By default, the server starts at `http://127.0.0.1:3000`.

### 2. Run CLI Tests
```bash
# Run API validation test
apitestlab api <payload-json-or-file>

# Run Concurrency load test
apitestlab concurrency <payload-json-or-file>

# Run Sequence simulation test
apitestlab sequence <payload-json-or-file>

# View Historical Results
apitestlab results <query>

# View Recent Results
apitestlab recent <query>
```

## Programmatic Usage

```javascript
import {
  runApiTest,
  runConcurrencyTest,
  runSequenceTest,
  runHistoryResults,
  runRecentResults
} from 'apitestlab';
```

## Documentation

* [PRD](PRD.md)
* [Frontend Docs](frontend/docs/)
* [Backend Fixes & Goals](backend/)

## License

ISC
