
import { apitestsController } from './src/controllers/apitests.js';
import { concurrencetestcontroller } from './src/controllers/concurrencetest.js';
import { sequencetestController } from './src/controllers/sequencetest.js';
// console.log("Manager file is working");



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
    "sequencetests": sequencetestController
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

export { runApiTest, runConcurrencyTest, runSequenceTest };