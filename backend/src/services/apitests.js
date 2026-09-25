import { datainputconfigs, fileinputconfigs } from '../config/datainputconfigs.js';
import fs from "fs";
import path from "path";
const gibberish = '/*/'

const filerange = (() => {
    const range = [];
    const step = 512; // 512 bytes
    const totlaSize = 5 * 1024 * 1024; // 5 MB
    for (let i = 0; i <= totlaSize; i += step) {
        range.push(i);
    }

    return range;
})(); //This will genrate a default range for us

const cantdecompose = ["boolean", "array", "object", "string", "null"];
//these are the types which we cant decompose so we will just return the values as it is

const parsebody = (body, file) => {

    // console.log("Body is: ", body);
    var link = body.link ?? gibberish; // This symbol make sure we can check the link safely
    if (link === gibberish) {
        // no point to do anything else, just go back
        return [-1, "No valid Link provided", 404]; // 0 might be the ans so be safe
    }
    // console.log("Link is: ", link);
    var endpointavailable = body.endpoint ?? false;

    if (endpointavailable) {
        var endpoint = body.endpoint ?? ''; //just to be sure if the endpoint is not sent and we dont crash the server
        link = link + endpoint;
        /**
         * Now the asumation is that if the users send only one link then  they usaly send it 
         * by the endpoint so that is why this option is given it makes sure that we dont fill the worng data
         */
    }
    //Now lets check the availblity of files
    let multerfile = false;
    if (file && file !== undefined && file !== null) {
        body.fileavailable = true;
        multerfile = true;
    } else {
        body.fileavailable =
            body.fileavailable === true || body.fileavailable === "true";
    }

    var headers = body.headers ?? gibberish;
    if (typeof headers === "string" && headers !== gibberish) {
        try {
            headers = JSON.parse(headers);
        } catch { }
    }
    if (headers === gibberish) {
        headers = {
            "Accept": "application/json"
        };
        if (!body.fileavailable) {
            headers["Content-Type"] = "application/json";
        }
    }

    // NOw lets get the data poitn and the methods
    const method = (body.method ?? "GET").toUpperCase();
    const validmethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validmethods.includes(method)) {
        return [0, "Invalid method", 400];
    }
    // if (body.fileavailable && (file === undefined || file === null)) {
    //     //why this check to know if the endpoint is for file or not
    //     return [0, `File is not provided but fileavailable is true
    //         Add a valid file to the request or set fileavailable to false`, 400];
    // }

    // Now how will we recive the data, so the plan is we will be uing json for the data and depeonds on the method we will use parms or json  body
    var data = body.data ?? gibberish; // This symbol make sure we can check the link safely
    if ((data === gibberish) || (data === '')) {
        //That measn we will doing a noraml test like getting the endpoitn etc etc 
        return healthtest(link, method);

    }

    //Now that we got the data exists now lets parse thsi data also 
    var output = [];
    if (!body.fileavailable && multerfile === false) {
        output = parseinputdata(data);
    }
    else if (body.fileavailable && multerfile === true) {
        //Now need to create a multerfile handler also
        //This will be similar to the filehandler casue this time only the paths chnages so 
        output = multerfilehandler(data, file);
    }
    else {
        output = filehandler(data, file);
        //This will make sure we can check the file type in the next step
    }
    if (output[0] === 0) {
        return output;
        //This will save the extra computation to send the link also 
    }
    output[1].multerfile = multerfile;
    output[1].defaultval = output[1].defaultval ?? false;

    // console.log("Output is: ", output);
    // output[1][gibberish + "server" + gibberish] = body.requests ?? 100;
    const requests = (() => {
        //first check is thsi valid output or not
        if (output[0] <= 0) {
            return 0; //doest matter anything
        }

        var req = body.requests;
        var total = req ?? 1000;
        if (req === undefined || req === null || typeof req !== "number") {
            //still return the toal
        }
        else if (req <= 0) {
            //measn we need to usee the full length of the data
            // let totalrange = output[1].range.length ?? 100;
            // let totalvalues = output[1].values.length ?? 1;
            let totalrange = 0, totalvalues = 0; //one req is not goona make much diff
            //lets go though the output[1] now
            for (const key in output[1]) {
                if (key === "multerfile" || key === "defaultval") continue; //skip these keys
                const obj = output[1][key];
                if (obj.range && Array.isArray(obj.range)) {
                    totalrange += obj.range.length;
                } else {
                    totalrange += 1; //if no range, count as 1
                }
                if (obj.values && Array.isArray(obj.values)) {
                    totalvalues += obj.values.length;
                } else {
                    totalvalues += 1;
                }


            }
            totalrange = totalrange || 1; //both cant be empty but stil just incase
            totalvalues = totalvalues || 1; //both cant be empty but stil just incase

            //both cant be empty but stil just incase
            //lets check if both dont cross the int max limit
            total = totalrange * totalvalues;
            if (total > Number.MAX_SAFE_INTEGER) {
                total = Number.MAX_SAFE_INTEGER;
            }


        }
        return total;
    })();

    console.log("Requests is: ", requests);

    output[1][gibberish + "server" + gibberish] = {
        "link": link,
        "method": method,
        "headers": headers,
        "requests": requests ?? 100,
        "fileavailable": body.fileavailable ?? false //just to make sure we can check the file availability in the next step
    }



    // output[1][gibberish + "link" + gibberish] = link;
    // output[1][gibberish + "method" + gibberish] = method;
    return output;
}

const healthtest = (link, method) => {

    try {
        var response = fetch(link, method);
        if (response.ok) {
            return [1, "Endpoint is working fine", 200];
        } else {
            // console.error("Error:", response.statusText);
            return [0, "The Health of the server is not ideal", 500];
        }
    } catch (error) {

        if (error.message === "HTTP_404") {
            return [0, "The Endpoint is not found", 404];

        } else if (error.message === "HTTP_500") {
            return [0, "The Internal server crash", 500];


        }
        else if (error.message === "HTTP_400") {
            return [0, "The Bad Request", 400];

        } else if (error.message === "HTTP_401") {
            return [0, "The Unauthorized Request\n send the Auth token", 401];
        } else {
            return [0, error.message, 500];
        }
    }
}

const parseinputdata = (data) => {
    //Now This will genrate the refrence datas this will be the main thing for the auatomation 
    //we might get a array of dict 

    const keys = [];
    const values = [];


    for (const [key, value] of Object.entries(data)) {
        keys.push(key);

        values.push(value.values);
    }//optimal method case we will only needing one loop and n

    //now i have both the keys and the values distrubted 
    // so the thoery is it is like a range
    const finaldata = {};
    for (let i = 0; i < keys.length; i++) {
        let validity = validatetherange(data[keys[i]]);
        if (validity[0] === 0) {
            return validity;
        }
        finaldata[keys[i]] = validity[1];
    }
    // console.log("Final Data is: ", finaldata);
    return [1, finaldata, 200];
    //now i have got the final data 

}
const validatetherange = (objs) => {
    var decompose = true
    var { type, values, range } = objs;
    if (type === "" || type === undefined || type === null) {

        return [0, "The type is not defined for the key " + objs.fieldname + " has no type:" + type, 401];

    }
    type = type.toLowerCase();
    const validtypes = Object.keys(datainputconfigs);
    if (!validtypes.includes(type)) {
        return [0, "The type is not valid for the key" + key + "has no type:" + type, 401];
    }
    //Now lets verfiy the values and range
    let valuesdefined = true;
    // try{
    //     values === undefined || values === null || values.length === 0 
    // }catch(err){
    //     valuesdefined = false;
    // }

    if (!values || values.length === 0) {
        // we dont have the values now lets check the raneg for this 
        values = []
        // console.log("The values are not provded lets check the range:");

        if (!range || range.length === 0) {
            // so now we need to swtich to the default root
            values = datainputconfigs[type];
            // console.log("The values are generated from the default values:", values);
            // This will bring the defult values to the raneg
            range = [] //just to be sure 

        } else {
            //this else means we have range
            decompose = !cantdecompose.includes(type);

        }
    }
    else {
        // we have the values so need to do anything just decompose them if needed
        decompose = !cantdecompose.includes(type);
        //  console.log("The values are generated from the values:", values);

    }
    if (decompose) {
        range = decomposerange({ values: range }, type);
    }
    return [1, { type: type, values: values, range: range }, 200];

}

const decomposerange = (ref, type) => {
    // console.log("decomposing range for values:", ref.values);
    const values = ref.values;
    // console.log("Decomposing range for values:", values);
    // console.log("Type of values:", typeof values);
    if (!Array.isArray(values)) {
        return;
    }

    // 1D
    if (!Array.isArray(values[0])) {
        var start = values[0];
        var end = values[1];
        var steps = values[2] ?? 1;
        if (type === "string") {
            start = start.charCodeAt(0)
            end = end.charCodeAt(0)
        }
        const result = [];

        for (let i = start; i <= end; i += steps) {

            if (type === "string") {
                result.push(String.fromCharCode(i));
            } else if (type === "int") {
                result.push(i);
            } else if (type === "float") {
                result.push(Number(i.toFixed(10)));
                // break;
                // console.log("Float value is: ", Number(i.toFixed(100)));
            } else {
                result.push(i);
            }




        }




        return result;
    }

    // 2D
    const result = [];

    for (const range of values) {
        const child = { values: range };

        decomposerange(child, type);

        result.push(...child.values);
    }

    ref.values = result;
};


//need to handel this files now
const filehandler = (data, file) => {
    // /return [1, { type: type, values: values, range: range }, 200];
    const keys = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
        keys.push(key);
        values.push(value.values);
    }
    var finaldata = {};
    for (let i = 0; i < keys.length; i++) {
        let getfiles = [];
        let types = data[keys[i]].type;
        if (data[keys[i]].type === "others") {
            // Handle the "others" type
            getfiles = checkfilepaths(data[keys[i]]);
        } else {
            getfiles = filetypeverifier(data[keys[i]]);
        }
        if (getfiles[0] === 0) {
            return getfiles;
        }
        finaldata[keys[i]] = getfiles[1];
        finaldata[keys[i]].fieldname = keys[i]; // Add the fieldname property to the object
        finaldata[keys[i]].mimetype = types; // Add the mimetype property to the object

    }
    return [1, finaldata, 200];
    //Now the final data json is
    /*
    {
        key1: { type: type, values: values, range: range, fieldname: key1 },
        key2: { type: type, values: values, range: range, fieldname: key2 },
}
    so for each
    for(const key in finaldata){
    }
*/


}

const filetypeverifier = (objs) => {

    var defaultval = false;
    var { type, values, range } = objs;
    if (type === "" || type === undefined || type === null) {
        return [0, "The type is not defined for the key" + objs.fieldname + "has no type:" + type +
            "\n Valid file types are : " + Object.keys(fileinputconfigs).join(", "), 401];

    }

    if (values === undefined || values === null || values.length === 0) {
        if (fileinputconfigs[type] === undefined) {
            return [0, "The type is not valid for the key" + objs.fieldname + "has no type:" + type +
                "\n Valid file types are : " + Object.keys(fileinputconfigs).join(", "), 401];
        }

        values = fileinputconfigs[type];
        // console.log("The type is :", type);
        // console.log("The values are generated from the default values:", values);
        defaultval = true;
        //Now we need to do this fro ranges also 
        if (range === undefined || range === null || range.length === 0) {
            range = filerange
        } else {
            range = decomposerange({ values: range }, "int");
        }
    } else {

        range = decomposerange({ values: range }, "int"); //This will decompose the range for use
    }
    return [1, { type: type, values: values, range: range, filetypes: -1, defaultval: defaultval }, 200];



}
const checkfilepaths = (data) => {
    // now need to check all the paths and see if they are valid or not
    let { type } = data;
    let value = data.values || data.value || [];
    let range = data.range || [];
    let validpaths = [];
    let filesize = [];
    let filetypes = [];
    // console.log("Checking file paths:", data);
    for (const filepath of value) {
        if (filepath === undefined || filepath === null || filepath === "") continue;
        try {
            const stats = fs.statSync(filepath);
            filetypes.push(path.extname(filepath)); // Get the file extension
            validpaths.push(filepath);
            filesize.push(stats.size);

        } catch (err) {
            console.error(`Error checking file path: ${filepath}`, err);
        }
    }

    if (validpaths.length === 0) {
        return [0, "No valid file paths provided", 400];
    }
    // return [1, { type: type, values: values, range: range }, 200];
    if (range && range.length > 0) {

        for (let i = 0; i < validpaths.length; i++) {
            // Decompose the range for each file
            var filesizeranges = filerangecompostion(filesize[i], { range: range });
        }
        range = filesizeranges;


    } else {
        range = [];//That measn the user only want us to send this file only and not send any random bytes to the server
    }






    return [1, { type: type, values: validpaths, range: range, filetypes: filetypes }, 200];


}
const filerangecompostion = (size, obj) => {
    let toreturn = [];
    //Now we dont know the sizes 
    // [start, end, step] = obj.range;
    let start = obj.range[0] ?? 0; //start is always the fil size
    let end = obj.range[1] ?? size;
    let step = obj.range[2] ?? 512;
    // Check if the start and end values are valid
    if (start < 0) //That measn the range start from zero to the totalfilzzesize
    {
        start = 0;
    }
    if (end < 0) {
        //That means the range goes to the end of the file
        end = size;
    }

    for (let i = start; i <= end; i += step) {
        toreturn.push(i);
    }

    return toreturn;

}
const multerfilehandler = (data, file) => {
    const keys = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
        keys.push(key);
        values.push(value.values);
    }
    var finaldata = {};
    const filearr = Array.isArray(file) ? file : [file];


    for (const fileobj of filearr) {
        if (!fileobj || !fileobj.path) {
            // return [0, "Invalid file object provided", 400];
            continue; // Skip this file and continue with the next one
        }
        const fieldname = fileobj.fieldname || "file";
        const fieldConfig = data[fieldname] || {};
        finaldata[fieldname] = {
            fieldname: fieldname,
            path: fileobj.path,
            values: [fileobj.path],                                     // Server disk path
            range: [],                                              // Range values
            filetypes: [path.extname(fileobj.originalname || "")],     // ['.png']
            type: fieldConfig.type || "multer",                        // Type
            mimetype: fileobj.mimetype || "application/octet-stream"    // MIME type
        };


    }
    if (Object.keys(finaldata).length === 0) {
        return [0, "No file is provided by the user to the server", 400];

    }


    return [1, finaldata, 200];


}




export { parsebody, gibberish };