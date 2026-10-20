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
import resulthistoryRoutes from './routes/resulthistory.js';
app.use('/api', resulthistoryRoutes);

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
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, '../../frontend/');
app.use(express.static(frontendPath));




export default app;
