import express from 'express';
import { apitestsController } from '../controllers/apitests.js';

const router = express.Router();

router.post('/apitests', apitestsController);

/*
This route is used to send a varaity of diffrnet requests to the server and to verfiry the result back 
This data is used to test the validation of the API and to see how it will handele diffrent types of data
For now the data types are {
"INT" "Flaot" "STRING" The primitve data types
} 
More diffrent variety of data types will be added in the future
The data will be sent in the body of the reqeust  in the form of 

{
"link": "http://localhost:3000/apitest",
"endpoint": "/api/health",
"endpointavailable": true, // This is a optinal field if the ebdpoint is not provided it assumes the
link is the full link
"method": "GET", // The deafult method is GET and it automatically converts the method to uppercase so that we dont have to worry about it
//Depend of the method the data will be sent in the body or as query params the get auaotmatical converts all the data to parms
"headers":{} The header is also a optinal field if the header is not provided it assumes the default header is application/json
**NOTE** DOnt send senstive information in the headers try to rotate the headers or auth later 

***Data this is the main Filed this takes a object ***
The data in this to be placed in the same formmat as the data to be sent to the server
##IF This is empty then a simple health check will be done to the server and the response will be sent back to the user
data:{

"key":{
"type": This is the import field  thsi takes the data type of key
"value": [] this takes a array of values this is optinal filed 
this can be used to send the specidic values to the server and to see how it will handele the data
"range": [] this takes a array of values this is optinal filed 
this can be used to send the specidic range of values to the server and to see how it will handele the data
This takes diffrent types of data [start,end,step] can be used for all the avalibe data types 
the data in this can be 2d or 3d at lasta ll the data will be converted to 1d array and then sent to the server


}


}








*/


export default router;