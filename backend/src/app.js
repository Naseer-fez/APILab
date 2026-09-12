import express from 'express';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
const app = express();

app.use(express.json()); //using the json parser
app.get('/health', (req, res) => {
    // console.log("Health check route is working");
    res.status(200).json({ "Status": "Hello,World" });
})

// Importing the routes
import apitestsRoutes from './routes/apitests.js';
app.use('/api', apitestsRoutes);

//importing the test routes
import testRoutes from '../tests/sampleendpoint.js';
app.use('/tests', testRoutes);



export default app;
