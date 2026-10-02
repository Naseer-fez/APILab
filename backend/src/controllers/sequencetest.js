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
    log(`Received request with body: ${JSON.stringify(req.body.request)}`,
        'info', 'sequencetest.log');
    // console.log("The req body:",req.body.request)
    const reqbody = Array.isArray(req.body.request) ? req.body.request : [req.body.request];
    //We will check if the body is an array or not, if not we will make it an array
    for (var reqnum = 0; reqnum < reqbody.length; reqnum++) {
        const request = reqbody[reqnum];

        // log(`Processing request: ${JSON.stringify(request)}`, 'info', 'sequencetest.log');
        // console.log("Before parsing the body for request number ", reqnum + 1, ":", request);
        const body = await parsebody(request, req.file);
        // console.log("After parsing the body for request number ", reqnum + 1, ":", body);
        // console.log("Parsed body is ", body);

        if (body[0] === 0) {
            return res.status(400).json({ message: body[2] });
        }
        totalrequestsdata.push(body[1]); //We will push the parsed body to the totalrequestsdata array
        //Each push reprsets a single request that we will send to the handelrequests function
    }
    const ws = req.ws;
    //Body has been parsed and validated, now we can send the response to the client
    const finalresult = await handelrequests(totalrequestsdata, ws); //We will send the parsed body to the handelrequests function
    return res.status(finalresult[2]).json(finalresult[1]); //We can diraclty send the response we will validate that in the function itself    
}
const sendrequest = async ({ link, method, headers, data = {}, file = null, fileavailabe = false }) => {
    //This is the basic function which will be used to send the request to the other server
    //casue we have parsed everything we can direcly perfrom the tasks
    // console.log("Sending request to link:", link, "with method:", method, "and headers:", headers, "and data:", data, "and file:", file, "and fileavailabe:", fileavailabe);
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
    return [result.ok ? 1 : 0, {
        status: result.status, data: await result.json(),
        headers: Object.fromEntries(result.headers.entries())
    }, result.status];

}
const sendfile = async (link, method, headers, file) => {
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
const handelrequests = async (body, websocket = null) => {
    //We have the body
    //First pick the data and send it Cause this is a list we can easily iterate over that
    // a loop is good but the best idea will be a recursive function that will send the '
    // request and check the condition and then move forward so that we can eaisly chnage the data
    const globalresponse = {
        response: [],
        variables: {}
    };
    const finalresult = [];
    for (let i = 0; i < body.length; i++) {

        const originalrequest = body[i];
        const request = resolvedata(originalrequest, globalresponse);
        // console.log("Resolved request for request number ", i + 1, ":", request);
        const response = await sendrequest(request);
        if (response[0] === 0) {
            return response; //If the request failed we will return the error
        }
        globalresponse.response[i] = response[1]; //We will store the response in the globalresponse object
        const conditionresult = conditionschecker(originalrequest.conditions
            , response[1]);
        finalresult.push({
            request: originalrequest,
            response: response[1],
            conditionresult: conditionresult
        });
        if (conditionresult === 0) {
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
    const availableconditions = ["if", "else if", "else"];
    for (const key of availableconditions) {
        if (Object.hasOwn(conditiondata, key)) {
            for (const condition of conditiondata[key]) {
                const result = conditionvalidator(condition, response);
                //with this we can easily go though all the condition easily
                if (result[0] === 1) {
                    if (messageavailable) {
                        return [-2, { message: condition.message, condition: condition }, 200];
                    }
                    return [1, condition, 200];

                }
            }
        }
    }
}
const resolvedata = (request, globaldata) => {

    const getValue = (path) => {
        let current = globaldata;

        for (const part of path.split(".")) {
            if (current === null || current === undefined) {
                throw new Error(`Reference "${path}" does not exist`);
            }

            // Support array indexes like response.0.data.userid
            if (!(part in Object(current))) {
                throw new Error(`Reference "${path}" does not exist`);
            }

            current = current[part];
        }

        return current;
    };

    const resolveValue = (value) => {

        // null, undefined, number, boolean
        if (
            value === null ||
            value === undefined ||
            typeof value === "number" ||
            typeof value === "boolean"
        ) {
            return value;
        }

        // String
        if (typeof value === "string") {

            // Entire string is a placeholder
            // "{{response.0.data.userid}}"
            const exactMatch = value.match(/^{{\s*(.*?)\s*}}$/);

            if (exactMatch) {
                return getValue(exactMatch[1].trim());
            }

            // Placeholder inside a string
            // "Bearer {{response.0.data.token}}"
            // "/users/{{response.0.data.userid}}"

            return value.replace(
                /{{\s*(.*?)\s*}}/g,
                (match, path) => {
                    const resolved = getValue(path.trim());

                    return String(resolved);
                }
            );
        }

        // Array
        if (Array.isArray(value)) {
            return value.map(item => resolveValue(item));
        }

        // Object
        if (typeof value === "object") {

            const result = {};

            for (const [key, val] of Object.entries(value)) {
                result[key] = resolveValue(val);
            }

            return result;
        }

        return value;
    };

    return resolveValue(request);
};
const handelcheckpoint = async (message, completedata, websocket) => {
    //we have open a websocket connection and send the message to the client and wait for the response
    //Hard coded this function
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