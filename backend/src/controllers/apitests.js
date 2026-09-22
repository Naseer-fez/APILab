
import { parsebody, gibberish } from '../services/apitests.js';
import fs from 'fs';
import path from 'path';
import { filemanager } from '../services/apitests_file.js';

//gibberish is the speical symbol to diffrenct the user and server data

const apitestsController = async (req, res) => {
    const data = parsebody(req.body, req.file); // we have pased the body data and now we can use it to send the request to the endpoint
    // console.log("Data is: ", data);
    // Time to validate this now 
    if (data[0] === -1 || data[0] === 0) {
        return res.status(data[2]).json({
            message: data[1],
            data: data
        });
    }
    // console.log("Data is: ", data[1]);
    // console.log("Data is: ", data);
    const serverkey = gibberish + "server" + gibberish
    // this is complicated to look but easy to parse the data instead of a complex 2d object to a array
    // console.log("Output rate is: ", data);
    //Now all the validation and the parsing is done 
    //now we need to send the request to the test  and then estimae the results
    const server = data[1][serverkey];
    // console.log("Server is: ", server);
    delete data[1][serverkey]
    var sendingfunction;
    if (server.fileavailable) { //that is why we have chnaged it in the parser
        sendingfunction = filetests;
    } else {
        sendingfunction = apitests;
    }
    let filedata = data[1];
    
    var outputrate = await sendingfunction(
        {
            link: server.link,
            method: server.method,
            data: data[1],
            headers: server.headers,
            requests: server.requests,
            file: filedata
        }
    );
    if (outputrate[0] === 1) {
        outputrate = resultsparser(outputrate[1]);
    }

    return res.status(data[2]).json({
        message: data[1], //this the sent data
        data: outputrate //this is the result
    }); //chcek this is wrong righ
}

const sendrequest = async (link, method, headers, obj = {}, file = null, fieldname = "file") => {
    // Now we will send the request to the link with the method and the data/
    // We will use the fetch API to send the request
    // console.log("Sending request to: ", link);
    // console.log("Method is: ", method);
    // console.log("Data is: ", obj);
    try {
        let result;
        if (file) {
            const form = new FormData();
            for (const [key, value] of Object.entries(obj ?? {})) {
                form.append(key, String(value));
            }
            const filePath = typeof file === 'string' ? file : file.path;
            const originalName = typeof file === 'string' ? path.basename(file) : file.originalname;
            const mimeType = typeof file === 'string' ? 'application/octet-stream' : (file.mimetype || 'application/octet-stream');
            const filebuffer = await fs.promises.readFile(filePath);
            const blob = new Blob([filebuffer], { type: mimeType });
            //Need to get this filed name
            form.append(fieldname, blob, originalName);
            result = await fetch(link, {
                method: method.toUpperCase(),
                headers: headers,
                body: form
            });


        }


        else if (method === 'GET') {
            // For GET requests, we will append the data as query parameters
            const url = new URL(link);
            Object.entries(obj).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
            result = await fetch(url, { method: 'GET', headers: headers });
        } else {
            result = await fetch(link, {
                method: method.toUpperCase(),
                body: JSON.stringify(obj),
                headers: headers
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
const apitests = async ({ link, method, data, headers, requests, file }) => {
    //file is none for the casue this is for data only and not for the file tests
    if (file !== undefined && file !== null) {
        //maybe a mistake
        return filetests({ link, method, data, headers, requests, file });
        //this is for the file tests and not for the data tests 
        //just to make sure one last time that it is for file only 
        //mostly this is not needed 

    }

    const promises = [];
    // console.log("Data is: ", data);
    let i = 0;

    while (i < requests) {
        let count = 0;
        for (const combination of generatecombinations(data)) {
            // console.log("Combination is: ", combination);
            if (i >= requests) {
                break;
            }
            i++;
            count++;
            promises.push(sendrequest(link, method, headers, combination));
        }
        if (count === 0) {
            break;
        }
    }

    const results = await Promise.all(promises);
    //Now at this poitn we will get back our cpp output we will then parse that output here
    return results;
}

const resultsparser = (results) => {
    //Now lets work on this 
    // console.log("Results are: ", results);
    const successfulRequests = results.filter(response => response.ok).length;
    const failedRequests = results.length - successfulRequests;
    // console.log("Results are: ", results);
    const body = {
        successful: successfulRequests,
        failed: failedRequests,

    };
    console.log("Results are: ", body);
    return body;

};

// Good luck making this in cpp man in future  i just had to copy this full
function* generatecombinations(data) {
    const keys = Object.keys(data);
    // console.log(data)
    const maxLength = Math.max(
        ...keys.map(key => data[key].values.length)
    );

    for (let index = 0; index < maxLength; index++) {
        const combination = {};

        for (const key of keys) {
            const values = data[key].values;

            if (values.length === 0) {
                combination[key] = undefined;
            } else if (index < values.length) {
                combination[key] = values[index];
            } else {
                // Reuse the last available value
                combination[key] = values[values.length - 1];
            }
        }

        yield combination;
    }
}

//The only function that is remaining
//The fuzzy file manager
const filetests = async ({ link, method, data, headers, requests, file }) => {
    // console.log("File is: ", file);
    const promises = [];
    var ismulter = file.multerfile;
    // delete file.multerfile;
    const filelist = Object.values(file).filter(f => f && typeof f === 'object' && Array.isArray(f.values));
    // const filelist = Array.isArray(file) ? file : [file];
    // console.log("File list is: ", filelist);
    // console.log("The file data is : ", file[0]);
    console.log("The file data is : ", filelist);
    let i = 0;
    let mintry = 5; //fez
    while (promises.length < requests) {
        let sent = false;
        for (const filedata of filelist) {
            
            for (const value of filedata.values) {
                if (promises.length >= requests) {
                    break;
                }
                var filemanageresult = await filemanager(filedata, value);
                if (filemanageresult[0] == 1) {
                    promises.push(sendrequest(link, method, headers, data,
                        filemanageresult[1].file, filemanageresult[1].fieldname));
                    i++;
                    sent = true;

                }

            }
            if (promises.length >= requests) {
                break;
            }
        }
        if (!sent) mintry--;
        if (mintry <= 0) {
            break; //minimum of 5 attempts
        }
    }

    const results = await Promise.all(promises);
    return results;
}







export { apitestsController };