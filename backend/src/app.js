import express from 'express';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const app = express();

app.use(express.json()); //using the json parser
app.post('/health', (req, res) => {
    console.log("Health check route is working");
    res.status(200).json({ "body": "Hello,World" });
})
// dont remove this

// Importing the routes

// Fuzzy matching routes for the API tests
import apitestsRoutes from './routes/apitests.js';
app.use('/api', apitestsRoutes);
// concurrence test route
import concurrencetestRoutes from './routes/concurrencetest.js';
app.use('/api', concurrencetestRoutes);
// sequence test route
import sequencetestRoutes from './routes/sequencetest.js';
app.use('/api', sequencetestRoutes);
// result history route
import resultsRoutes from './routes/results.js';
app.use('/api', resultsRoutes);
//Docs route for the API tests
import { documentation } from '../documentation.js';
app.get(['/docs/:endpoint', '/docs/<endpoint:string>', '/docs'], (req, res) => {
    let endpoint = req.params.endpoint || req.query.endpoint;
    if (!endpoint && req.params[0]) {
        endpoint = req.params[0];
    }
    if (!endpoint) {
        return res.status(200).json({ message: 'All documentation', data: documentation });
    }
    endpoint = endpoint.toLowerCase();
    if (endpoint === 'concurrency' && !documentation['concurrency'] && documentation['concurrence']) {
        endpoint = 'concurrence';
    }
    if ((endpoint === 'results' || endpoint === 'api/results') && !documentation['results'] && documentation['/api/results']) {
        endpoint = '/api/results';
    }
    if (Object.keys(documentation).includes(endpoint)) {
        return res.status(200).json({ message: 'Documentation found', data: documentation[endpoint] });
    }
    return res.status(404).json({ message: 'Documentation not found', available: Object.keys(documentation) });

});

//importing the test routes
import testRoutes from '../tests/sampleendpoint.js';
app.use('/tests', testRoutes);
//importing the file upload test route
import fileUploadRoutes from '../tests/fileuploadep.js';
app.use('/tests', fileUploadRoutes);
//importing the sequence test route
import seqtestendpnt from '../tests/sequencetestep.js';
app.use('/tests', seqtestendpnt);

//Time for the Frontend 
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = [
    path.join(__dirname, '../../frontend/'),
    path.join(path.dirname(process.execPath), 'frontend/'),
    path.join(process.cwd(), 'frontend/')
].find(p => fs.existsSync(p)) || path.join(__dirname, '../../frontend/');
app.use(express.static(frontendPath));




export default app;
