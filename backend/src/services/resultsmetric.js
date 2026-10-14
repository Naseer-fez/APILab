import fs from "node:fs/promises";
import { statSync } from "node:fs";


const LatencyMap = new Map();//This will store the latency for each id

const DataMap = new Map();//This will store the data for each id


const startlatency = async (id) => {
    if (!id) {
        throw new Error("id is required"); //This is for the backedn 
    }
    if (LatencyMap.has(id)) return; //If the id is already present then return
    LatencyMap.set(id, { start: Date.now() }); //This will store the start time for the id

}

const endlatency = async (id) => {
    if (!id) {
        throw new Error("id is required");
    }
    if (!LatencyMap.has(id)) return; //If the id is not present then return
    const latency = LatencyMap.get(id);
    if (!latency) return;
    latency.end = Date.now();
    latency.duration = Number((latency.end - latency.start).toFixed(6));

}
const calculatelatencymetric = async () => {
    //Now simple lets just pull the LatencyMap and calculate the latency for each id and return the average latency
    const durations = [];
    for (const [id, latency] of LatencyMap.entries()) {
        if (Number.isFinite(latency.duration)) {
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

    durations.sort((a, b) => a - b);
    if (durations.length === 0) return totalmetric;

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


const combineresults = async (totaldata, key = "con") => {
    totaldata.latency = await calculatelatencymetric();
    totaldata.data ??= {};
    totaldata.data.received = DataMap.get(key)?.received ?? 0;
    console.log("the totaldata is ", totaldata);
    return totaldata;
}



import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    startlatency("test");
    endlatency("test").then(() => {
        const latency = LatencyMap.get("test");
        console.log(latency);
    });
}
const resultmetric = {
    startlatency,
    endlatency, calculatelatencymetric,
    datacalulator, getdatasize, combineresults
}

export {
    resultmetric
}
