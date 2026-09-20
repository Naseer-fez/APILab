import express from 'express';
import { apitestsController } from '../controllers/apitests.js';
import { upload } from '../middelware/uploadfile.js';
const router = express.Router();

router.post('/apitests', apitestsController);

router.post('/apitests/file',upload.single('file'), apitestsController);

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
"endpointavailable": true, // This is a optional field if the ebdpoint is not provided it assumes the
link is the full link
"method": "GET", // The deafult method is GET and it automatically converts the method to uppercase so that we dont have to worry about it
//Depend of the method the data will be sent in the body or as query params the get auaotmatical converts all the data to parms"
"requests": 100, // This is a optional field if the requests is not provided it assumes the default value is 100
The total number of reqs to be sent to the server

headers":{} The header is also a optional field if the header is not provided it assumes the default header is application/json
**NOTE** DOnt send senstive information in the headers try to rotate the headers or auth later 
"fileavailable": false, // This is a optional field if the file is not provided it assumes the file is not available
Even if the file is provided it will be ignored , but when it is true , and no file is provided it
 will raise a error and the server will not send the request to the server
***Data this is the main Filed this takes a object ***
The data in this to be placed in the same formmat as the data to be sent to the server
##IF This is empty then a simple health check will be done to the server and the response will be sent back to the user
data:{

"key":{
"type": This is the import field  thsi takes the data type of key
"value": [] this takes a array of values this is optional filed 
this can be used to send the specidic values to the server and to see how it will handele the data
"range": [] this takes a array of values this is optional filed 
this can be used to send the specidic range of values to the server and to see how it will handele the data
This takes diffrent types of data [start,end,step] can be used for all the avalibe data types 
the data in this can be 2d or 3d at lasta ll the data will be converted to 1d array and then sent to the server
}
}
**NOTE** At this moment the data is only premetive data types only

Now for the filetests

will have the same structure as the regular tests
key will take the file name  for the server
ex : "avatar":{
"type":"image",
"value": [] optional filed this takes the file extenstions
this will be defaulted to the file type if not provided
"range":[] this is the size of the files in bytes
by default range starts from 0 to 5mb 
Now casue this are fuzzy tests 
the values can contains the file paths also 
for say want to test on specific files then it cna be used
if the type is "others" 
Then the values you can add the file paths 
The range will be ignored in this case if the range is empty 
but if the range is provided then a first the file will be sent and then 
random bytes will be sent to the server to see how it will handele the data The random bytes will one mb of extra data
You can add any number of files in the values array 

//If paths dont exist then the files which are found will be sent 


}






*/


export default router;