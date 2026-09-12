
const ROOT = "http://127.0.0.1:3000/"

const API = "api/"
const ENDPOINT = "apitests"

const LINK = ROOT + API + ENDPOINT
const data = {
    "name": {
        "type": "string"
        ,"values": ['abc', 'def', 'ghi']
        // ,"range": ['aba', 'zzy', 1]

    },
    "age": {
        "type": "int"
        // ,"values": [0, 1, 2, 3, 4, 5]
        // ,"range": [0, 100]

    },
    "salary": {
        "type": "float"
        // ,"values": [1.0, 2.0, 3.0, 4.0, 5.0]
        // ,"range": [0.0, 100.0,0.1]

    }
}

const body = {
    "link": " http://localhost:3000" //locla host link here
    ,
    "endpoint": "health" //endpoint here
    ,
    "endpointavailable": false,
    "method": "GET",
    // "data": data
}
let i=0

while (i<10)
{
    try {

        let response = await fetch(LINK, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                link: ROOT + 'tests/apitest',
                // endpoint: '/api/health',
                method: 'POST',
                data: data
            })
        })
        console.log("Request sent");
        // console.log("Response :", response);
        console.log("Response status:", response.status);
        console.log("Body is:", await response.text());
    }
    catch (error) {
        console.error("Error:", error);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Sleep for 1 second before the next request
    i++;
    break;
}