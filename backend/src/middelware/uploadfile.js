import multer from "multer";
import path from "path";
import fs from "fs";


const uploaddir = './uploads';

if (!fs.existsSync(uploaddir)) {
    fs.mkdirSync(uploaddir, { recursive: true });
}


//File support
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }


});
const upload = multer({ storage: storage }); 




export {upload};