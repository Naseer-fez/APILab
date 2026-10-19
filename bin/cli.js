#!/usr/bin/env node
import { runApiTest, runConcurrencyTest, runSequenceTest } from '../backend/manager.js';
import startServer from '../backend/src/server.js';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);


const runtests = {
    api: runApiTest,
    concurrency: runConcurrencyTest,
    sequence: runSequenceTest
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
    return JSON.parse(input);
}


const main = async () => {
    const command = args[0].toLowerCase();
    const testRunner = runtests[command];
    if (testRunner) {
        const payload = await parsejson(args[1]);
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
        console.log("  start <port>           Start the server and UI");
        console.log("  help                   Show this help message");
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