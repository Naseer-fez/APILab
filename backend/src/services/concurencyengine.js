import { openAsBlob } from 'node:fs';
import path from 'node:path';
import fs from 'node:fs/promises';
import { resultmetric } from './resultsmetric.js';

const resultid="concurrency_test"; //This is the id for the result metric to store the results in the result metric service

class concurrencyengine {

    constructor({ link, method, headers, bodytosend, isget, data, file = null, isfile = 0, blobmode = false }) {

        this.link = link;
        this.method = method;
        this.headers = headers;
        this.bodytosend = bodytosend;
        this.isget = isget;
        this.data = data;
        this.file = file;
        this.isfile = isfile;
        this.blobmode = blobmode;
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
            const id = "id" + totaldata.totalrequestssent;

            const reaminingrequests = this.data.requests -
                totaldata.totalrequestssent;
            const batchsize = Math.min(currentConcurrency, reaminingrequests);
            totaldata.concurrentrequest = batchsize;
            const cycleStartSent = totaldata.totalrequestssent;
            const cycleStartSuccess = totaldata.successfulrequests;
            const cycleStartFailed = totaldata.totalrequestfailed;
            // //console.log("The total requests sent is ", totaldata.totalrequestssent, "Total data is", this.data.requests);
            resultmetric.startlatency(resultid, id);
            totaldata = await this.concurrentsendrequest({ totaldata: totaldata });
            resultmetric.endlatency(resultid, id);
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
        totaldata = resultmetric.combineresults(resultid, totaldata); 
        return totaldata;
    }
    async concurrentsendrequest({ totaldata }) {
        // const link = this.link;
        // const method = this.method;
        // const headers = this.headers;
        // const bodytosend = this.bodytosend;
        // const isget = this.isget;
        //this fucntion we will send the concurent requests in this 
        var requestsent = 0;
        const reqs = []
        while (requestsent < totaldata.concurrentrequest) {
            requestsent++;
            const id = requestsent;
            resultmetric.startlatency(resultid, id);
            reqs.push(this.sendrequest()
                .then((data) => {
                    if (data[0] === 1) {
                        totaldata.successfulrequests += 1;

                    } else {
                        totaldata.totalrequestfailed += 1;
                        resultmetric.storediagnostics(resultid, { status: data[0], data: data[1] }); //this will do it
                    }
                    totaldata.totalrequestssent += 1;
                    resultmetric.datacalulator(resultid, data[1], true);
                }).catch((err) => {
                    //console.log("The error is ", err);
                    totaldata.totalrequestfailed += 1;
                    totaldata.totalrequestssent += 1;
                }).finally(() => {
                    // //console.log("Request of sending no:", requestsent, "of", totaldata.concurrentrequest, "is done");
                    resultmetric.endlatency(resultid, id);
                    // resultmetric.datacalulator(id, data[1], true);
                }
                )
            );
        }
        await Promise.all(reqs)
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
            let data = null;
            const contentType = response.headers.get("content-type");
            // will work on this data later on
            const fun = contentType?.includes("application/json") ? "json" : "text";
            data = await response[fun]();


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
        const filebuffer = await fs.readFile(this.file.path);

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

const requestengine = async ({ link, method, headers, bodytosend, isget, data, file, isfile, blobmode = false }) => {
    // //console.log("The data is ", data);
    console.log("the method is ", method, "the link is ", link, "the headers are ", headers, "the bodytosend is ", bodytosend, "the isget is ", isget, "the data is ", data, "the file is ", file, "the isfile is ", isfile, "the blobmode is ", blobmode);
    const engine = new concurrencyengine({
        link, method, headers,
        bodytosend, isget, data, file, isfile, blobmode
    });
    // //console.log("The engine is ", engine);
    const result = await engine.beginsimulation();
    // console.log("The result is ", result);
    return [1, result, 200];


}

// now lets write  a test for thsi file only

export { requestengine };