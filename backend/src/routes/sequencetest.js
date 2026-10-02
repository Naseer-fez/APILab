import express from 'express';
import { upload } from '../middelware/uploadfile.js';
import { sequencetestController } from '../controllers/sequencetest.js';
const sequencetestRouter = express.Router();

sequencetestRouter.post('/sequencetest', sequencetestController);

sequencetestRouter.post('/sequencetest/file', upload.single('file'), sequencetestController);

/*
This is the most Diffrent endpoint of all the endpoints
As this endpoint is used to create a Simulation test.
The users will set all the endpoints and the data we get from the Server is used to operate the next request in sequence
This will be used to Quicly test the group of APIs together.example Create a account and then verfiy the account etc.
The way the data will be sent is complety diffrent in this.

body:{
//The request will be sent in the form of a array
//One Object reprsents a Single request
//The data like storeeheader and storedata , expectedstatus and the idnoreerrors fro the first request will be 
used as the gloab request unless are explictly set otherwise in the future requests
request":[
{
"link":"http://localhost:3000/apitest", The required link to be used to send the request to the server
"endpoint":"/api/health", The endpoint to be used to send the request to the server
"endpointavailable": true, // This is a optional field if the endpoint is not provided then the link is to be used
//it is better to provide the endpoint as the link can be used for futher reqs without retyping the link
"method":"POST", // The deafult method is POST and it automatically converts the method to uppercase so that we dont have to worry about it
"headers":{} Any valid Headers to be provided 
***NOTE*** DOnt send senstive information in the headers try to rotate the headers or auth later
"storeheader":true, //This By defualt will store the header which will be used for future resposences
"data":{} //This is the data that is to be sent to the server if the method is get 
then the data will be sent as query params else in the JSON body of the request
"storedata":true, //This is used to store the data from the server
"filedata":"", //This is the path to the file that is to be sent to the server
"fileavailable": false,  if this is true then the file will be serched from either the data json or the uploaded file 
 or the filepath provided
A file path will be taken from the data if provided or else the file upload direcly will also be used 
//It is recommeded to Toggle this when file is to be sent so  if any error occurs it will be raised immediately 
"expectedstatus":200 //Can also be a list of status codes
//This is the expected status code that is to be returned .This can help identifing the issue in the data that is sent to the server.
"ignoreerros":false This is used to ignoroe the errors complety.

"conditions":{}//this is used to set the conditions for the requests 
//Check this section below

},
//filedata  takes a object 

{
"data": {
            //lets send a valid type now
            type: "text",
            value: [],}
//the key is the name of the file that is to be sent to the server
//value is the path of the file to be sent one API cna have multiple file also 
//If the file is uploded and the paths are provided then the file will use the uploaded file and the path will be ignored unless the keys are same

}


//second request now 
***NOTE***
[useheder] , [usedata] ,[ignoreerrors] [expectedstatus]
If the previous request stores the data then the defult option will be placed here.

{
//basic things
"storeheader":false.
"useheader":true,
"storedata":false, 
"usedata":true,
"expectedstatus":200,
"ignoreerros":false,
"filepath":"", //This is the path to the file that is to be sent to the server
"fileavailable": false,  if this is true then the file will be serched from either the data json or the uploaded file 
 or the filepath provided
data:{}the data to be sent to the server
header:{} Any new headers that is to be sent in this , if not the previous headers will be used based on the option selection
method:"POST", // The deafult method is POST and it automatically converts the method to uppercase so that we dont have to worry about it
"link":"http://localhost:3000/apitest", The required link to be used to send the request to the server
"endpoint":"/api/health", The endpoint to be used to send the request to the server
"endpointavailble":false, // This is a optional field if the endpoint is not provided then the link is to be used
//if the link is not provided then the previos link will be used and if the endpoint is provided then 
//Previous link+present endpoitn will be used.


}
. 3rd request
. 4rt request
. 5th request....
}

]

///How to set the conditions for the requests:
condition:{
//The refrence data is to be placed in {{}} Double curly braces.


"if":{
"condition":"{{response.status}} == 200", //This is the condition that is to be checked if the condition is met then the data will be sent to the next request
//This condition will be parsed and then will be checked 
***Note if the condition is not availabe then the status will be checked for the condition
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
"else":{}

Now if the key is anything other than the 
["if","else if","else"] Then the key will be used as the else block 

`

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



}*/



export default sequencetestRouter;