import { parsebody, parsedata, toogledata } from '../services/sequencetest.js';
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
    totalrequestsdata.push(globaldata[1][0]); //We will push the parsed body to the totalrequestsdata array
    globaldata = globaldata[1][1]; //We will get the global data from the first request
    // console.log("The First request is :", totalrequestsdata[0]);
    for (var reqnum = 1; reqnum < reqbody.length; reqnum++) {
        const request = reqbody[reqnum];
        // log(`Processing request number ${reqnum + 1}: ${JSON.stringify(request)}`, 'info', 'sequencetest.log');
        const nextrequest = totalrequestsdata[reqnum - 1]; //We will get the previous request data to resolve the current request
        const body = await parsebody(request, req.file, globaldata, false, nextrequest);
        // console.log("After parsing the body for request number ", reqnum + 1, ":", body);
        // console.log("Parsed body is ", body);

        if (body[0] === 0) {
            // console.log("Error in parsing the body for request number ", reqnum + 1, ":", body[2]);
            return res.status(400).json({ message: body[1] });
        }
        totalrequestsdata.push(body[1]); //We will push the parsed body to the totalrequestsdata array
        // console.log("Before toggling the data for request number ", reqnum, ":",to  previousrequest = {};talrequestsdata[reqnum-1]);
        totalrequestsdata[reqnum - 1] = toogledata(totalrequestsdata[reqnum - 1], body[1]); //We will toggle the data for the previous request based on the current request
        // console.log("After toggling the data for request number ", reqnum, ":", totalrequestsdata[reqnum-1]);
        //Each push reprsets a single request that we will send to the handelrequests function
    }
    const ws = req.ws; //will work on this later
    // console.log("The total requests data is :", totalrequestsdata);
    //Body has been parsed and validated, now we can send the response to the client
    const finalresult = await handelrequests(totalrequestsdata, globaldata, ws); //We will send the parsed body to the handelrequests function
    return res.status(finalresult[2]).json(finalresult[1]); //We can diraclty send the response we will validate that in the function itself    
}
const sendrequest = async ({ link, method, headers, data = {}, filedata = null, fileavailable = false }) => {
    //This is the basic function which will be used to send the request to the other server
    //casue we have parsed everything we can direcly perfrom the tasks
    // console.log("Sending request to link:", link, "with method:", method, "and headers:", headers, "and data:", data, "and file:", file, "and fileavailable:", fileavailable);
    // log(`Sending request to link: ${link} with method: ${method} and headers: ${JSON.stringify(headers)} and data: ${JSON.stringify(data)} and file available: ${fileavailable}`, 'info', 'sequencetest.log');
    //    log("The link is",link)
    if (fileavailable) {
        return await sendfile(link, method, headers, filedata);
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
    // console.log("The data sent is ", data);
    let responseData;
    try {
        responseData = await result.json();
    } catch {
        responseData = await result.text();
    }
    return [result.ok ? 1 : 0, {
        status: result.status, data: responseData,
        headers: Object.fromEntries(result.headers.entries())
    }, result.status];

}
const sendfile = async (link, method, headers, filedata) => {
    const stream = fs.createReadStream(filedata.path);
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

        if (conditionresult[0] === 0) {
            console.log("HIIIIIIII");
            return [0, {
                message: 'Condition not met for the following',
                conditionmessage: conditionresult[1],
                conditionresult: conditionresult
            }, 400];
        } else if (conditionresult[0] === -2) {
            //This is like a checkpoint to rasie
            const message = conditionresult[1].message;
            const result = handelcheckpoint(message, [globalresponse, finalresult, originalrequest], websocket);
            if (result[0] === 0) {
                //Now should  i try to hold the users for a checkpoint miss big thinking here

            }
            finalresult.push({
                request: originalrequest,
                response: response[1],
                conditionresult: conditionresult
            });
        }
        // console.log("Condition result for request number ", i + 1, ":", conditionresult[1]);
        if (conditionresult[1].nextdataavailable) {
            previousrequest = originalrequest; //We will store the nextdata in the nextrequest object
        } else {
            previousrequest = {}; //If there is no nextdata we will reset the nextrequest object
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
                // console.log("Condition result for condition ", condition, ":", result);
                if (result[0] === 1) {
                    // console.log("Condition met for condition ", condition, ":", result[1]);
                    var returnval = -1 ? result.messageavailable : 1;
                    var chgdata = changedata(condition, response, {});
                    if (chgdata[0] == 0) return [chgdata[0], chgdata[1], 400];
                    return [returnval, chgdata[1], 200];

                    // return [returnval, chgdata, 200]; //Till it is propley wired in
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
    // return request; //This is a test function to check if the data is resolved or not

    if (!previousrequest ||
        typeof previousrequest !== 'object' ||
        Array.isArray(previousrequest)) {
        return request; //If there is no nextrequest we will return the current request
    }//measn it is the first request so we can leave that here itslef

    const hasnextdata = previousrequest.nextdataavailable ?? false;
    const hasnextheader = previousrequest.nextheaderavailable ?? false;

    if (!hasnextdata && !hasnextheader) {
        return request; //If there is no nextdata or nextheader we will return the current request
    }

    const getvalue = (source, path) => {
        if (source === undefined || source === null) {
            return { found: false, value: undefined };
        }

        if (typeof source === 'object' && Object.hasOwn(source, path)) {
            return { found: true, value: source[path] };
        }

        let current = source;

        for (const part of path.split('.')) {
            if (current === undefined ||
                current === null ||
                typeof current !== 'object' ||
                !Object.hasOwn(current, part)) {
                return { found: false, value: undefined };
            }

            current = current[part];
        }

        return { found: true, value: current };
    }

    const resolvevalue = (value, source) => {
        if (Array.isArray(value)) {
            return value.map(v => resolvevalue(v, source));
        }

        if (value !== null && typeof value === 'object') {
            return Object.fromEntries
                (Object.entries(value).map(([k, v]) =>
                    [k, resolvevalue(v, source)]));
        }

        if (typeof value !== "string") {
            return value; //If the value is not a string we will return the value
        }

        const exactmatch = value.match(/^{{\s*(.*?)\s*}}$/);

        if (exactmatch) {
            const key = exactmatch[1].trim();
            const result = getvalue(source, key);

            return result.found ? result.value : value;
        }

        return value.replace(/{{\s*(.*?)\s*}}/g, (match, key) => {
            const result = getvalue(source, key.trim());

            return result.found ? String(result.value) : match;
        });
    }

    const resolvedrequest = { ...request };

    if (hasnextdata) {

        if (previousrequest.overwritenextdata === true) {
            resolvedrequest.data = previousrequest.nextdata; //If the nextdata is available we will override the data in the current request
        } else {
            resolvedrequest.data =
                resolvevalue(request.data, previousrequest.nextdata); //If the nextdata is available we will resolve the data in the current request
        }

    }

    if (hasnextheader) {

        if (previousrequest.overwriteheader === true) {
            resolvedrequest.headers = previousrequest.nextheader; //If the nextheader is available we will override the header in the current request
        } else {
            resolvedrequest.headers =
                resolvevalue(request.headers, previousrequest.nextheader); //If the nextheader is available we will resolve the header in the current request
        }

    }

    for (const key of Object.keys(request)) {
        if (key === "data" || key === "headers" || key === "condition") {
            continue; //We have already resolved the data and headers and condition
        }

        if (hasnextdata) {
            resolvedrequest[key] =
                resolvevalue(request[key], previousrequest.nextdata); //If the nextdata is available we will resolve the other keys in the current request
        }

    };

    return resolvedrequest;
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
    // return [1, condition, 200] //This is a test function to check if the condition is met or not
    const status = Array.isArray(response.status) ? response.status : [response.status];
    const conditionstatus = condition.status;
    const givencondition = condition.condition;
    if (condition.conditionavailable == false) return [-1] //just to thow off the if condition
    const refactordata = (givencondition) => {
        if (typeof givencondition === "number") return givencondition; //measn directly the number is given so we can return that
        if (typeof givencondition === "string") {
            return givencondition.replace(/{{\s*(.*?)\s*}}/g, "$1");
        } if (typeof givencondition === "object") {
            //Then iterate though each key and get the value and return that
            const result = {};
            for (const key in givencondition) {
                result[key] = refactordata(givencondition[key]);
            }
            return result;

        }
        return givencondition; //measn the data is given in the response so we can return that
    };
    const data = refactordata(givencondition); //This will give us the data to compare with the status code
    //if the data is string we can directy comp that to status code
    if (typeof data === "number") {
        for (const stat of status) {
            if (stat === givencondition || stat == parseInt(givencondition)) {
                return [1, condition, 200];
            }
            //simple comparision if the status is number we can directy comp that to status code

        }
        return [0, {
            message: `The status code ${givencondition} is not present in the response status codes ${status}`,
            condition: condition
        }, 400]; //Invalid condition format



    };
    if (typeof data === "object") {
        const result = {};
        var index = 0;
        for (const cond of data) {
            result[index] = conditionvalidator(cond, response); //validate each condition
            index++;
        }
        return [1, result, 200]; //return the result of the validation
    }
    //Now the actula comparision the string 

    const matchoperators = data.match(/===|!==|==|!=|>=|<=|>|</);
    if (!matchoperators) {
        //Now here is something to thnk , the strinng could be a number also , lets check with the status code 
        var msg;
        if (typeof data === "string" && status.includes(parseInt(data))) {
            for (const stat of status) {
                if (stat === parseInt(data)) {
                    return [1, condition, 200];
                }
            }
            msg = `The status code ${data} is not present in the response status codes ${status}`;


        } else {
            msg = `Invalid condition format
            The available operators are ===, !==, ==, !=, >=, <=, >, <
            `
        }

        return [0, {
            message: msg, condition: condition
        }, 400]; //Invalid condition format
    }
    const operator = matchoperators[0];
    var [left, right] = data.split(operator).map(s => s.trim());
    const val = normalizeValue(left, right);
    if (val[0] == 0) return [0, { message: val[1], condition: condition }, 400];
    [left, right] = val[1]; //normalized values easy to compare to our data
    const operators = { //simple replacemnt of the switch case with the object mapping
        "==": (a, b) => a == b,
        "===": (a, b) => a === b,
        "!=": (a, b) => a != b,
        "!==": (a, b) => a !== b,
        ">": (a, b) => a > b,
        "<": (a, b) => a < b,
        ">=": (a, b) => a >= b,
        "<=": (a, b) => a <= b
    };
    const alldatavalues = {
        response,
        condition: condition,
        data
    };
    left = objscreation(left);
    right = objscreation(right);
    //for indinvidual items
    // console.log("Left value:", left, "Right value:", right, "Operator:", operator);
    // var message = `The condition ${left} ${operator} ${right} is ${finalresult ? "met" : "not met"}`;
    // const whichisaarray = Array.isArray(left) || Array.isArray(right); //so now just loop though them 
    // const finalresult = operators[operator](left, right);
    const leftValues = Array.isArray(left) ? left : [left];
    const rightValues = Array.isArray(right) ? right : [right];
    let finalresult = false;
    for (const l of leftValues) {
        for (const r of rightValues) {
            if (operators[operator](l, r)) {
                finalresult = true;
                break;
            }
        }

        if (finalresult) break;
    }

    const message = `The condition ${left} ${operator} ${right} is ${finalresult ? "met" : "not met"}`;

    return [finalresult, { message, condition }, 200];






}
const normalizeValue = (left, right) => {
    return [1, [left, right]]; //later on 
}
const objscreation = (value, alldatavalues) => {
    //Will get the object path from the value and return the value from the response object
    value = value.trim();
    const match = value.match(/^{{\s*(.*?)\s*}}$/);

    if (match) {
        value = match[1];
    }

    if (!isNaN(value) && value !== "") {
        return Number(value);
    }


    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }

    // Object path
    const result = value.split(".")
        .reduce((obj, key) => obj?.[key], alldatavalues);
    return result !== undefined ? result : value; //If the value is not found in the response object we will return the value itself

}

const changedata = (data, response, nextrequest = {}) => {
    /*
    This function is called after a condition has been successfully verified.
    
        The purpose of this function is to prepare the data that will be used by
        the next request in the sequence.
    
        The condition can define:
        - Headers to be added or changed in the next request
        - Headers to be removed from the next request
        - Body data to be added or changed in the next request
        - Body data to be removed from the next request
        - Explicit nextdata that should be passed to the next request
        - Whether the nextdata should overwrite or merge with existing data
    */
    console.log("All parameters:", data);
    console.log("All parameters:", response);






    return [1, response] //test
}


export { sequencetestController };