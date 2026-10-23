#!/usr/bin/env node
import { runApiTest, runConcurrencyTest, runSequenceTest, runHistoryResults, runRecentResults } from '../backend/manager.js';
import startServer from '../backend/src/server.js';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);


const runtests = {
    api: runApiTest,
    concurrency: runConcurrencyTest,
    sequence: runSequenceTest,
    recent: runRecentResults,
    results: runHistoryResults
};

const startui = (port = 3000) => {

    startServer(port);

}

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
    const command = (args[0] || 'help').toLowerCase();
    const testRunner = runtests[command];
    if (testRunner) {
        var payload;
        if ((testRunner !== runHistoryResults && testRunner !== runRecentResults)) {
            payload = await parsejson(args[1]);
        } else {
            payload = args[1] || null;
        }
        if (!payload) {
            console.error("No payload provided. Please provide a JSON payload.");
            process.exit(1);
        }
        const result = await testRunner(payload);
        // console.log("Test Result:", result);
        return resultsparser(result);
    }
    else if (command === 'start' || command === 'run') {
        const port = args[1] ? parseInt(args[1]) : 3000;
        startui(port);
    }
    else if (command === 'help' || command === '--help' || command === '-h') {
        console.log("Usage: node cli.js <command> [payload]");
        console.log("Commands:");
        console.log("  api <payload>          Run API test with the provided payload");
        console.log("  concurrency <payload>  Run Concurrency test with the provided payload");
        console.log("  sequence <payload>     Run Sequence test with the provided payload");
        console.log("  payload should be a JSON string or a path to a JSON file");
        console.log("  results <query>      Fetch historical test results with the provided payload");
        console.log("  recent <query>       Fetch recent test results with the provided payload<last 5 results>");
        console.log("  for query help use 'query'");
        console.log("  start <port>           Start the server and UI");
        console.log("  help                   Show this help message");
    }
    else if (command === 'query') {
        const validQueries = ["resultno", "success", "failure", "message", "metrics", "data"]
        console.log("Query Usage: node cli.js results <query>");
        console.log("The query takes normal inputs")
        console.log("Valid queries are:");
        validQueries.forEach((query) => {
            console.log(`  - ${query}`);
        });
        console.log("Example: node cli.js results success");
        console.log("This will fetch all historical test results that were successful.");
        console.log("reulstno will fetch the result by result number");
    }
    else {
        console.error("Invalid command. Use 'help' for usage information.");
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
    console.error('Error:', err);
    process.exit(1);
});