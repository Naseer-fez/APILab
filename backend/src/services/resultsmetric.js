import fs from "node:fs/promises";
import { statSync } from "node:fs";


const LatencyMap = new Map();//This will store the latency for each id

const DataMap = new Map();//This will store the data for each id

const ResultMap = new Map();//This will store the result for each id

const diagnosticsMap = new Map();//This will store the diagnostics for each id

const startlatency = async (key = "default", reqindex) => {
    if (!reqindex) {
        throw new Error("reqindex is required"); //This is for the backedn 
    }
    const index = String(key + "_" + reqindex); //We will create a unique key for each request
    if (LatencyMap.has(index)) return; //If the id is already present then return
    LatencyMap.set(index, { start: Date.now() }); //This will store the start time for the id

}

const endlatency = async (key = "default", reqindex) => {
    if (!reqindex) {
        throw new Error("reqindex is required");
    }
    const index = String(key + "_" + reqindex); //We will create a unique key for each request
    if (!LatencyMap.has(index)) return; //If the id is not present then return
    const latency = LatencyMap.get(index);
    if (!latency) return;
    latency.end = Date.now();
    latency.duration = Number((latency.end - latency.start).toFixed(6));
    LatencyMap.set(index, latency);
}
const calculatelatencymetric = async (key = "default") => {
    //Now simple lets just pull the LatencyMap and calculate the latency for each id and return the average latency
    const durations = [];
    for (const [id, latency] of LatencyMap.entries()) {
        if (
            id.startsWith(`${key}_`) &&
            Number.isFinite(latency.duration)
        ) {
            durations.push(latency.duration);
        }
    }
    const totalmetric = {
        count: 0,
        average: null,
        averageMs: null,
        min: null,
        max: null,
        p50: null,
        p90: null,
        p95: null,
        p99: null
    };

    if (durations.length === 0) return totalmetric;
    durations.sort((a, b) => a - b);

    const percentile = (num) => {
        const index = Math.ceil((num / 100) * durations.length) - 1;
        return durations[Math.max(0, index)];
    }
    const validpercentiles = [50, 75, 90, 95, 99]
    validpercentiles.forEach((percentileValue) => {
        totalmetric[`p${percentileValue}`] = percentile(percentileValue);
    }); //percentile is calcaulted
    totalmetric.count = durations.length;
    totalmetric.average = Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(6));
    totalmetric.averageMs = Number((totalmetric.average / 1000).toFixed(6));
    totalmetric.min = durations[0];
    totalmetric.max = durations[durations.length - 1];
    return totalmetric;




}

const datacalulator = async (id = "default", data, received = false) => {
    if (!id) {
        throw new Error("id is required");
    }
    const key = received ? "received" : "sent";

    var totaldata = (DataMap.get(id)?.[key] ?? 0) + await getdatasize(data);
    // DataMap.set(id, { [key]: totaldata + 1 });
    if (!DataMap.has(id)) {
        const oppositeKey = received ? "sent" : "received";

        DataMap.set(id, { [key]: totaldata }, { [oppositeKey]: 0 });
    }
    DataMap.set(id, { ...DataMap.get(id), [key]: totaldata }); //set the id as it is


}

const storeresult = async (id = "default", result) => {
    if (!id) {
        throw new Error("id is required");
    }
    if (!ResultMap.has(id)) {
        ResultMap.set(id, []); // Dr.Strange:  "It's a simple spell, but quite unbreakable"
    }
    ResultMap.get(id).push(result);
}



const summaryreport = async (id = "default", totaldata) => {
    if (!id) {
        throw new Error("id is required");
    }

    const results = ResultMap.get(id) ?? [];

    let successful = 0;
    let failed = 0;

    for (const result of results) {
        if (result.status >= 200 && result.status < 300) {
            successful++;
        } else {
            failed++;
        }
    }

    const total = results.length;

    const summary = {
        totalRequestsSent: total,
        successfulRequests: successful,
        totalRequestsFailed: failed,
        successRate: total
            ? Number(((successful / total) * 100).toFixed(2))
            : 0,

        failureRate: total
            ? Number(((failed / total) * 100).toFixed(2))
            : 0
    };

    return summary;
};



const getdatasize = async (data) => {
    if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) return data.byteLength;
    if (typeof data === "string") return Buffer.byteLength(data, "utf8");
    if (typeof data === "string" && data.startsWith("file:")) return statSync(data.slice(5)).size;
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (data instanceof Blob) return data.size;
    if (typeof data === "object") return Buffer.byteLength(JSON.stringify(data), "utf8");
    if (typeof data === "number" || typeof data === "boolean") return Buffer.byteLength(data.toString(), "utf8");

    return Buffer.byteLength(JSON.stringify(data) ?? "");

}



const combineresults = async (key = "default", totaldata) => {
    // console.log("Combining results for key: ", key);
    totaldata.latency ??= await calculatelatencymetric(key);
    totaldata.dataprocessed ??= {};
    totaldata.dataprocessed.sent = DataMap.get(key)?.sent ?? 0;
    totaldata.dataprocessed.received = DataMap.get(key)?.received ?? 0;
    totaldata.result = ResultMap.get(key) ?? []; //full array
    totaldata.diagnostics = diagnosticsMap.get(key) ?? []; //full array 
    totaldata.summary ??= await summaryreport(key, totaldata);
    // console.log("all the keys are ",Object.keys(totaldata));
    return totaldata;
}

const storediagnostics = async (id = "default", diagnostics) => {
    if (!id) {
        throw new Error("id is required");
    }
    if (!diagnosticsMap.has(id)) {
        diagnosticsMap.set(id, []);
    }
    diagnosticsMap.get(id).push(diagnostics);

}




const formatResponse = (combinedResult) => {
    const { latency, summary, dataprocessed, requestcycle, cycles, ...data } = combinedResult || {};
    
    let cyclesArray = [];
    if (Array.isArray(cycles)) {
        cyclesArray = cycles;
    } else if (Array.isArray(requestcycle)) {
        cyclesArray = requestcycle;
    } else if (requestcycle && typeof requestcycle === 'object') {
        cyclesArray = Object.values(requestcycle);
    } else if (cycles && typeof cycles === 'object') {
        cyclesArray = Object.values(cycles);
    }

    return {
        metrics: {
            latency: latency ?? null,
            summary: summary ?? null,
            dataprocessed: dataprocessed ?? null,
            cycles: cyclesArray
        },
        data
    };
};

const resultmetric = {
    startlatency,
    endlatency, calculatelatencymetric,
    storediagnostics,
    datacalulator, getdatasize, combineresults, storeresult,
    formatResponse
}

export {
    resultmetric
}
