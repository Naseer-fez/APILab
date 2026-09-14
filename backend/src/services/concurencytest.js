
const defaultvalues = {
    "requests": 10000,
    "concurency": 100,
    "increment": 10,
    "interval": 1000,
    "timout": 50000


}

const parsebody = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return [0, "Invalid body format. Check the request body properly.", 400];
    }


    var { link, endpoint, endpointavailable, method, headers, data, bodytosend } = body;
    link = extractlink({ link, endpoint, endpointavailable });
    if (link[0] === 0) {
        return { message: link[1], status: link[2] };
    }
    method = methodcheck({ method });
    if (method[0] === 0) {
        return { message: method[1], status: method[2] };
    }
    data = parsedata({ data });
    if (data[0] === 0) {
        return { message: data[1], status: data[2] };
    }
    //now we can either  do data=data[1] or send the final data

    if (!headers || Object.keys(headers).length === 0) {
        // default headers will be used
        headers = {
            "Content-Type": "application/json"
        };
        // console.log("No headers provided, using default headers:", headers);
    }
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
        data = defaultvalues;
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


        if (typeof value !== "number" || Number.isNaN(value)) {
            return [
                0,
                `Invalid value for ${key}.
The value should be a positive number only.
The default value is: ${defaultvalues[key]}.`,
                400
            ];
        }


        if (value < 0) {
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











export { parsebody };