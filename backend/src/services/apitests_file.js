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
 { 
  avatar: { 
    type: 'others', 
    values: [ 
      'D:\\CODE\\JavaScript\\Projects\\APIintegration\\backend\\src\\app.js' 
    ], 
    range: [ 0, 512 ], 
    filetypes: [ '.js' ], 
    fieldname: 'avatar', 
    mimetype: 'others' 
  }, 
  multerfile: false 
} 
 
*/
import fs from "fs/promises";
import User from "../config/userconfig.js";

//now the basic files are done now lets talk about hte values  

/* 
So this function will take the full above file objs or else Multer file objs 
now multer is simplely handled by  
 
*/
import crypto from "crypto";
const userssize =
    Number.isFinite(User.Streamdata) && User.Streamdata > 0
        ? User.Streamdata
        : 10;
const BUFFER_SIZE = 1024 * 1024 * userssize;

//This is a API to handel all the files  
const filemanager = async (filesobj, filepath, size, defaultval, ismulter) => {

    // console.log("File manager called with parameters:", { filesobj, filepath, size, defaultval, ismulter }); 
    if (!filesobj || typeof filesobj !== "object") {
        return [0, "Invalid file object", 400];
    }
    let filefunction = null;
    if (filesobj.multerfile || ismulter) {
        filefunction = handlemulterfile; // no need for the index direcly we send it  
    }
    else if (defaultval === false) {
        filefunction = createbuffer;
    }
    else if (defaultval === true) {
        filefunction = handeldefaultfile;
    } else {
        filefunction = createbuffer;
    }
    // console.log("Selected file function:", filefunction.name);
    return await filefunction(filesobj, filepath, size);

}


const createbuffer = async (filesobj, filepath, size, start = 0) => {
    // var toreturn = { "fieldname": filesobj.fieldname, "file": filepath }; append is the data we are sending  
    let stats;

    try {
        stats = await fs.stat(filepath);

        if (!stats.isFile()) {
            return [0, "Invalid file path", 400];
        }

    } catch (error) {
        return [0, "Error occurred while processing file", 500];
    }

    //Now lets play with this file now 
    // const filedata = await fs.readFile(filepath); 
    //We have the file now  

    if (!Number.isFinite(size) || size < 0) {
        return [0, "Invalid file size", 400];
    }

    if (!Number.isFinite(start) || start < 0) {
        return [0, "Invalid start position", 400];
    }

    const filesize = stats.size;
    const startIndex = start;
    const sendSize = size > 0 ? size : filesize;
    const endindex = startIndex + sendSize;
    //now if the endindex if grete then lets do receurison and appednd it data of the file , if it is 2.5 time then app 

    var buffer = readbytesfromfile(filepath, filesize, startIndex, endindex);
    //Now this is the appedn  

    const toreturn = {
        fieldname: filesobj.fieldname,
        file: filepath,
        mimetype: filesobj.mimetype || "application/octet-stream",
        stream: buffer
    };
    console.log("The added buffer amount is", buffer);
    return [1, toreturn, 200];
}
//This will lets us stream the file to save the ram  

const readbytesfromfile = async function* (filepath, size, start, end) {

    // const buffer = Buffer.alloc(end - start); 
    const file = await fs.open(filepath, "r");
    // const buffer = Buffer.alloc(BUFFER_SIZE); 
    let totalread = 0;
    let postion = size > 0 ? start % size : 0;
    const requiredsize = end - start;

    try {
        if (requiredsize <= 0) {
            return;
        }

        if (size === 0) {
            return;
        }

        while (totalread < requiredsize) {
            const remaining = requiredsize - totalread;
            const filesize = size;
            const available = filesize - postion;
            const toread = Math.min(
                BUFFER_SIZE,
                remaining,
                available
            );

            if (toread <= 0) {
                break;
            }

            const buffer = Buffer.allocUnsafe(toread);

            const { bytesRead } = await file.read(
                buffer,
                0,
                toread,
                postion
            );

            if (bytesRead === 0) {
                break; // EOF reached 
            }

            yield buffer.subarray(0, bytesRead); // yield only the read bytes 
            totalread += bytesRead;
            postion += bytesRead;

            if (postion >= size) {
                postion = 0; // wrap around to the beginning of the file 
            }


        }
    } catch (error) {
        console.error("Error reading file:", error);
        throw error;
    }
    finally {
        await file.close();
    }





};

const handeldefaultfile = async (filesobj, filepath, size) => {
    /*Now this is the hardest and the most intresting part of the endpoint
    Cause in this we will be trying to send or make a file and send that whihc is the hardest part
    But we already have a bytes reader so , my goal is to use this only 
    Cause we have a pipeline , we can use that but we need to creata a random file first
    after which send that file only and dlete this file later
     console.log("The default file is being handled with parameters:", { filesobj, filepath, size });
    const filetype=filepath //cause value is file path
    I can do two things here eihter have a colection of this files or just random bytes
    better to creata buffer/10 size file 
    Now the things about the filename cause we haev the file data , we can eaily compare and see if we have created the file or not
    */
    const filetype = filepath;
    var filename = User.filenames || "randomfile";
    filename = filename + "." + filetype; //this is the file name with the extenstion
    const folderpath = User.folderpath || "./uploads/"; //this is the temppath
    //now lets see if the file is new or not
    filepath = folderpath + filename; //this is the full path of the file
    await fs.mkdir(folderpath, { recursive: true });
    if (size == filesobj.range[0]) {
        //Need to create a new file 
        //first lets make the folder if not exist

        const randomdata = crypto.randomBytes(size);  //better cause that is the users stating point
        await fs.writeFile(filepath, randomdata);
        //file is created now
    } else {
        //once check the file is presnt or not
        try {

            await fs.access(filepath);
            //file is present 
        } catch (error) {
            //file is not present 
            const randomdata = crypto.randomBytes(size); //maybe deleted for somereason
            await fs.writeFile(filepath, randomdata);
        }

    }
    const stats = await fs.stat(filepath);
    const readstream = readbytesfromfile(filepath, stats.size, 0, size);
    const islast = size === filesobj.range[filesobj.range.length - 1];
    const stream = async function* () {
        try {
            for await (const chunk of readstream) {
                yield chunk; //sending the chunks
            }
        }
        finally {
            if (islast) {
                await fs.unlink(filepath);
            }

        }
    }(); //calling the function imeditenly 
    return [1, {
        fieldname: filesobj.fieldname,
        file: filepath,
        mimetype: filesobj.mimetype || "application/octet-stream",
        stream: stream
    }, 200];

}





//To match all functions
const handlemulterfile = async (file, filedname = "file", filepath = undefined, size = 0) => {
    try {

        const filepath = file.path || file.values?.[0];

        const stats = await fs.stat(filepath);

        if (!stats.isFile()) {
            return [0, "Invalid file path", 400];
        }

        filedname = file.fieldname || filedname;

        const stream = readbytesfromfile(
            filepath,
            stats.size,
            0,
            stats.size
        );

        return [
            1,
            {
                "fieldname": filedname,
                "file": filepath,
                "mimetype": file.mimetype || "application/octet-stream",
                stream: stream
            },
            200
        ];


    }
    catch (error) {
        return [0, "Error occurred while processing file", 500];
    }

}



export { filemanager };

/** 
 *  values: [ 
      '.txt',  '.html', 
      '.css',  '.js', 
      '.json', '.xml', 
      '.csv',  '.md', 
      '.yaml', '.yml' 
    ], 
    range: [ 
          0,   512,  1024,  1536,  2048,  2560,  3072,  3584,  4096, 
       4608,  5120,  5632,  6144,  6656,  7168,  7680,  8192,  8704, 
       9216, 9728, 10240, 10752, 11264, 11776, 12288, 12800, 13312, 
      13824, 14336, 14848, 15360, 15872, 16384, 16896, 17408, 17920, 
      18432, 19456, 19968, 20480, 20992, 21504, 22016, 22528, 23040, 
      23552, 24064, 24576, 25088, 25600, 26112, 26624, 27136, 27648, 
      28160, 28672, 29184, 29696, 30208, 30720, 31232, 31744, 32256, 
      32768, 33280, 33792, 34304, 34816, 35328, 35840, 36352, 36864, 
      37376, 37888, 38400, 38912, 39424, 39936, 40448, 40960, 41472, 
      41984, 42496, 43008, 43520, 44032, 44544, 45056, 46080, 46592, 
      47616, 48128, 48640, 49664, 50176, 50688, 
      ... 10141 more items 
    ] 
 */