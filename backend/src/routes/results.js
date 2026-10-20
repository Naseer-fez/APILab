import express from 'express';
import { getresultsController } from '../controllers/resultsController.js';


const resultsRoutes = express.Router();
//simple endpoitn will just write it here itself
import { resultfilepath } from '../services/resulthistory.js';

resultsRoutes.get('/results/:resultno', getresultsController);







export { resultsRoutes };