//This is the offical logging system of the project
import fs from 'fs/promises';
import path from 'path';


const Enablelogging = true; //This is the global variable that will enable or disable logging

const log = async (message, level = "info", filename = null) => {
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
    if (typeof message === 'object') {
        // message = JSON.stringify(message, null, 2); //Pretty print the object
        //Each key in one line
        message=Object.entries(message).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
    }

    const logMessage = `[${formattedTime}] [${level.toUpperCase()}] ${message}\n`;
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

export { log };