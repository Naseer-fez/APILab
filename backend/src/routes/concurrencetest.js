import express from 'express';
import { concurrencetestcontroller } from '../controllers/concurrencetest.js';
import { upload } from '../middelware/uploadfile.js';

const concurrencetestRoutes = express.Router();



concurrencetestRoutes.post('/concurrencetest', concurrencetestcontroller);

concurrencetestRoutes.post('/concurrencetest/file',upload.array('file'), concurrencetestcontroller);

/*

The Goal of this route is to test the concurrency of the server
The options the user will send will be 
{
"link": "http://localhost:3000/apitest",
"method": "POST",
"headers": {}, //the basic information 
"bodytosend": {}  and only one valid data 
The goal is not to check will this will accept or not 
the goal is to see how much load the api can actuly handel
so after the basic info data: the main data is 
data
{
    

"requests": 10000 this will be the number of total requests
"concurency": 100 this will be the number of requests at a instance of time
"increment": 10  this will the number of reqs that will increased by time
"interval":  1000  <ms>this will be the amount of time the wait server will wait till it restarts
"timout": 50000 <ms> The amount of time the sever will wait for responce casue we never know the sevre might have crashed
"requests": this takes the number of reqesut to be sent to the sever in total default value is 100 
"isfile": int if 0 then no file , defualt is zero  If the file is uploaded then the server will chaneg it later
// if it is true then server will look file the file and rasie a error if the file is not found
"filepath": "path/to/file", this will be the path to the file that will be sent to the server <string>
"filetype": "type of the file" is the key that will be used to send the file to the server <string> default it is file

 // You can also upload a file through the gui component and
 it will automatically will be configured to the apporiprate endpoint 
 and will follow the same rules as the body data

}
The idea rigth now is to send 2 diffrent types of data
One is the basic data that will be used to send the request to the server the basic info 
Second is the config for use to decide how to send the data is to be sent to the server

*/







export default concurrencetestRoutes;
