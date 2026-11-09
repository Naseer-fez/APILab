import { openAsBlob } from 'node:fs';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

import { resultmetric } from './resultsmetric.js';

const resultid = "concurrency_test"; //This is the id for the result metric to store the results in the result metric service

class concurrencyengine {

    constructor({ link, method, headers, bodytosend, isget, data, file = null, isfile = 0, blobmode = false }) {
        // console.log(data);
        this.link = link;
        this.method = method;
        this.headers = headers;
        this.bodytosend = bodytosend;
        this.isget = isget;
        this.data = data;
        this.file = file;
        this.isfile = isfile;
        this.blobmode = blobmode;
        this.cachedFileBuffer = file ? fs.readFile(file.path) : null; //simple spell; //if file exist then
        this.workerid = data.workerid ?? 0; //if workerid exist then use it else use 0
        // this.beginsimulation();
    }
    // current we arent doing much with the succes data cause we are testing the 
    //concurency rigth now cause this is a test 

    //better to divide the code here so that we can easily maintain
    async beginsimulation() {
        // first understand the number of reqest we got

        //lets bundle the below varibles into one so that we can easily use them 
        var totaldata = {
            totalrequestssent: 0,
            concurrentrequest: 0,
            successfulrequests: 0,
            totalrequestfailed: 0,
            data: {
                sent: 0,
                received: 0
            }

        }
        let currentConcurrency = this.data.concurency;
        var requestcyclenum = 1;
        while (totaldata.totalrequestssent < this.data.requests) {
            //console.log("Request no:", totaldata.totalrequestssent);
            //now we will send the concurrent requests
            const id = "id" + totaldata.totalrequestssent+"-"+this.workerid; //unique id for each request

            const reaminingrequests = this.data.requests -
                totaldata.totalrequestssent;
            const batchsize = Math.min(currentConcurrency, reaminingrequests);
            totaldata.concurrentrequest = batchsize;
            const cycleStartSent = totaldata.totalrequestssent;
            const cycleStartSuccess = totaldata.successfulrequests;
            const cycleStartFailed = totaldata.totalrequestfailed;
            // //console.log("The total requests sent is ", totaldata.totalrequestssent, "Total data is", this.data.requests);

            totaldata = await this.concurrentsendrequest({ totaldata: totaldata });

            // totaldata.concurrentrequest += this.data.concurency;
            // //console.log("The total requests sent is ", totaldata.completedrequest + totaldata.totalrequestfailed);
            totaldata.requestcycle ??= {};

            totaldata.requestcycle[`requestcycle${requestcyclenum}`] = {
                requestcyclenum,
                batchsize,
                currentConcurrency,
                totalrequestssent:
                    totaldata.totalrequestssent - cycleStartSent,
                successfulrequests:
                    totaldata.successfulrequests - cycleStartSuccess,
                totalrequestfailed:
                    totaldata.totalrequestfailed - cycleStartFailed
            };
            currentConcurrency += (this.data.increment || 0);
            await this.sleep(this.data.interval ?? 0); //if thta is not fount then zero
            requestcyclenum++;
            //to simulate the time interval between the requests

        }
        // //console.log("The total data is ", totaldata);
        //cause sent is just a multplication
        //tiem to send the request now
        //console.log("Simulation is done!");
        totaldata.dataprocessed ??= {};
        if (this.method !== "GET") {
            totaldata.dataprocessed.sent =
                totaldata.totalrequestssent *
                await resultmetric.getdatasize(this.bodytosend);
        }
        totaldata = await resultmetric.combineresults(resultid, totaldata);
        return totaldata;
    }
    async concurrentsendrequest({ totaldata }) {
        const target = totaldata.concurrentrequest;
        const concurrency = Math.min(this.data.concurency || target, target);

        let started = 0;

        // A lightweight persistent worker: as soon as 1 request finishes, 
        // it immediately pulls the next one. No waiting for slow requests!
        const worker = async () => {
            while (started < target) {
                started++;
                const currentReqNum = started;
                const id = "w" + this.workerid + "_" + currentReqNum;
                totaldata.durations ??= [];
                const start = Date.now();
                resultmetric.startlatency(resultid, id);

                
                let res;
    
                try {
                    res = await this.sendrequest();
                } catch (err) {
                    res = [0, err.message, 500];
                } finally {
                    resultmetric.endlatency(resultid, id);
                    totaldata.durations.push(Date.now() - start);
        
                }

                // Proper atomic counting
                if (res[0] === 1) {
                    totaldata.successfulrequests += 1;
                } else {
                    totaldata.totalrequestfailed += 1;
                    resultmetric.storediagnostics(resultid, { status: res[0], data: res[1] });
                }
                totaldata.totalrequestssent += 1;
                resultmetric.datacalulator(resultid, res[1], true);
                // resultmetric.endlatency(resultid, id);
            }
        };

        // We only spawn 'concurrency' number of workers (e.g. 50 or 100), NOT thousands
        const workers = [];
        for (let i = 0; i < concurrency; i++) {
            workers.push(worker());
        }

        // Await ONLY the worker pool using allSettled to guarantee it never crashes
        await Promise.allSettled(workers);

        return totaldata;
    }

    async sendrequest() {
        const link = this.link;
        const method = this.method;
        const headers = this.headers;
        const bodytosend = this.bodytosend;
        const controller = new AbortController();

        // //console.log("The link is ", link);
        var response;
        const timeoutMs = Number(this.data?.timeout ?? this.data?.timout ?? 5000);
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);
        try {
            var options = {
                method: method,
                headers: headers,
                body: bodytosend,
                signal: controller.signal
            }
            if (this.isfile || this.file) {
                const functionToUse = this.blobmode ? this.filerequestBLOB.bind(this) : this.filerequest.bind(this);

                options = await functionToUse(options);
            } else {
                options = await this.normalrequest(options);
            }
            response = await fetch(link, options);
            // clearTimeout(timeoutId);
            //we will get the keys in the bodytosend so that we dotn have to computet in this 
            // let data = null;
            // const contentType = response.headers.get("content-type");
            let data;
            if (response.ok) {
                // For successful requests, just grab the raw byte length (FAST)
                const buf = await response.arrayBuffer();
                data = buf.byteLength;
            } else {
                // Only decode text if the request actually failed (for diagnostics)
                data = await response.text();
            }


            clearTimeout(timeoutId);
            resultmetric.storeresult(resultid, { status: response.status, data: data, headers: Object.fromEntries(response.headers.entries()) }); //async fun
            // const data = await response.json();
            // //console.log("The data is ", data);
            // //console.log("The response is ", response);
            return [response.ok ? 1 : 0,
                data, response.status];

        } catch (error) {
            if (error.name === 'AbortError') {
                return [0, "Request timed out", 408];
            }

            clearTimeout(timeoutId);
            //console.error("Error sending request:", error);
            return [0, error.message, 500];



        }
    }
    async filerequest(options) {
        // file check is done now lets handel thsi 
        const form = new FormData();
        for (const [key, value] of Object.entries(this.bodytosend)) {
            form.append(key, value);

        }
        const filebuffer = this.cachedFileBuffer; // Use the cached file buffer instead of reading from disk each time

        //conver the buffer into a blob now
        const blob = new Blob(
            [filebuffer], { type: this.file.mimetype });
        const filekey = this.data?.filekey || "file";
        form.append(
            filekey, blob, this.file.originalname
        )
        options.body = form;
        const requestHeaders = new Headers(options.headers);
        requestHeaders.delete('content-type');
        options.headers = requestHeaders;
        return options;
    }
    async filerequestBLOB(options) {
        const form = new FormData();

        // Add normal body fields
        for (const [key, value] of Object.entries(this.bodytosend ?? {})) {
            form.append(
                key,
                value !== null && typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value ?? '')
            );
        }

        // Support both a single file and an array of files
        const files = Array.isArray(this.file)
            ? this.file
            : [this.file];

        const filekey = this.data?.filekey || 'file';

        for (const file of files) {
            const blob = await openAsBlob(file.path, {
                type: file.mimetype || 'application/octet-stream'
            });

            form.append(
                filekey,
                blob,
                file.originalname || path.basename(file.path)
            );
        }

        options.body = form;

        // Let fetch generate the multipart boundary
        const requestHeaders = new Headers(options.headers);
        requestHeaders.delete('content-type');
        options.headers = requestHeaders;

        return options;
    }

    async normalrequest(options) {
        if (options.method.toUpperCase() !== "GET") {
            if (this.bodytosend instanceof FormData) {
                options.body = this.bodytosend;

                const headers = new Headers(options.headers);
                headers.delete("content-type");
                options.headers = headers;
            } else if (this.bodytosend !== undefined) {
                options.body = JSON.stringify(this.bodytosend);

                const headers = new Headers(options.headers);
                if (!headers.has("content-type")) {
                    headers.set("content-type", "application/json");
                }
                options.headers = headers;
            }
        }

        return options;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



}

const sendpartialreqs = async ({ link, method, headers, bodytosend, isget, data, file, isfile, blobmode = false }) => {
    // //console.log("The data is ", data);
    // console.log("the method is ", method, "the link is ", link, "the headers are ", headers, "the bodytosend is ", bodytosend, "the isget is ", isget, "the data is ", data, "the file is ", file, "the isfile is ", isfile, "the blobmode is ", blobmode);
    const engine = new concurrencyengine({
        link, method, headers,
        bodytosend, isget, data, file, isfile, blobmode
    });
    // //console.log("The engine is ", engine);
    const result = await engine.beginsimulation();
    // console.log("The result is ", result);
    return [1, result, 200];


}

const allocatereqs = (data, threadcount) => {
    const basereqs = Math.floor(data.requests / threadcount);
    const remreqs = data.requests % threadcount;
    const baseconc = Math.floor(data.concurency / threadcount);
    const remconc = data.concurency % threadcount;

    const reqlist = [];
    for (let i = 0; i < threadcount; i++) {
        const requests = i < remreqs ? basereqs + 1 : basereqs;
        const concurency = i < remconc ? baseconc + 1 : baseconc;
        reqlist.push({
            ...data,
            requests,
            concurency: Math.max(1, concurency),
            workerid: i + 1
        });
    }
    return reqlist;
};

const spawnworker = (reqdata) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), { workerData: reqdata });
    worker.on('message', (result) => {
        resolve(result);
    });
    worker.on('error', (error) => {
        reject(error);
    });
});

const calculatelatency = (durations) => {
    const totalmetric = {
        count: 0,
        average: null,
        averageMs: null,
        min: null,
        max: null,
        p50: null,
        p75: null,
        p90: null,
        p95: null,
        p99: null
    };

    if (!durations || durations.length === 0) return totalmetric;
    durations.sort((a, b) => a - b);

    const percentile = (num) => {
        const index = Math.ceil((num / 100) * durations.length) - 1;
        return durations[Math.max(0, index)];
    };
    const validpercentiles = [50, 75, 90, 95, 99];
    validpercentiles.forEach((p) => {
        totalmetric[`p${p}`] = percentile(p);
    });
    totalmetric.count = durations.length;
    totalmetric.average = Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(6));
    totalmetric.averageMs = Number((totalmetric.average / 1000).toFixed(6));
    totalmetric.min = durations[0];
    totalmetric.max = durations[durations.length - 1];
    return totalmetric;
};

const mergeResults = (results) => {
    const finaldata = {
        totalrequestssent: 0,
        concurrentrequest: 0,
        successfulrequests: 0,
        totalrequestfailed: 0,
        dataprocessed: { sent: 0, received: 0 },
        result: [],
        diagnostics: [],
        requestcycle: {},
        summary: {
            totalRequestsSent: 0,
            successfulRequests: 0,
            totalRequestsFailed: 0,
            statusCodes: {},
            successRate: 0,
            failureRate: 0
        },
        latency: null
    };

    const alldurations = [];

    for (let i = 0; i < results.length; i++) {
        const item = results[i]?.[1];
        if (!item) continue;

        finaldata.totalrequestssent += item.totalrequestssent || 0;
        finaldata.successfulrequests += item.successfulrequests || 0;
        finaldata.totalrequestfailed += item.totalrequestfailed || 0;

        if (item.dataprocessed) {
            finaldata.dataprocessed.sent += item.dataprocessed.sent || 0;
            finaldata.dataprocessed.received += item.dataprocessed.received || 0;
        }

        if (Array.isArray(item.result)) {
            finaldata.result.push(...item.result);
        }

        if (Array.isArray(item.diagnostics)) {
            finaldata.diagnostics.push(...item.diagnostics);
        }

        if (Array.isArray(item.durations)) {
            alldurations.push(...item.durations);
        }

        if (item.summary?.statusCodes) {
            for (const [code, count] of Object.entries(item.summary.statusCodes)) {
                finaldata.summary.statusCodes[code] = (finaldata.summary.statusCodes[code] || 0) + count;
            }
        }

        if (item.requestcycle) {
            Object.assign(finaldata.requestcycle, item.requestcycle);
        }
    }

    const total = finaldata.totalrequestssent;
    finaldata.summary.totalRequestsSent = total;
    finaldata.summary.successfulRequests = finaldata.successfulrequests;
    finaldata.summary.totalRequestsFailed = finaldata.totalrequestfailed;
    finaldata.summary.successRate = total ? Number(((finaldata.successfulrequests / total) * 100).toFixed(2)) : 0;
    finaldata.summary.failureRate = total ? Number(((finaldata.totalrequestfailed / total) * 100).toFixed(2)) : 0;

    finaldata.latency = calculatelatency(alldurations);

    return [1, finaldata, 200];
};

const requestengine = async ({ link, method, headers, bodytosend, isget, data, file, isfile, blobmode = false }) => {
    const threadcount = Math.min(os.cpus().length || 4, data.concurency, data.requests);
    const reqsdata = allocatereqs(data, threadcount);
    const workerthreads = [];
    for (let i = 0; i < threadcount; i++) {
        workerthreads.push(spawnworker({
            link, method, headers, bodytosend, isget, data: reqsdata[i], file, isfile, blobmode
        }));
    }
    const results = await Promise.all(workerthreads);
    return mergeResults(results);
};
//Time for the Worker code

if (!isMainThread) {
    sendpartialreqs(workerData).then((res) => {
        parentPort.postMessage(res);
    });
}




// now lets write  a test for thsi file only

export { requestengine };