//This is the offical logging system of the project
import fs from 'fs/promises';
import path from 'path';


const Enablelogging = true; //This is the global variable that will enable or disable logging

const log = async (messageinfo, message, level = "INFO", filename = null) => {
    if (!Enablelogging) return;
    if (filename == null) {
        //Lets get the name of the file that called this function
        const stack = new Error().stack;
        const callerLine = stack.split('\n')[2];
        const callerFilePath = callerLine.match(/\((.*):\d+:\d+\)/)[1];
        filename = path.basename(callerFilePath, '.js') + '.log';//similar to the python version
    }


    const currenttime = new Date();
    const formattedTime = currenttime.toISOString().slice(0, 19).replace('T', ' ');
    if (typeof message === 'object' && !Array.isArray(message)) {
        message = formatobject(message);
    }
    else if (Array.isArray(message)) {
        message = formatarray(message);
    }
    var logMessage = "______________________________________________________________\n";
    logMessage += `[${formattedTime}] [${level}] ${messageinfo}:${message}\n`;

    const logFilePath = path.join(process.cwd(), 'logs', filename);
    try {
        //First lets create the folder
        await fs.mkdir(path.join(process.cwd(), 'logs'), { recursive: true });
        //Now lets append the log message to the file

        await fs.appendFile(logFilePath, logMessage);
    } catch (error) {
        console.error('Error writing to log file:', error);
    }


}
const formatarray = (arr, msg = "") => {
    if (!Array.isArray(arr)) return msg
    for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] === 'object' && !Array.isArray(arr[i])) {
            msg += formatobject(arr[i], msg);
        }
        else if (Array.isArray(arr[i])) {
            msg += formatarray(arr[i], msg);
        }
        else {
            msg += arr[i] + "\t";
        }
    }
    return msg;
}

const formatobject = (obj, msg = "") => {
    if (typeof obj !== 'object' || obj === null) return msg;
    for (const key in obj) {
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            msg += `${key}: { ${formatobject(obj[key], msg)} } ` + '\n';
        }
        else {
            msg += `${key}: ${obj[key]} ` + '\n';
        }
    }

    return msg;
}

export { log };