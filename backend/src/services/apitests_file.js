

//return [1, { type: type, values: totalpaths, range: range }, 200];
/*
 {
        key1: { type: type, values: values, range: range, fieldname: key1 },
        key2: { type: type, values: values, range: range, fieldname: key2 },
    //Now the values contsin the path of the files
    range contaisn the data size that is to be sent to the server
    fieldname is the name of the field that is to be sent to the server
    key == fieldname
    type is the file type to be send needs a function to handle this types now


}
    so for each
    for(const key in finaldata){
    }


*/
import fs from "fs/promises";
import path from "path";

//now the basic files are done now lets talk about hte values 

/*
So this function will take the full above file objs or else Multer file objs
now multer is simplely handled by 

*/


const filemanager = async (filesobj, valueindex) => {

    if (!filesobj || typeof filesobj !== "object") {
        return [0, "Invalid file object", 400];
    }
    if (filesobj.multerfile) {
        //that measn 
        return handlemulterfile(filesobj, valueindex); // no need for the index direcly we send it 

    }
    //Now lets handle the actual file now
    try {
        const stats = await fs.stat(values);
        if (!stats.isFile()) {
            return [0, "Invalid file path", 400];
        }
        //now lets send the file
        // values contains the actual file path now we need to send the file to the server
        var toreturn = { "fieldname": fieldname, "file": values };
        //Now  after the test i need to add the extra bits based on the nessceary
        //or handle the no path 
        return [1, toreturn, 200];



    } catch (error) {
        return [0, "Error occurred while processing file", 500];
    }




}






const handlemulterfile = async (file, filedname = "file") => {
    try {

        const stats = await fs.statSync(file.path);
        if (!stats.isFile()) {
            return [0, "Invalid file path", 400];
        }
        return [1, file, filedname, 200];


    }
    catch (error) {
        return [0, "Error occurred while processing file", 500];
    }

}



export { filemanager };