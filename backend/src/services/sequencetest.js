import fs from "fs/promises";
import path from "path";
import { log } from "../utils/logger.js";

const parsebody = async (body, file, global = {}, first = false) => {
    //First lets Parse the link 
    // console.log("Parsing body::::::::: ", body);
    var link = await pasrselink(body.link, body.endpoint, body.endpointavailable, global.link ?? null);
    log(`Parsed link: ${JSON.stringify(link)}`, 'info', 'sequencetest.log');
    if (link[0] == null) {
        return [0, {
            "message": link[1],
            "paramters": {
                "link": body.link,
                "endpoint": body.endpoint,
                "endpointavailable": body.endpointavailable
            },

        }, link[2]]
    }
    //Now Lets do for files. Better to do this first
    var fileddata = await filedataparser(body.filedata, body.fileavailable, file, first);
    if (fileddata[0] == 0) {
        return [0, {
            "message": fileddata[1],
            "paramters": {
                "filedata": body.filedata,
                "fileavailable": body.fileavailable
            }
        }, fileddata[2]];
    }
    var fileavailable = fileddata[0] == -1 ? false : true; //measn the fileis not availbe
    var method = methodparser(body.method, global.method);
    var headers = parsedata(body.headers, body.toremoveheaders, body.headertostore); //simple enough
    var data = parsedata(body.data, body.toremovedata, body.datatostore); //if not provided then it will be empty object
    //the third paarmeter is the data that is to be stored given by the user
    var storeheader = body.storeheader ?? global.storeheader ?? true; //if not provided then it will be true
    var storedata = body.storedata ?? global.storedata ?? true; //if not provided then it will be true
    var expectedstatus = body.expectedstatus ?? global.expectedstatus ?? 200; //if not provided then it will be 200
    var ignoreerrors = body.ignoreerrors ?? global.ignoreerrors ?? false;
    //Now after this the only thing remains is the Condition part whihc will deal will all the conditions that is to be followed
    var condition = conditionparser(body.condition ?? null, body.conditionavailble ?? false);
    if (condition[0] == 0) {
        return [0, {
            "message": condition[1],
            "paramters": {
                "condition": body.condition,
                "conditionavailble": body.conditionavailble
            }
        }, condition[2]];
    }
    var conditionavailable = condition[0] == -1 ? false : true; //measn the condition is not availbe
    //Now lets join all the pieces together now

    var dataobject = {
        "link": link[0],
        "method": method,
        "headers": headers,
        "data": data,
        "storeheader": storeheader,
        "storedata": storedata,
        "expectedstatus": expectedstatus,
        "ignoreerrors": ignoreerrors,
        "condition": condition[0],
        "conditionavailable": conditionavailable,
        "fileavailable": fileavailable,
        "filedata": fileddata[0]
    }
    // console.log("Parsed dataobject is ", dataobject);
    if (first) {
        //This measn we also need to send the global data also 
        return [1,
            [dataobject, {
                method: method,
                link: link[1],
                headers: headers,
                storeheader: storeheader,
                storedata: storedata,
                expectedstatus: expectedstatus,
                ignoreerrors: ignoreerrors,
                condition: condition[0],
                conditionavailable: conditionavailable,
                header: headers,
                data: data,
                fileavailable: fileavailable,
            }]
        ]

    }

    return [1, dataobject, 200];
}
const pasrselink = async (link, endpoint, endpointavailable, previouslink = null) => {
    //This is a simple future proof function 
    // console.log("Parsing link::::::::: ", { link, endpoint, endpointavailable, previouslink });
    var linktosend = null;
    var message = "";
    var statuscode = 0;
    if (link == null) {
        //So lets now check he previous link 
        if (previouslink == null && link == null) {
            //that measn we have no link so , lets Return that 
            linktosend = null;
            message = `
                No link is provided For this request data 
                Please verify the link is provided propelry
                `;
            statuscode = 400;


        } else {
            //that means we have a previous link  so lets check the endpoint now
            if (endpointavailable == true) {
                //Now lets check the endpoint now
                if (endpoint == null) {
                    //Now previous link is available , but the endpoint is not
                    //I can be strict and just avoid it , cause why wil anyone even do a sequence of that
                    message = `
                    The endpoint is not Provided for this request data even though the endpointavailable is set to true
                    Please verify the endpoint is provided propelry.
                    The previous link is available but is avoided due to the endpoint not being provided
                    `;
                    statuscode = 400;
                } else {
                    //finnlay postive news
                    linktosend = combinelinks([previouslink, endpoint]);
                    // no need to send anything else now

                }

            }

        }


    } else {
        //link is provide so lets just check the endpoint now
        //lets just trow it then 
        linktosend = combinelinks([link, endpoint]);

    }
    return [linktosend, message, statuscode];

}

//reduced the boiler plate code in this 
const combinelinks = (links) => {
    const validLinks = links.filter(link => link != null);

    if (validLinks.length === 0) {
        return null;
    }

    let completeLink = validLinks[0];

    for (let i = 1; i < validLinks.length; i++) {
        const nextLink = validLinks[i];

        completeLink =
            completeLink.replace(/\/+$/, "") +
            "/" +
            nextLink.replace(/^\/+/, "");
    }

    return completeLink;
};

const methodparser = (method) => {
    const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

    return validMethods.includes(method.toUpperCase()) ? method.toUpperCase() : "POST";
    //lets just send POST for giving the benfit of doubt to the user.

}
//The data stored is the data of the presnet request 
//this -2 is a sign for us
const parsedata = (data, toremove = [-2], datatostore = []) => {
    var datatosend = data ?? {};

    toremove = Array.isArray(toremove) ? toremove : [];
    datatostore = Array.isArray(datatostore) ? datatostore : [];

    if (toremove[0] == -2) {
        //now we are checking if the data we are sending have file or not
        //V1 will work on this later , as i feel this is not neede now or is just overkill overall

    }
    else if (toremove[0] == -1) {
        //measn we need to filterr out the keys present in datastore
        datatostore?.forEach(key => delete datatosend?.[key]);
    } else {
        //Now only remove from the toremove list
        toremove?.forEach(key => delete datatosend?.[key]);

    }



    return datatosend;

}

const filedataparser = async (data, fileavailable, file, first = false) => {
    var filedata = {};
    var message = "";
    var statuscode = 0;

    if (fileavailable == false && data == undefined && file == undefined) {


        return [-1, message, statuscode]; //measns no for this 
    }
    data = data ?? {};
    file = file ?? {};
    //real check
    //we can have both the filepaths and the mullter files , so , if file is availbe then the mullter file will be used 
    for (const key in data) {
        //Now lets check if the file is valid or not
        //lets ignore the file type for now , as we can check it later on the server side
        var filePaths = data[key].value ?? []; // Assuming the first value is the file path
        //lets normalise the file path to arrays
        filePaths = Array.isArray(filePaths) ? filePaths : [filePaths];
        for (const filePath of filePaths) {
            try {
                await fs.access(filePath); // Check if the file exists
                //if successful then we can just send the file to the server
                //lets conever the data below noe
                filedata[key] = {
                    fieldname: data[key].fieldname || key, // Use the provided fieldname or default to the key
                    path: filePath, // Server disk path
                    values: [filePath],                                     // Server disk path
                    range: [],                                              // Range values
                    filetypes: [path.extname(filePath || "")],     // ['.png']
                    type: data[key].type || "file",                        // Type
                    mimetype: data[key].type || "application/octet-stream"    // MIME type
                };
            } catch (err) {
                // File does not exist, handle the error
                //so lets leave it 

            }

        }

    }
    //now lets check for multer file now
    for (const key in file) {
        // Process each file in the multer object
        const fileobj = file[key];
        const fieldname = fileobj.fieldname || "file";
        const fieldConfig = data[fieldname] || {};
        filedata[key] = {
            fieldname: fieldname,
            path: fileobj.path,
            values: [fileobj.path],                                     // Server disk path
            range: [],                                              // Range values
            filetypes: [path.extname(fileobj.originalname || "")],     // ['.png']
            type: fieldConfig.type || "multer",                        // Type
            mimetype: fileobj.mimetype || "application/octet-stream"    // MIME type
        };



    }



    if (Object.keys(filedata).length === 0) {
        //that means no file is found so lets just return the error
        message = "No file is found in the provided file paths or the uploaded files";
        statuscode = 400;

    }
    return [filedata, message, statuscode];


}
const conditionparser = (condition, conditionavailable) => {
    if (condition == null && conditionavailable == false) {
        return [-1];
    }
    else if (condition == null && conditionavailable == true) {
        return [0, `Condition is not provided even though the conditionavailable is set to true 
            Please provide a valid object or set the conditionavailable to false `, 400];
    }
    //Now lets check if condtion is object or not
    if (typeof condition !== "object" || Array.isArray(condition)) {
        return [0, "Condition is not a valid object Please provide a valid object", 400];
    }
    const validKeys = {
        "if": 0,
        "elseif": 1,
    }
    //If the keys are not valid then it is else
    //the idea is to send a list [if,elseif,else] so , i can do a loop around this list and see if the condition matches or not
    var flag = false; //This will make sure to only have one else condition and if we have more than that then we will just leave 


    //hard coded this cause only 3 conditions are thier
    const totalconditions = {
        if: [],
        elseif: [],
        else: []
    };
    // 0 is if  1 is else-if and 2 is else 
    for (const key in condition) {
        var conditionkey = key.toLowerCase();
        //Now lets do the validation of this keys

        if (!validKeys.hasOwnProperty(conditionkey) && flag == true) {
            return [0, "Only one else condition is allowed Please provide a valid object or use else-if condition", 400];
            //So no two invalid else or some random key is placed
        } else if (!validKeys.hasOwnProperty(conditionkey) && flag == false) {
            flag = true; //That means we have a else condition
        }
        var currentdata = condition[key];
        if (typeof currentdata !== "object" || Array.isArray(currentdata)) {
            return [0, `Condition for key ${key} is not a valid object Please provide a valid object
                        The valid keys are ${Object.keys(validKeys).join(", ")}
                        The Given data is ${JSON.stringify(currentdata)}
                        Please provide a valid object
                `, 400];
        }
        var objectotsend = validatecondition(currentdata);
        if (objectotsend[0] == 0) {
            return objectotsend;
        } else if (objectotsend[0] == -1) {
            //measn lets just skip this 
            continue;
        }
        if (!validKeys.hasOwnProperty(conditionkey)) {
            conditionkey = "else"; //That means we have a else condition so lets just set it to else
        }
        totalconditions[conditionkey].push(objectotsend[1]);



    }
    if (Object.values(totalconditions).every(arr => !arr.length)) {
        if (conditionavailable == true) {
            return [0, `Condition is not provided even though the condidtion available is set to true 
                Please provide a valid object or set the conditionavailable to false`, 400];

        }
        else {
            ///Nothing lets just leave this now
        }

    }

    return [1, totalconditions];

}
//This function will validate all the condition of individaul condition
const validatecondition = (condition) => {
    console.log("Validating condition ", condition);
    if (condition == null) {
        return [-1]; //measn we have no condition so lets just skip this 
    }

    var { status, raiseerror, message, header, body, nextdata, overwritenextdata } = condition || null;
    //Now we can actual do something to save the space like many time uses send if and nothing is attached to it
    //We can just elimate that here complety
    const types = {
        message: "string",
        condition: "string",
        raiseerror: "boolean",
        header: "object",
        body: "object",
        nextdata: "object",
        overwritenextdata: "boolean"
    };


    var objtosend = {};
    if (status !== undefined) {
        var individualstatus = Array.isArray(status) ? status : [status];
        //just for the  normaliation lets conevert that into a array
        for (const key of individualstatus) {
            const stat = Number(key);
            if (!Number.isFinite(stat) || stat < 100 || stat > 599) {
                return [0, `Status code is not valid Please provide a valid status code between 100 and 599
                    The Given status code is ${stat} 
                    Please provide a valid status code
            `, 400];
            } else if (typeof stat !== "number") {
                return [0, `Status code is not valid Please provide a valid status code between 100 and 599
                    The Given status code is ${stat}
                    Please provide a valid status code
            `, 400];
            } else {
                //No need to do anything as all the status codes are valid
            }
        }
        objtosend.status = individualstatus;
        objtosend.statusavailable = true;
    } else {
        //Tricky part so lets return it completly then 
        return [-1]

    }
    //Now  lets check the rasieerror and message
    //This will validae all the keys in here
    for (const [key, type] of Object.entries(types)) {
        const value = condition[key];

        if (value !== undefined && typeof value !== type) {
            return [0, `The ${key} should be a ${type} Please provide a valid ${type} The Given ${key} is ${key}
                 Please provide a valid ${type}`, 400];
        }
        const str = `${key}available`;
        objtosend[key] = value;
        objtosend[str] = value !== undefined;
    }
    const bracketvalidation = ["nextdata", "header", "condition"]
    //Lets verify the brackets now

    for (const key of bracketvalidation) {
        if (objtosend[`${key}available`]) {
            var result = validatebrackets(objtosend[key]); //This will validate 
            if (result[0] == 0) {
                return result;
            }
            objtosend[key] = result[1];
        }
        //Now validate them 

    }

    return [1, objtosend];
}
const validatebrackets = (data) => {
    const openbrackets = "{{";
    const closebrackets = "}}";
    //first lets check if the data is an object or not
    //so that we can traver accordingly
    if (typeof data !== "object" || Array.isArray(data)) {
        return [0, `The data should be an object Please provide a valid object The Given data is ${data}
        Please provide a valid object
        ***The data is only allowed for a string value for now***
        `, 400];
    }
    if (data == null || data == undefined || typeof data === "number" || typeof data === "boolean") {
        return [1, data];
        //If it is number then it will be direclty compared to the statu code
    }
    if (typeof data !== "string") {
        return [0,
            `The Data shoudl be in String or a number format for the conditional check!
            Please provide a valid data The Given data is ${data}`, 400]

    }
    //now lets see if the barackets are open and cloosed propely or not
    var opencount = 0;//if it zero again after toogel then it is valid 
    if (data.includes(openbrackets)) opencount = !opencount;
    if (data.includes(closebrackets)) opencount = !opencount;
    if (opencount) {
        return [0,
            `The brackets are not propely closed please provide a valid object The Given data is ${data}
    Please provide a valid object
    ***The data is only allowed for a string value for now***
    `, 400];
    }
    return [1, data];


};

/*
"if":{
"status":[200] the list of conditions
"rasieerror":false //This will rasie a error or a checkpoint data for you
"message":"" //this is the message that is to be sent to you if the condition is met
//Can be used to stream the data to the user to see the progress
"header":{
"auth":"bearer {{header.auth}}"
//here the system will automatically add the auth to the header
"toremoveheaders":[] 
//This will remove all the heders in the list ,
//if this is set to -1 then all the heders will be removed except the presnt header from the data 
}
"body":{
"somekey":"{{body.somekey}}"
"toremovedata":[] //This will remove all the body in the list ,
 
 
}
"nextdata":{} You can also set the data in the present request for the next request
"overwritenextdata":true //This is used to overwrite the data in the next request if this is set to false then the data will be merged with the next request data
}
"else if":{
//same above data
 
}
 
*/





export { parsebody };