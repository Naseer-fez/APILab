import { resultfilepath } from '../services/resulthistory.js';
import fs from 'node:fs';


const TOTALRECORDS = 1000; //maximum records per history file

const getresultsController = (req, res) => {
    //This is for the get

    const resultfields = ["success", "failure", "message", "metrics", "data"];
    const data = {};
    data.resultno = getdata(req, "resultno");
    if (data.resultno === undefined) {
        return res.status(400).json({
            message: "resultno is required"
        });
    }
    for (const field of resultfields) {
        data[field] = getdata(req, field);
    }

    const requestedFields = resultfields.filter(field => data[field] !== undefined);
    if (requestedFields.length === 0) {
        const fullRecord = gethistorydata(data.resultno, null);
        if (fullRecord[2] !== 200) return res.status(fullRecord[2]).json({ message: fullRecord[1].message });
        return res.status(200).json(fullRecord[1].data);
    }

    var historyresult = {};
    for (const field of requestedFields) {
        const result = gethistorydata(data.resultno, field);
        if (result[2] !== 200) return res.status(result[2]).json({ message: result[1].message });
        historyresult[field] = result[1].data;
    }

    return res.status(200).json(historyresult);



}

const getdata = (req, field) => //to finnaly get the data
    req.params?.[field] ?? req.query?.[field] ?? req.body?.[field];

const gethistorydata = (resultno = null, field = null) => {
    //This is the main function to get the data from the history file
    if (resultno === null || resultno === undefined || String(resultno).trim() === '') {
        return [0, { message: "Result number is required" }, 400];
    }

    resultno = Number(resultno);
    if (!Number.isSafeInteger(resultno)) {
        return [0, { message: "Invalid result number. It should be an integer" }, 400];
    }

    if (resultno == 0) return readallhistory(field);
    if (isNaN(resultno) || resultno < 0) {
        return [0, { message: "Invalid result number. It should be a positive integer or 0 for all records\nAll history records are 1 indexed" }, 400];
    }
    const filenumber = Math.ceil(resultno / TOTALRECORDS);
    const recordnumber = ((resultno - 1) % TOTALRECORDS) + 1;
    return readthehistoryfile(filenumber, recordnumber, field);

}

const readallhistory = (field = null) => {
    let page = 1;
    let allhistory = [];
    const validfield = ["message", "success", "failure", "metrics", "data"];
    if (field !== null && !validfield.includes(field)) {
        return [0, { message: `Invalid field: ${field}. Valid fields are: ${validfield.join(', ')}` },
            400];
    }
    while (true) {
        const filepath = resultfilepath(page);
        if (!fs.existsSync(filepath)) {
            break;
        }
        const filecontent = fs.readFileSync(filepath, 'utf8');
        if (!filecontent) {
            break;
        }
        const history = JSON.parse(filecontent);
        if (!field) {
            allhistory.push(...history);
        } else if (field === "success") {
            allhistory.push(...history.filter(item => item.success === true || item.success === "PASS"));
        } else if (field === "failure") {
            allhistory.push(...history.filter(item => item.success === false || item.success === "FAIL"));
        } else {
            allhistory.push(...history.map(item => item[field]));
        }

        page++;

    }
    const statuscode = allhistory.length === 0 ? 404 : 200;
    const message = allhistory.length === 0
        ? "No history records found in the history files"
        : `All history retrieved. Total records: ${allhistory.length}`;
    return [1, { message: message, data: allhistory }, statuscode];
}

const readthehistoryfile = (resultno = 1, recordno = 1, field = null) => {
    const filepath = resultfilepath(resultno);
    if (!fs.existsSync(filepath)) {
        return [0, { message: `History file for result number ${resultno} not found` }, 404];
    }
    const filecontent = fs.readFileSync(filepath, 'utf8');
    if (!filecontent) {
        return [0, { message: `History file for result number ${resultno} is empty` }, 404];
    }
    const history = JSON.parse(filecontent);
    if (recordno < 1 || recordno > history.length) {
        return [0, { message: `Record number ${recordno} out of range. Choose from 1 to ${history.length}` }, 404];
    }
    const data = field ? history[recordno - 1][field] : history[recordno - 1];

    return [1, { message: "Record found", data: data }, 200];

}





export { getresultsController };