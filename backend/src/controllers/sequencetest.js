import { parsebody } from '../services/sequencetest.js';


const sequencetestController = async (req, res) => {
    const body = await parsebody(req.body,req.file);
    if(body[0] == 0){
        res.status(body[2]).json(body[1]); //Part one is done
    }


    res.status(body[2]).json(body[1]);
}



export { sequencetestController };