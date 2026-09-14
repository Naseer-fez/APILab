class concurrencyengine {

    constructor({ link, method, headers, bodytosend, isget, data }) {

        this.controller = new AbortController();
        this.link = link;
        this.method = method;
        this.headers = headers;
        this.bodytosend = bodytosend;
        this.isget = isget;
        this.data = data;

        this.beginsimulation();
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
            completedrequest: 0,
            totalrequestfailed: 0
        }

        while (totaldata.totalrequestssent <= this.data.requests) {

            //now we will send the concurrent requests

            totaldata = await this.concurrentsendrequest({ totaldata: totaldata });
            totaldata.concurrentrequest += this.data.concurency;
            // console.log("The total requests sent is ", totaldata.completedrequest + totaldata.totalrequestfailed);
            await  this.sleep(this.data.interval);
            //to simulate the time interval between the requests

        }
        // console.log("The total data is ", totaldata);

        //tiem to send the request now



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
            reqs.push( this.sendrequest()
                .then((data) => {
                    if (data[0] === 1) {
                        totaldata.completedrequest += 1;

                    } else {
                        totaldata.totalrequestfailed += 1;
                    }
                    totaldata.totalrquestsendt += 1;
                }).catch((err) => {
                    console.log("The error is ", err);
                    totaldata.totalrequestfailed += 1;
                    totaldata.totalrquestsendt += 1;
                }));
        }
        await Promise.all(reqs)
        return totaldata;

    }
    startTimeout() {
        this.timeoutId = setTimeout(() => {
            this.controller.abort();
        }, this.data.timeout);

    }

    clearRequestTimeout() {
        clearTimeout(this.timeoutId);
    }
    async sendrequest() {
        const link = this.link;
        const method = this.method;
        const headers = this.headers;
        const bodytosend = this.bodytosend;


        // console.log("The link is ", link);
        var response;
        this.startTimeout();
        try {
            const options = {
                method: method,
                headers: headers,
                signal: this.controller.signal
            }
            if (method !== "GET") {
                options.body = JSON.stringify(bodytosend)
            }
            response = await fetch(link, options);
            this.clearRequestTimeout();
            //we will get the keys in the bodytosend so that we dotn have to computet in this 

            const data = await response.json();
            console.log("The data is ", data);
            return [1, data, response.status];

        } catch (error) {
            if (error.name === 'AbortError') {
                return [0, "Request timed out", 408];
            }

            this.clearRequestTimeout();
            console.error("Error sending request:", error);
            return [0, error.message, 500];



        }
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



}


const requestengine = async ({ link, method, headers, bodytosend, isget, data }) => {
    console.log("The data is ", data);

    const engine = new concurrencyengine({ link, method, headers, bodytosend, isget, data });



}

// now lets write  a test for thsi file only

export { requestengine };