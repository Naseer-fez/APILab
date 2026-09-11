
import { parsebody, gibberish } from '../services/apitests.js';
//gibberish is the speical symbol to diffrenct the user and server data

const apitestsController = async (req, res) => {
    console.log("API TESTS CONTROLLER");
    const data = parsebody(req.body);
    // console.log("Data is: ", data);
    // Time to validate this now 
    if (data[0] === -1) {
        return res.status(data[2]).json({
            message: data[1],
            data: data
        });
    }
    else if (data[0] === 0) {
        {
            return res.status(data[2]).json({
                message: data[1],
                data: data
            });
        }

    }

    // console.log("Data is: ", data);
    const serverkey = gibberish + "server" + gibberish
    // this is complicated to look but easy to parse the data instead of a complex 2d object to a array
    // console.log("Output rate is: ", data);
    //Now all the validation and the parsing is done 
    //now we need to send the request to the test  and then estimae the results
    const server = data[1][serverkey];
    // console.log("Server is: ", server);
    delete data[1][serverkey]
    const outputrate = await apitests(server.link, server.method, data[1], server.requests);
    return res.status(data[2]).json({
        message: data[1],
        data: outputrate
    });
}

const sendrequest = async (link, method, obj) => {
    // Now we will send the request to the link with the method and the data/
    // We will use the fetch API to send the request
    console.log("Sending request to: ", link);
    try {
        let result;
        if (method === 'GET') {
            // For GET requests, we will append the data as query parameters
            const url = new URL(link);
            Object.entries(obj).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
            result = await fetch(url, { method: 'GET' });
        } else {
            result = await fetch(link, {
                method: method.toUpperCase(),
                body: JSON.stringify(obj),
                headers: { 'Content-Type': 'application/json' }
            });
        }

        //Now i can just send anything back but i fell it will be better to send 
        // The status code , the any other messagae from the server and the data we used 
        let body;
        try {
            body = await result.text();
        } catch {
            body = "No Body Received";
        }

        return {
            ok: result.ok,
            status: result.status,
            statusText: result.statusText,
            response: body || "No Body Received",
            datasent: obj
        };
        //just wraped evething in try block  sedlife
    } catch (error) {
        return {
            ok: false,
            status: null,
            statusText: null,
            response: null,
            datasent: obj,
            error: error.message
        };


    }

}
// In this function we can call the cpp code later on to impove the speed and to send the maxium requests to the server
//for now it will be sending requests through node 

//Need to work on this combination and how the requests are suppoed to go 
const apitests = async (link, method, data, requests) => {

    const promises = [];
    // console.log("Data is: ", data);
    let i = 0;
    while (i < requests) {
        {
            for (const combination of generatecombinations(data)) {

                // console.log("Combination is: ", combination);
                i++;

                promises.push(sendrequest(link, method, combination));

            }
        }
    }

    const results = await Promise.all(promises);
    //Now at this poitn we will get back our cpp output we will then parse that output here
    return resultsparser(results);
}

const resultsparser = (results) => {
    const successfulRequests = results.filter(response => response.ok).length;
    const failedRequests = results.length - successfulRequests;
    const body = {
        successful: successfulRequests,
        failed: failedRequests
    };
    console.log("Results are: ", body);
    return body;

};

// Good luck making this in cpp man in future  i just had to copy this full
function* generatecombinations(data) {

    const keys = Object.keys(data);

    function* buildCombinations(index, current) {


        // All keys have been processed
        if (index === keys.length) {

            yield { ...current };

            return;
        }

        const key = keys[index];

        // Your generated test values are stored in range
        const values = data[key].range;

        for (const value of values) {

            current[key] = value;



            yield* buildCombinations(
                index + 1,
                current
            );
        }
    }

    yield* buildCombinations(0, {});
}


export { apitestsController };