import { parsebody } from '../services/sequencetest.js';
import WebSocket from 'ws';
import fs from 'fs';
import { log } from '../utils/logger.js';


const sequencetestController = async (req, res) => {
    // console.log("Received request with body: ", req.body);
    var totalrequestsdata = [];
    if (!req.body) {
        return res.status(400).json({ message: 'No body provided For the request' });
        //Simple but effective validation to check if the body is provided or not
    }

    // log(`Received request with body: ${JSON.stringify(req.body.request)}`,
    //     'info', 'sequencetest.log');
    // console.log("The req body:",req.body.request)
    const reqbody = Array.isArray(req.body.request) ? req.body.request : [req.body.request];
    //We will check if the body is an array or not, if not we will make it an array
    //Lets do onething only send one req for this and only get the global data for this 
    var globaldata = await parsebody(reqbody[0], req.file, {}, true);
    // console.log("After parsing the body for request number 1:", globaldata);
    if (globaldata[0] === 0) {
        return res.status(400).json({ message: globaldata[2] });
    }
    totalrequestsdata.push(globaldata[1][1]); //We will push the parsed body to the totalrequestsdata array
    globaldata = globaldata[1][0]; //We will get the global data from the first request
    for (var reqnum = 1; reqnum < reqbody.length; reqnum++) {
        const request = reqbody[reqnum];
        // log(`Processing request number ${reqnum + 1}: ${JSON.stringify(request)}`, 'info', 'sequencetest.log');
        const body = await parsebody(request, req.file, globaldata, false);
        // console.log("After parsing the body for request number ", reqnum + 1, ":", body);
        // console.log("Parsed body is ", body);

        if (body[0] === 0) {
            // console.log("Error in parsing the body for request number ", reqnum + 1, ":", body[2]);
            return res.status(400).json({ message: body[1] });
        }
        totalrequestsdata.push(body[1]); //We will push the parsed body to the totalrequestsdata array
        //Each push reprsets a single request that we will send to the handelrequests function
    }
    const ws = req.ws; //will work on this later
    //Body has been parsed and validated, now we can send the response to the client
    const finalresult = await handelrequests(totalrequestsdata, globaldata, ws); //We will send the parsed body to the handelrequests function
    return res.status(finalresult[2]).json(finalresult[1]); //We can diraclty send the response we will validate that in the function itself    
}
const sendrequest = async ({ link, method, headers, data = {}, filedata = null, fileavailabe = false }) => {
    //This is the basic function which will be used to send the request to the other server
    //casue we have parsed everything we can direcly perfrom the tasks
    // console.log("Sending request to link:", link, "with method:", method, "and headers:", headers, "and data:", data, "and file:", file, "and fileavailabe:", fileavailabe);
    // log(`Sending request to link: ${link} with method: ${method} and headers: ${JSON.stringify(headers)} and data: ${JSON.stringify(data)} and file available: ${fileavailabe}`, 'info', 'sequencetest.log');
    //    log("The link is",link)
    if (fileavailabe) {
        return await sendfile(link, method, headers, file);
    } //Simple abstraction
    link = (() => {
        if (method === 'GET') {
            return Object.keys(data).reduce((url, key, index) => {
                return url + `${index === 0 ? '?' : '&'}${key}=${encodeURIComponent(data[key])}`;
            }, link);
        } else {
            return link;
        }
    })();

    //Normal request will be sent by fetch  simple as it is 
    var result = [];
    if (method === 'GET') {
        result = await fetch(link, {
            method: method,
            headers: headers
        });
    } else {    // console.log("Sending Data is :", data);
        result = await fetch(link, {
            method: method,
            headers: headers,
            body: JSON.stringify(data)
        });
    }
    console.log("The data sent is ", data);
    return [result.ok ? 1 : 0, {
        status: result.status, data: await result.json(),
        headers: Object.fromEntries(result.headers.entries())
    }, result.status];

}
const sendfile = async (link, method, headers, filedata) => {
    const stream = fs.createReadStream(file.path);
    try {
        const response = await fetch(link, {
            method: method,
            headers: headers,
            body: stream,
            duplex: 'half'
        });
        return [1, { status: response.status, data: await response.json() }, response.status];
    }
    catch (error) {
        return [0, { message: 'Error in sending the request', error: error.message }, 500];
    }
    finally {
        stream.destroy();
    }


}
const handelrequests = async (body, globaldata, websocket = null) => {
    //We have the body
    //First pick the data and send it Cause this is a list we can easily iterate over that
    // a loop is good but the best idea will be a recursive function that will send the '
    // request and check the condition and then move forward so that we can eaisly chnage the data
    // console.log("hi");
    // log(`Handling requests with body: ${JSON.stringify(body)}`, 'info', 'sequencetest.log');
    const globalresponse = {
        response: [],
        variables: {}
    };
    const finalresult = [];
    var nextupdate = false;
    var previousrequest = {};

    for (let i = 0; i < body.length; i++) {

        const originalrequest = body[i];
        const request = await resolvedata(originalrequest, previousrequest);

        // console.log("Resolved request for request number ", i + 1, ":", request);
        const response = await sendrequest(request);
        if (response[0] === 0) {
            return response; //If the request failed we will return the error
        }
        globalresponse.response[i] = response[1]; //We will store the response in the globalresponse object
        const conditionresult = conditionschecker(originalrequest.condition
            , response[1]);
        finalresult.push({
            request: originalrequest,
            response: response[1],
            conditionresult: conditionresult
        });
        if (conditionresult[0] === 0) {
            return [0, {
                message: 'Condition not met',
                conditionresult: conditionresult
            }, 400];
        } else if (conditionresult[0] === -2) {
            //This is like a checkpoint to rasie
            const message = conditionresult[1].message;
            const result = handelcheckpoint(message, [globalresponse, finalresult, originalrequest], websocket);
            if (res[0] === 0) {
                //Now should  i try to hold the users for a checkpoint miss big thinking here

            }

        }
        
        if (conditionresult[1].nextdataavailable) {
            previousrequest = conditionresult[1].nextdata; //We will store the nextdata in the previousrequest object
        } else {
            previousrequest = {}; //If there is no nextdata we will reset the previousrequest object
        }
    }

    return [1, finalresult, 200];


}
const conditionschecker = (conditiondata, response) => {
    if (conditiondata === undefined || conditiondata === null) {
        return [1, {}, 200] //Nothing to check 
    }
    var messageavailable = false;
    if (conditiondata.messageavailable) {
        messageavailable = true;
    }
    const availableconditions = ["if", "elseif", "else"];
    for (const key of availableconditions) {
        if (Object.hasOwn(conditiondata, key)) {
            for (const condition of conditiondata[key]) {
                const result = conditionvalidator(condition, response);
                //with this we can easily go though all the condition easily
                if (result[0] === 1) {
                    if (messageavailable) {
                        return [-2, condition, 200];;
                    }
                    return [1, condition, 200];
                }
            }
        }
    }
    return [0, conditiondata, 200];

}
const resolvedata = async (request, previousrequest = {}) => {
    /*So this function first reads the data  and ready the data to the next request
    So based on the previous request we will alter the data in this 
    the assumuption is that only succuessful request will be sent to the next request so
     we can easily use the previous request to get the data
    so in this fucntion i will get the current data and then the previous data 
    I need to look in the previous data and then reqite the current data*/
   const resolveValue = (value) => {

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(resolveValue);
        }

        // Handle nested objects
        if (value !== null && typeof value === 'object') {
            return Object.fromEntries(
                Object.entries(value).map(([key, val]) => [
                    key,
                    resolveValue(val)
                ])
            );
        }

        // Only strings can contain placeholders
        if (typeof value !== 'string') {
            return value;
        }

        // Exact placeholder: "{{userId}}"
        // Keeps the original data type
        const exactMatch = value.match(/^{{\s*([^{}]+?)\s*}}$/);

        if (exactMatch) {
            const key = exactMatch[1].trim();

            if (Object.hasOwn(previousData, key)) {
                return previousData[key];
            }

            return value;
        }

        // Placeholder inside a larger string
        // Example: "Bearer {{token}}"
        return value.replace(
            /{{\s*([^{}]+?)\s*}}/g,
            (match, key) => {
                key = key.trim();

                if (Object.hasOwn(previousData, key)) {
                    return String(previousData[key]);
                }

                return match;
            }
        );
    };

    // Resolve the request, but leave condition untouched
    return Object.fromEntries(
        Object.entries(request).map(([key, value]) => [
            key,
            key === 'condition' ? value : resolveValue(value)
        ])
    );



};
const handelcheckpoint = async (message, completedata, websocket) => {
    //we have open a websocket connection and send the message to the client and wait for the response
    //Hard coded this function
    return [1, 1, 200]; //Not yet built
    const datatosend = {
        "message": message,
        "globalresponse": completedata[0],
        "finalresult": completedata[1],
        "originalrequest": completedata[2]
    }
    const result = await sendWebSocketMessage(websocket, datatosend);
    return result;



}

const conditionvalidator = (condition, response) => {
    const status = response.status;
    const conditionstatus = condition.status;
    const givencondition = condition.condition;

    // First preference: explicit condition
    if (condition.conditionavailable) {
        // Example:
        // "{{response.body.age}} >= 18"

        const match = givencondition.match(
            /^{{\s*(.*?)\s*}}\s*(==|!=|>=|<=|>|<)\s*(.+)$/
        );

        if (!match) {
            return [0, "Invalid condition expression", 400];
        }

        const path = match[1];
        const operator = match[2];
        let expected = match[3].trim();

        // Resolve response.body.age
        let actual = response;

        for (const part of path.split(".")) {
            if (actual == null || !(part in actual)) {
                return [0, `Reference ${path} does not exist`, 400];
            }

            actual = actual[part];
        }

        // Convert expected value
        if (
            (expected.startsWith('"') && expected.endsWith('"')) ||
            (expected.startsWith("'") && expected.endsWith("'"))
        ) {
            expected = expected.slice(1, -1);
        } else if (expected === "true") {
            expected = true;
        } else if (expected === "false") {
            expected = false;
        } else if (expected === "null") {
            expected = null;
        } else if (!Number.isNaN(Number(expected))) {
            expected = Number(expected);
        }

        let result;

        switch (operator) {
            case "==":
                result = actual == expected;
                break;
            case "!=":
                result = actual != expected;
                break;
            case ">":
                result = actual > expected;
                break;
            case "<":
                result = actual < expected;
                break;
            case ">=":
                result = actual >= expected;
                break;
            case "<=":
                result = actual <= expected;
                break;
        }

        return result ? [1, condition] : [0];
    }

    // Second preference: status shortcut
    if (condition.statusavailable) {
        if (conditionstatus.includes(status)) {
            return [1, condition];
        }

        return [0];
    }

    return [-1];
};

export { sequencetestController };