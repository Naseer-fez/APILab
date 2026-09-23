import express from 'express';
import { upload } from "../src/middelware/uploadfile.js";

const fileUploadRouter = express.Router();

fileUploadRouter.post('/filetest', upload.single('file'), (req, res) => {
    
    console.log("File upload test route is working");
    res.status(200).json({
        received: true,
        filename: req.file?.originalname
    });
});

export default fileUploadRouter;