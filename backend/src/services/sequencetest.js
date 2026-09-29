import fs from "fs/promises";



const parsebody = async (body, file, global = {},first=1) => {
    //First lets Parse the link 
    var link = await pasrselink(body.link, body.endpoint, body.endpointavailble);
    
    if (link[0] == null) {
        return [0, {
            "message": link[1],
            "paramters": {
                "link": body.link,
                "endpoint": body.endpoint,
                "endpointavailble": body.endpointavailble
            },

        }, link[2]]
    }
    //Now Lets do for files. Better to do this first
    var fileddata = await filedataparser(body.filedata, body.fileavailable, file);
    if (fileddata[0] == 0) {
        return [0, {
            "message": fileddata[1],
            "paramters": {
                "filedata": body.filedata,
                "fileavailable": body.fileavailable
            }
        }, fileddata[2]];
    }
    var fileavailable = fileddata[0]== -1 ? false : true; //measn the fileis not availbe
    var method = methodparser(body.method, global.method);
    var headers = parsedata(body.headers, body.toremoveheaders, body.headertostore); //simple enough
    var data = parsedata(body.data, body.toremovedata, body.datatostore); //if not provided then it will be empty object
    //the third paarmeter is the data that is to be stored given by the user
    var storeheader = body.storeheader ?? global.storeheader ?? true; //if not provided then it will be true
    var storedata = body.storedata ?? global.storedata ?? true; //if not provided then it will be true
    var storeheader = body.storeheader ?? global.storeheader ?? true; //if not provided then it will be true
    var expectedstatus = body.expectedstatus ?? global.expectedstatus ?? 200; //if not provided then it will be 200
    var ignoreerrors = body.ignoreerrors ?? global.ignoreerrors ?? false;
    //Now after this the only thing remains is the Condition part whihc will deal will all the conditions that is to be followed



};


const pasrselink = async (link, endpoint, endpointavailble, globallink = null) => {
    //This is a simple future proof function 
    var linktosend = null;
    var message = "";
    var statuscode = 0;
    if (link == null) {
        //So lets now check he previous link 
        if (previouslink == null) {
            //that measn we have no link so , lets Return that 
            linktosend = null;
            message = `
                No link is provided For this request data 
                Please verify the link is provided propelry
                `;
            statuscode = 400;


        } else {
            //that means we have a previous link  so lets check the endpoint now
            if (endpointavailble == true) {
                //Now lets check the endpoint now
                if (endpoint == null) {
                    //Now previous link is available , but the endpoint is not
                    //I can be strict and just avoid it , cause why wil anyone even do a sequence of that
                    message = `
                    The endpoint is not Provided for this request data even though the endpointavailble is set to true
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

const filedataparser = async (data, fileavailable, file) => {
    var filedata ={};
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
        var filePaths = data[key].value??[]; // Assuming the first value is the file path
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








export { parsebody };