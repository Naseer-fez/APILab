import express from 'express';
import fs from 'fs/promises';


const testRoutes = express.Router();

const path = "./logs/apitestendpoint.txt";

testRoutes.post('/apitest', async (req, res) => {
    // Mock implementation of the apitestsController
    // console.log("The body is :", req.body);
    // console.log("Hello,world");
    // console.log("Hiiii!!!!");
    var name = 0, age = 0, salary = 0, arr = [];
    try {
        ({ name, age, salary,arr } = req.body || req.params.data || {});
    } catch (err) {
        // console.error("Error parsing request data:", err);
        console.log("2")
        return res.status(400).json({ message: 'Bad Request' });
    }
    try {
        const file = await fs.appendFile(path, `time: ${new Date().toISOString()}, Name: ${name}, Age: ${age}, Salary: ${salary}, Array: ${arr} \n`);
    } catch (err) {
        console.error("Error writing to file:", err);
        console.log("4")
        return res.status(500).json({ message: 'Internal Server Error' });
        // return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (name == null || age == null || salary == null) {
       
        return res.status(400).json({ message: 'Missing required fields' });
    }
    // console.log("Successfully received data:", { name, age, salary });
    return res.status(200).json({ message: 'Request received', data: req.body });


});



export default testRoutes;