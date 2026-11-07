
import { apitestsController } from './src/controllers/apitests.js';
import { concurrencetestcontroller } from './src/controllers/concurrencetest.js';
import { sequencetestController } from './src/controllers/sequencetest.js';
import { getresultsController, getpagenoController } from './src/controllers/results.js';
// console.log("Manager file is working");
//documentation
import { documentation } from './documentation.js';


const createReqRes = (bodyData, files = null) => {
    //Thi siwll help in create a request and response object for routes so no reqrite is needed
    const req = {
        body: bodyData,
        file: files,
        files: files,
        headers: {}
    };
    const res = {
        status: (code) => {
            statusCode: 200,
                res.statusCode = code;
            return res;
        },
        json: (data) => {
            res.data = data;
            return res;
        },
        send: (data) => {
            res.data = data;
            return res;
        }
    }

    return { req, res };
}
const parseresdata = (res) => {
    // return res.data;
    var keys = ["message", "metrics", "data"];
    const success = res.statusCode >= 200 && res.statusCode < 300;
    const message = res.data?.message || (success ? "Success" : "Error");
    const formatted = {
        metrics: res.data?.metrics || {},
        data: res.data?.data || {}
    };
    return [message, formatted, res.statusCode];
}
const Routes = {
    "apitests": apitestsController,
    "concurrencetests": concurrencetestcontroller,
    "sequencetests": sequencetestController,
    "historyresults": getresultsController,
    "recentresults": getpagenoController,
    "documentation": documentation
}


const runApiTest = async (bodyData) => {
    const { req, res } = createReqRes(bodyData);
    await Routes.apitests(req, res);
    return parseresdata(res);
}
const runConcurrencyTest = async (bodyData) => {

    const { req, res } = createReqRes(bodyData);
    await Routes.concurrencetests(req, res);
    //this function will need change in v2 by adding more workers and concurrency level to the bodyData
    return parseresdata(res);
}
const runSequenceTest = async (bodyData) => {
    const { req, res } = createReqRes(bodyData);
    await Routes.sequencetests(req, res);
    return parseresdata(res);
}
const runHistoryResults = async (bodyData) => {
    const { req, res } = createReqRes(bodyData);
    await Routes.historyresults(req, res);
    return parseresdata(res);
}
const runRecentResults = async (bodyData) => {
    const { req, res } = createReqRes(bodyData);
    await Routes.recentresults(req, res);
    return parseresdata(res);
}
const getdocument = async (endpoint) => {
    const docs = Routes.documentation;
    var message = "";
    var statuscode = 200;
    var worked = 0;
    if (typeof endpoint !== "string") {
        message = `The Endpoint requested is not a string datatype ${endpoint} is invalid`;
        statuscode = 400;
    }
    else if (!Object.hasOwn(docs, endpoint)) {
        // console.log(endpoint)
        message = "Api Endpoint is not availabe\nAvailble endpoints are:" + Object.keys(docs).join(", ")
        statuscode = 404;
    } else {
        message = docs[endpoint];
        worked = 1;
    }
    // console.log("messages"+message)
    return [worked, { data: message }, statuscode]



}


export { runApiTest, runConcurrencyTest, runSequenceTest, runHistoryResults, runRecentResults,getdocument };