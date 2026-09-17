class concurrencyengine {

    constructor({ link, method, headers, bodytosend, isget, data }) {

        this.link = link;
        this.method = method;
        this.headers = headers;
        this.bodytosend = bodytosend;
        this.isget = isget;
        this.data = data;

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
            totalrequestfailed: 0

        }
        let currentConcurrency = this.data.concurency;
        while (totaldata.totalrequestssent < this.data.requests) {
            console.log("Request no:", totaldata.totalrequestssent);
            //now we will send the concurrent requests
            const reaminingrequests = this.data.requests -
                totaldata.totalrequestssent;
            const batchsize = Math.min(currentConcurrency, reaminingrequests);
            totaldata.concurrentrequest = batchsize;
            // console.log("The total requests sent is ", totaldata.totalrequestssent, "Total data is", this.data.requests);
            totaldata = await this.concurrentsendrequest({ totaldata: totaldata });
            // totaldata.concurrentrequest += this.data.concurency;
            // console.log("The total requests sent is ", totaldata.completedrequest + totaldata.totalrequestfailed);
            currentConcurrency += (this.data.increment || 0);
            await this.sleep(this.data.interval);
            //to simulate the time interval between the requests

        }
        // console.log("The total data is ", totaldata);

        //tiem to send the request now
        console.log("Simulation is done!");
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
            console.log("Request of sending no:", requestsent + 1, "of", totaldata.concurrentrequest);
            requestsent++;
            reqs.push(this.sendrequest()
                .then((data) => {
                    if (data[0] === 1) {
                        totaldata.successfulrequests += 1;

                    } else {
                        totaldata.totalrequestfailed += 1;
                    }
                    totaldata.totalrequestssent += 1;
                }).catch((err) => {
                    console.log("The error is ", err);
                    totaldata.totalrequestfailed += 1;
                    totaldata.totalrequestssent += 1;
                }));
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

        // console.log("The link is ", link);
        var response;
        const timeoutMs = Number(this.data?.timeout ?? this.data?.timout ?? 5000);
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutMs);
        try {
            const options = {
                method: method,
                headers: headers,
                signal: controller.signal
            }
            if (method !== "GET") {
                if (bodytosend instanceof FormData) {
                    options.body = bodytosend;
                    delete options.headers['Content-Type'];  // let node do it automatically

                }
                else {
                    options.body = JSON.stringify(bodytosend)
                }
            }
            response = await fetch(link, options);
            // clearTimeout(timeoutId);
            //we will get the keys in the bodytosend so that we dotn have to computet in this 
            let data = null;
            const contentType = response.headers.get("content-type");
            // will work on this data later on
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            clearTimeout(timeoutId);
            // const data = await response.json();
            // console.log("The data is ", data);
            return [response.ok ? 1 : 0,
                data, response.status];

        } catch (error) {
            if (error.name === 'AbortError') {
                return [0, "Request timed out", 408];
            }

            clearTimeout(timeoutId);
            console.error("Error sending request:", error);
            return [0, error.message, 500];



        }
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



}


const requestengine = async ({ link, method, headers, bodytosend, isget, data }) => {
    // console.log("The data is ", data);

    const engine = new concurrencyengine({ link, method, headers, bodytosend, isget, data });
    // console.log("The engine is ", engine);
    const result = await engine.beginsimulation();
    console.log("The result is ", result);



    return [1, "Request sent successfully", 200];


}

// now lets write  a test for thsi file only

export { requestengine };