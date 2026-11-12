#!/usr/bin/env node
import { documentation } from '../backend/documentation.js';
import { runApiTest, runConcurrencyTest, runSequenceTest, runHistoryResults, runRecentResults, getdocument } from '../backend/manager.js';
import startServer from '../backend/src/server.js';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

// Check if user requested JSON output mode via 'json' subcommand or '--json' flag
let isJsonMode = false;
let cleanArgs = [...args];
if (cleanArgs[0]?.toLowerCase() === 'json') {
    isJsonMode = true;
    cleanArgs.shift();
}
if (cleanArgs.includes('--json')) {
    isJsonMode = true;
    cleanArgs = cleanArgs.filter(a => a !== '--json');
}


const runtests = {
    api: runApiTest,
    fuzzy: runApiTest,
    concurrency: runConcurrencyTest,
    sequence: runSequenceTest,
    recent: runRecentResults,
    results: runHistoryResults,
    document: getdocument
};

const startui = (port = 3000, host = '127.0.0.1', runhost = false) => {
    startServer(port, host, runhost);
};

const parsejson = async (input) => {
    if (!input) {
        throw new Error("No payload provided. Please provide a JSON payload.");
    }
    const potentialPath = path.resolve(process.cwd(), input);
    if (fs.existsSync(potentialPath)) {
        const fileContent = fs.readFileSync(potentialPath, 'utf8');
        return JSON.parse(fileContent);
    }
    try {
        return JSON.parse(input);
    } catch (primaryErr) {
        try {
            let s = input;
            s = s.replace(/([{,]\s*)([a-zA-Z0-9_\-\.]+)\s*:/g, '$1"$2":');
            s = s.replace(/(:\s*)([^"'{}\[\],\s\r\n][^,{}\[\]\r\n]*)/g, (m, p, v) => {
                const t = v.trim();
                if (t === 'true' || t === 'false' || t === 'null') return p + t;
                if (!isNaN(Number(t)) && t !== '') return p + t;
                return p + JSON.stringify(t);
            });
            s = s.replace(/([\[,]\s*)([^"'{}\[\],\s\r\n][^,{}\[\]\r\n]*)/g, (m, p, v) => {
                const t = v.trim();
                if (t === 'true' || t === 'false' || t === 'null') return p + t;
                if (!isNaN(Number(t)) && t !== '') return p + t;
                return p + JSON.stringify(t);
            });
            return JSON.parse(s);
        } catch (_) {
            throw primaryErr;
        }
    }
}


const main = async () => {
    const command = (cleanArgs[0] || 'help').toLowerCase();
    const testRunner = runtests[command];
    if (testRunner) {
        var payload;
        if (command === 'results') {
            if (!cleanArgs[1]) {
                payload = { resultno: 0 };
            } else {
                try {
                    payload = JSON.parse(cleanArgs[1]);
                } catch {
                    if (!isNaN(Number(cleanArgs[1]))) {
                        payload = { resultno: Number(cleanArgs[1]) };
                    } else {
                        payload = { resultno: 0, [cleanArgs[1]]: true };
                    }
                }
            }
        } else if (command === 'recent') {
            if (!cleanArgs[1]) {
                payload = { pageno: 1 };
            } else {
                try {
                    payload = JSON.parse(cleanArgs[1]);
                } catch {
                    payload = { pageno: parseInt(cleanArgs[1], 10) || 1 };
                }
            }
        } else if (command === 'document') {
            payload = cleanArgs[1] || null;
        } else {
            payload = await parsejson(cleanArgs[1]);
        }
        if (!payload) {
            const errMsg = command === 'document'
                ? "No endpoint provided. Use 'document <endpoint>' (e.g. fuzzy, concurrency, sequence)."
                : "No payload provided. Please provide a JSON payload.";
            if (isJsonMode) {
                console.log(JSON.stringify({ statusCode: 400, success: false, message: errMsg }, null, 2));
            } else {
                console.error(errMsg);
            }
            process.exit(1);
        }
        const result = await testRunner(payload);
        if (isJsonMode) {
            const [message, formatted, statusCode] = result;
            const isSuccess = statusCode >= 200 && statusCode < 300;
            console.log(JSON.stringify({
                statusCode,
                success: isSuccess,
                message: typeof message === 'string' ? message : (isSuccess ? "Success" : "Error"),
                metrics: formatted?.metrics || null,
                data: formatted?.data || null
            }, null, 2));
            if (!isSuccess) process.exit(1);
            return;
        }
        return resultsparser(result);
    }
    else if (command === 'start' || command === 'run' ) {
        const port = cleanArgs[1] ? parseInt(cleanArgs[1]) : 3000;
        startui(port, '127.0.0.1', false);
    } else if (command === 'network') {
        const port = cleanArgs[1] ? parseInt(cleanArgs[1]) : 3000;
        startui(port, '0.0.0.0', true); 
    }
    else if (command === 'help' || command === '--help' || command === '-h') {
        if (isJsonMode) {
            console.log(JSON.stringify({
                statusCode: 200,
                success: true,
                commands: ["fuzzy", "concurrency", "sequence", "results", "recent", "document", "start", "network"]
            }, null, 2));
            return;
        }
        const binName = path.basename(process.argv[1] || 'apitestlab');
        const cmdPrefix = binName.endsWith('.js') ? `node ${binName}` : binName;
        console.log(`Usage: ${cmdPrefix} <command> [payload]`);
        console.log("Commands:");
        console.log("  fuzzy <payload>          Run API test with the provided payload");
        console.log("  concurrency <payload>  Run Concurrency test with the provided payload");
        console.log("  sequence <payload>     Run Sequence test with the provided payload");
        console.log("  payload should be a JSON string or a path to a JSON file");
        console.log("  results <query>      Fetch historical test results with the provided payload");
        console.log("  recent <query>       Fetch recent test results with the provided payload<last 5 results>");
        console.log("  for query help use 'query'");
        console.log("  for documentation help use 'document' <endpoint>");
        console.log("  start <port>           Start the server and UI on Localhost.");
        console.log("  network <port>         Start the server and UI on your network for other users along with localhost.");
        console.log("  json <command> [payload] Output pure JSON (e.g. apitestlab json fuzzy '{...}')");
        console.log("  --json                 Flag to format output as pure JSON");
        console.log("  help                   Show this help message");
    }
    else if (command === 'query') {
        const validQueries = ["resultno", "success", "failure", "message", "metrics", "data"];
        if (isJsonMode) {
            console.log(JSON.stringify({ statusCode: 200, success: true, queries: validQueries }, null, 2));
            return;
        }
        console.log("Query Usage: node cli.js results <query>");
        console.log("The query takes normal inputs")
        console.log("Valid queries are:");
        validQueries.forEach((query) => {
            console.log(`  - ${query}`);
        });
        console.log("Example: node cli.js results success");
        console.log("This will fetch all historical test results that were successful.");
        console.log("resultno will fetch the result by result number");
    }
    else if (command === 'document') {
        const availbeendpoint = ["fuzzy", "concurrency", "sequence"];
        if (isJsonMode) {
            console.log(JSON.stringify({ statusCode: 200, success: true, endpoints: availbeendpoint }, null, 2));
            return;
        }
        console.log("Documentation Usage: node cli.js document <document>");
        console.log("Valid Documents are");
        availbeendpoint.forEach((docs) => { console.log(`  - ${docs}`) })
        console.log("Example: node cli.js document fuzzy");
    }
    else {
        const errMsg = "Invalid command. Use 'help' for usage information.";
        if (isJsonMode) {
            console.log(JSON.stringify({ statusCode: 400, success: false, message: errMsg }, null, 2));
        } else {
            console.error(errMsg);
        }
        process.exit(1);
    }
}

const resultsparser = (result) => {
    const [message, formatted, statusCode] = result;
    const isSuccess = statusCode >= 200 && statusCode < 300;

    console.log("\n" + "=".repeat(60));
    console.log(`STATUS: [${statusCode}] ${message} (${isSuccess ? "PASS" : "FAIL"})`);
    console.log("=".repeat(60) + "\n");

    const metrics = formatted?.metrics;

    if (!metrics) {
        if (formatted?.data) console.log("Response Data:", formatted.data);
        return;
    }

    // 1. Request Summary Table
    if (metrics.summary) {
        console.log("REQUEST SUMMARY");
        console.table([
            {
                "Total Sent": metrics.summary.totalRequestsSent,
                "Successful": metrics.summary.successfulRequests,
                "Failed": metrics.summary.totalRequestsFailed,
                "Success Rate": `${metrics.summary.successRate}%`,
                "Failure Rate": `${metrics.summary.failureRate}%`
            }
        ]);
    }

    // 2. Latency & Percentiles Table (ms)
    if (metrics.latency && metrics.latency.count > 0) {
        console.log("LATENCY METRICS (ms)");
        console.table([
            {
                "Avg (ms)": metrics.latency.average,
                "Min": metrics.latency.min,
                "P50": metrics.latency.p50,
                "P75": metrics.latency.p75,
                "P90": metrics.latency.p90,
                "P99": metrics.latency.p99,
                "Max": metrics.latency.max
            }
        ]);
    }

    // 3. Data Transfer Summary
    if (metrics.dataprocessed) {
        const sentKB = (metrics.dataprocessed.sent / 1024).toFixed(2);
        const receivedKB = (metrics.dataprocessed.received / 1024).toFixed(2);
        console.log(`Data Transferred: Sent ~${sentKB} KB | Received ~${receivedKB} KB\n`);
    }

    if (!isSuccess) {
        process.exit(1);
    }
};



main().catch((err) => {
    if (isJsonMode) {
        console.log(JSON.stringify({
            statusCode: 400,
            success: false,
            message: err.message || String(err)
        }, null, 2));
    } else {
        console.error('Error:', err);
    }
    process.exit(1);
});