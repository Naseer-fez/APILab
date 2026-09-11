import { datainputconfigs } from '../config/datainputconfigs.js';
const gibberish = '/*/'
const parsebody = (body) => {

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
    // NOw lets get the data poitn and the methods
    const method = body.method.toUpperCase() ?? 'GET';
    const validmethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validmethods.includes(method)) {
        return [0, "Invalid method", 400];
    }
    // Now how will we recive the data, so the plan is we will be uing json for the data and depeonds on the method we will use parms or json  body
    var data = body.data ?? gibberish; // This symbol make sure we can check the link safely
    if ((data === gibberish) || (data === '')) {
        //That measn we will doing a noraml test like getting the endpoitn etc etc 
        return healthtest(link, method);

    }
    //Now that we got the data exists now lets parse thsi data also 
    var output = parseinputdata(data);
    if (output[0] === 0) {
        return output;
        //This will save the extra computation to send the link also 
    }
    // output[1][gibberish + "server" + gibberish] = body.requests ?? 100;
    output[1][gibberish + "server" + gibberish] = {
        "link": link,
        "method": method,
        "requests": body.requests ?? 1
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

    var { type, values, range } = objs;
    if (type === "" || type === null || type === undefined) {

        return [0, "The type is not defined for the key" + key + "has no type:" + type, 401];
    }
    type = type.toLowerCase();
    const validtypes = Object.keys(datainputconfigs);
    if (!validtypes.includes(type)) {
        return [0, "The type is not valid for the key:1212: " + key, 401];
    }


    if (values === "Null" || values === null) {
        values = []
        // meaning thier are no specific values to test the data on 
    }
    if (range === "Null" || range === null || range === undefined) {
        range = [];
        range = datainputconfigs[type]// Now the raneg is ocmpley mixed
        
        // this could be [10,20] and [0,10]
        //might be some error in the data for this reason we will just leave this 
    }
    
    return [1, { type, values, range }, 200]

}




export { parsebody, gibberish };