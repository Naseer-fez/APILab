export const documentation = {
    "/api/apitests": `This route is used to send a variety of different requests to the server and to verify the result back 
This data is used to test the validation of the API and to see how it will handle different types of data
For now the data types are {
"INT" "Float" "STRING" "array" "object" "boolean"
} 
More different variety of data types will be added in the future
The data will be sent in the body of the request in the form of 

{
"link": "http://localhost:3000/apitest",
"endpoint": "/api/health",
"endpointavailable": true, // This is an optional field; if the endpoint is not provided it assumes the link is the full link
"method": "GET", // The default method is GET and it automatically converts the method to uppercase so that we don't have to worry about it
// Depending on the method the data will be sent in the body or as query params; GET automatically converts all the data to params
"requests": 100, // This is an optional field; if requests is not provided it assumes the default value is 100
The total number of requests to be sent to the server

"headers": {} The header is also an optional field; if the header is not provided it assumes the default header is application/json
**NOTE** Don't send sensitive information in the headers; try to rotate the headers or auth later 
"fileavailable": false, // This is an optional field; if the file is not provided it assumes the file is not available
Even if the file is provided it will be ignored, but when it is true, and no file is provided it
 will raise an error and the server will not send the request to the server
***Data this is the main Field; this takes an object***
The data in this is to be placed in the same format as the data to be sent to the server
##IF this is empty then a simple health check will be done to the server and the response will be sent back to the user
data:{

"key":{
"type": This is the important field; this takes the data type of key
"value": [] this takes an array of values; this is an optional field 
this can be used to send specific values to the server and to see how it will handle the data
"range": [] this takes an array of values; this is an optional field 
this can be used to send a specific range of values to the server and to see how it will handle the data
This takes different types of data [start,end,step] and can be used for all available data types 
the data in this can be 2D or 3D; at last all the data will be converted to a 1D array and then sent to the server
}
}
**NOTE** Non-primitive data are available 
**NOTE** No fuzzy matching is done on the keys, so only input valid keys

example of data
 {
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

    },
    "arr":{
        "type": "array"

    }
}`,

    "/api/concurrencetest": `The goal of this route is to test the concurrency of the server
The options the user will send will be 
{
"link": "http://localhost:3000/apitest",
"method": "POST",
"headers": {}, // the basic information 
"bodytosend": {}  and only one valid data 
The goal is not to check whether this will accept or not 
the goal is to see how much load the API can actually handle
so after the basic info data, the main data is:
data
{
    

"requests": 10000 this will be the total number of requests
"concurency": 100 this will be the number of requests at an instance of time
"increment": 10  this will be the number of requests that will be increased over time
"interval":  1000  <ms> this will be the amount of time the server will wait until it restarts
"timout": 50000 <ms> The amount of time the server will wait for response because we never know if the server might have crashed
"requests": this takes the number of requests to be sent to the server in total; default value is 100 
"isfile": int if 0 then no file, default is zero. If the file is uploaded then the server will change it later
// if it is true then server will look for the file and raise an error if the file is not found
"filepath": "path/to/file", this will be the path to the file that will be sent to the server <string>
"filetype": "type of the file" is the key that will be used to send the file to the server <string>; default is file

 // You can also upload a file through the GUI component and
 it will automatically be configured to the appropriate endpoint 
 and will follow the same rules as the body data

}
The idea right now is to send 2 different types of data:
One is the basic data that will be used to send the request to the server (the basic info)
Second is the config for us to decide how the data is to be sent to the server
If you don't want the whole file to be allocated in RAM then you can use the option blobmode: true and it will use a blob to send the file to the server`,

    "/api/sequencetest": `This is the most different endpoint of all the endpoints
As this endpoint is used to create a simulation test.
The users will set all the endpoints and the data we get from the server is used to operate the next request in sequence
This will be used to quickly test a group of APIs together. Example: Create an account and then verify the account, etc.
The way the data will be sent is completely different in this.

body:{
// The request will be sent in the form of an array
// One object represents a single request
// The data like storeheader and storedata, expectedstatus and the ignoreerrors from the first request will be 
used as the global request defaults unless explicitly set otherwise in future requests
"request": [
{
"link": "http://localhost:3000/apitest", The required link to be used to send the request to the server
"endpoint": "/api/health", The endpoint to be used to send the request to the server
"endpointavailable": true, // This is an optional field; if the endpoint is not provided then the link is to be used
// It is better to provide the endpoint as the link can be used for further requests without retyping the link
"method": "POST", // The default method is POST and it automatically converts the method to uppercase so that we don't have to worry about it
"headers": {} Any valid headers to be provided 
***NOTE*** Don't send sensitive information in the headers; try to rotate the headers or auth later
"storeheader": true, // This by default will store the header which will be used for future responses
"data": {} // This is the data that is to be sent to the server; if the method is GET 
then the data will be sent as query params, else in the JSON body of the request
"storedata": true, // This is used to store the data from the server
"filedata": "", // This is the path to the file that is to be sent to the server
"fileavailable": false,  if this is true then the file will be searched from either the data JSON or the uploaded file 
 or the filepath provided
A file path will be taken from the data if provided or else the file upload directly will also be used 
// It is recommended to toggle this when file is to be sent so if any error occurs it will be raised immediately 
"expectedstatus": 200 // Can also be a list of status codes
// This is the expected status code that is to be returned. This can help identifying the issue in the data that is sent to the server.
"ignoreerrors": false // This is used to ignore the errors completely.

"conditions": {} // This is used to set the conditions for the requests 
// Check this section below

},
// filedata takes an object 

{
"data": {
            // lets send a valid type now
            type: "text",
            value: []
}
// the key is the name of the file that is to be sent to the server
// value is the path of the file to be sent; one API can have multiple files also 
// If the file is uploaded and the paths are provided then the file will use the uploaded file and the path will be ignored unless the keys are same

}
"bodykey": "body" 
"filekey": "file" 
Both the above are the keys that are set in the server for the data; the default is body and file


// second request now 
***NOTE***
[useheader], [usedata], [ignoreerrors], [expectedstatus]
If the previous request stores the data then the default option will be placed here.

{
// basic things
"storeheader": true,
"storedata": false, 
"expectedstatus": 200,
"ignoreerrors": false,
"filepath": "", // This is the path to the file that is to be sent to the server
"fileavailable": false, // if this is true then the file will be searched from either the data JSON or the uploaded file or the filepath provided
"data": {}, // the data to be sent to the server
"headers": {}, // any new headers to be sent in this; if not, the previous headers will be used based on the option selection
"method": "POST", // The default method is POST and it automatically converts the method to uppercase so that we don't have to worry about it
"link": "http://localhost:3000/apitest", The required link to be used to send the request to the server
"endpoint": "/api/health", The endpoint to be used to send the request to the server
"endpointavailable": false // This is an optional field; if the endpoint is not provided then the link is to be used
// if the link is not provided then the previous link will be used and if the endpoint is provided then 
// Previous link + present endpoint will be used.


}
. 3rd request
. 4th request
. 5th request....
}

]

/// How to set the conditions for the requests:
condition:{
// The reference data is to be placed in {{}} double curly braces.


"if":{
"condition": "{{response.status}} == 200", // This is the condition that is to be checked; if the condition is met then the data will be sent to the next request
// This condition will be parsed and then checked 
***Note: if the condition is not available then the status will be checked for the condition
"status": [200], // the list of conditions
"raiseerror": false, // This will raise an error or checkpoint data for you
"raisecheckpoint": true, // This will raise a checkpoint data for you
"message": "", // this is the message that is to be sent to you if the condition is met
// Can be used to stream the data to the user to see progress
"header":{
"auth": "bearer {{header.auth}}"
// here the system will automatically add the auth to the header

}
"data":{
"somekey": "{{data.somekey}}"



}
"nextdata": {} // You can also set data in the present request for the next request
"overwritenextdata": true // This is used to overwrite the data in the next request
"elseif":{
// same above data

}
"else":{}

Now if the key is anything other than 
["if", "elseif", "else"], then the key will be used as the else block 
**NOTE** 
The only object reference keys that are allowed: 
response, header, data
response is the received response from the server
header is the sent data to the server
data is the body to be sent to the server
**End**
Conditions can be written in any following order, but nested conditions are not implemented yet.
The preprocessing of the data is done very strongly and strictly with no fuzzy matching of keys yet, so be careful about writing the default keys.


**Rate limit being off is recommended as requests are sent in sequence and rate limiting can be handled on the server side to avoid any issues.** 

Simulation
│
├── Requests[]
│   ├── link / endpoint
│   ├── method
│   ├── headers
│   ├── data
│   ├── header/data storage
│   ├── header/data inheritance
│   ├── files
│   ├── expected status
│   ├── error behavior
│   └── conditions
│
├── Runtime references {{...}}
│
└── Conditional execution
    ├── if
    ├── else if
    ├── else
    ├── raise error/checkpoint
    ├── message/progress
    ├── header modifications
    ├── header removal
    ├── next-request data
    └── overwrite/merge behavior



}`,

    "/api/results": `This is a simple GET endpoint for now
The user can query the results by providing the result number in the URL path
Valid query parameters are:
- resultno: the result number to fetch (required)
- success: filter by success status (optional)
- message: filter by message content (optional)
- metrics: filter by metrics content (optional)
- data: filter by data content (optional)`
};

export default documentation;
