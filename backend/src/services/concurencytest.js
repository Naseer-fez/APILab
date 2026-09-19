import fs from "fs";
import path from "path";
import mime from "mime-types";



const defaultvalues = {
    "requests": 10000,
    "concurency": 100,
    "increment": 10,
    "interval": 1000,
    "timout": 50000,
    "filepath": "",
    "isfile": 0,
    "filekey": "file"


}



const parsebody = async (body, file = null) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return [0, "Invalid body format. Check the request body properly.", 400];
    }


    var { link, endpoint, endpointavailable, method, headers, data, bodytosend } = body;
    link = extractlink({ link, endpoint, endpointavailable });
    if (link[0] === 0) {
        return [0, link[1], link[2]];
    }
    method = methodcheck({ method });
    if (method[0] === 0) {
        return [0, method[1], method[2]];
    }
    if (!headers || Object.keys(headers).length === 0) {
        // default headers will be used
        headers = {
            "Content-Type": "application/json"
        };
        // console.log("No headers provided, using default headers:", headers);
    }
    // if (body.data.isfile !== 0 || !(data instanceof File)) {
    //     //cant punish the user for send is file worng but we can check if the data is a file or not
    //     return [0, "Invalid data type. Expected a File object for 'data' when 'isfile' is not 0.", 400];
    // }

    data = parsedata({ data });
    if (data[0] === 0) {
        return [0, data[1], data[2]];
    }

    //now we can either  do data=data[1] or send the final data


    if (!bodytosend || Object.keys(bodytosend).length === 0) {
        bodytosend = {};
    }
    const finaldata = {
        link: link[1],
        method: method[1],
        headers: headers,
        data: data[1],
        bodytosend: bodytosend
    }
    if (file) {
        // return handelfiles({ finaldata, file });
        finaldata.data.isfile = 1;
        finaldata.file = file;
    }
    else if (finaldata.data.isfile > 0) {
        // no need to check file casue we haev alrady retuned it
        if (data[1].filepath && data[1].filepath !== "") {
            finaldata.file = await savethefile({ filepath: data[1].filepath });
            //Now that we got the file we need to saev that file 
            if (finaldata.file[0] === 0) {
                return [0, finaldata.file[1], finaldata.file[2]];
            }
            finaldata.data.isfile = 1;
            finaldata.file = finaldata.file[1];
        } else {
            return [0, "Filepath is required when 'isfile'  is enabled ", 400];

        }
    }


    // console.log("The final data is ", finaldata);
    return [1, finaldata, 200];

}

const extractlink = ({ link, endpoint, endpointavailable }) => {

    const message = `
        ~ link is not provided by the user
        send the link or the endpoint
        if both are sent then the link will be added to the endpoint
        if only link is provided then that will be chosen as the final link
        make sure to provide proper [/] after the link and endpoint
    `;

    // No link at all
    if (!link) {
        return [0, message, 400];
    }

    // Endpoint is provided → combine them
    if (endpoint) {
        return [1, link + endpoint, 200];
    }

    // No endpoint → use link directly
    return [1, link, 200];
};

const parsedata = ({ data }) => {
    if (data == null) {
        data = { ...defaultvalues };
        return [1, data, 200];
    }
    // Make sure data exists and is an object
    if (typeof data !== "object" || Array.isArray(data)) {
        return [
            0,
            "Data must be a valid object.",
            400
        ];
    }

    for (const key of Object.keys(data)) {

        if (!Object.hasOwn(defaultvalues, key)) {
            return [
                0,
                `Invalid key: ${key}.`,
                400
            ];
        }
    }


    for (const key of Object.keys(defaultvalues)) {


        if (!Object.hasOwn(data, key)) {
            data[key] = defaultvalues[key];
            continue;
        }

        const value = data[key];
        if ((key === "filepath") || (key === "filekey")) {

            if (typeof value === "number") {
                return [
                    0,
                    `Invalid value for ${key}. Expected a string.`,
                    400
                ];

            }

            continue;
        }

        if (typeof value !== "number" || Number.isNaN(value) || value < 0) {

            return [
                0,
                `Invalid value for ${key}.
The value should be a positive number only.
The default value is: ${defaultvalues[key]}.`,
                400
            ];
        }
    }



    return [1, data, 200];
};
const methodcheck = ({ method }) => {
    const allowedmethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    if (method === undefined) { // default method will be used
        return [1, "POST", 200];
    }
    if (!allowedmethods.includes(method)) {
        return [0, `Invalid method: ${method}
choose from the following methods: ${allowedmethods.join(", ")}
If not the default method will be used which is POST
            `, 400];
    }
    return [1, method, 200];

}


const savethefile = async ({ filepath }) => {
    console.log("The filepath is ", filepath);
    if (typeof filepath !== "string" || filepath.trim() === "") {
        return [0, "Invalid filepath provided.", 400];
    }
    //trying to get the file now
    try {
        await fs.promises.access(filepath,);
    } catch (err) {
        return [0, `File not found at path: ${filepath}`, 404];
    }
    const stats = await fs.promises.stat(filepath);
    if (!stats.isFile()) {
        return [0, `The path provided is not a file: ${filepath}`, 400];

    }
    const originalname = path.basename(filepath);
    const mimetype = mime.lookup(filepath) || "application/octet-stream";

    return [1, {
        path: filepath,
        originalname: originalname,
        mimetype: mimetype

    }]


};








export { parsebody };