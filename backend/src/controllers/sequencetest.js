import { parsebody } from '../services/sequencetest.js';


const sequencetestController = async (req, res) => {

    const body = await parsebody(req.body,req.file);


    
}



export { sequencetestController };