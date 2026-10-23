import express from 'express';
import { getresultsController,getpagenoController } from '../controllers/results.js';


const resultsRoutes = express.Router();
//simple endpoitn will just write it here itself

resultsRoutes.get('/results/:resultno', getresultsController);

resultsRoutes.get('/results/page/:pageno', getpagenoController);

/*
This is a simple get enpoint for now
The user can query the results by providing the result number in the URL path
valid query parameters are:
- resultno: the result number to fetch (required)
- success: filter by success status (optional)
- message: filter by message content (optional)
- metrics: filter by metrics content (optional)
- data: filter by data content (optional)


*/





export default resultsRoutes;