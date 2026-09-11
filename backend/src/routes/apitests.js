import express from 'express';
import { apitestsController } from '../controllers/apitests.js';

const router = express.Router();

const body = {
    "link": " http://localhost:3000" //locla host link here
    ,
    "endpoint": "/api/test" //endpoint here
    ,
    "endpointavailable": false,
    "method": "GET",
    "data": {
        "name": "int",
        "age": "int",
        "salary": "float"
    }
}


router.post('/apitests', apitestsController);

export default router;