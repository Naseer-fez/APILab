

const config = {
    storefailurehistory: true, //need to put the main config here
    totalrecords: 1000
}
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';


const resultfilepath = (resultno = 1) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const LOGS_DIR = path.resolve(__dirname, '../../logs');
    const HISTORY_FOLDER = path.join(LOGS_DIR, 'history');
    const HISTORY_FILE = path.join(HISTORY_FOLDER, `history_${resultno}.json`);

    if (!fs.existsSync(HISTORY_FOLDER)) {
        fs.mkdirSync(HISTORY_FOLDER, { recursive: true });
    }
    return HISTORY_FILE;
};
const readhistory = (page = 1) => {
    const filepath = resultfilepath(page);

    if (!fs.existsSync(filepath)) {
        return [];
    }

    const history = JSON.parse(
        fs.readFileSync(filepath, 'utf8')
    );

    if (!Array.isArray(history)) {
        throw new Error(`Invalid history file: ${filepath}`);
    }

    return history;
};



const savehistory = async (result, testname = "N/A") => {
    const message = result.message || `${testname} completed successfully`;
    const metrics = result.metrics || null;
    const data = result.data || null;
    const timestamp = new Date().toISOString();
    const success = metrics ? true : false;
    if (!success && !config.storefailurehistory) {
        return;
    }
    const createjson = {
        testname: testname,
        timestamp: timestamp,
        success: success ? true : false,
        message: message,
        metrics: metrics || null,
        data: data || null

    }
    let recordtoinsert = createjson;
    let page = 1;
    while (recordtoinsert !== null) {
        const filepath = resultfilepath(page);
        const history = readhistory(page);
        history.unshift(recordtoinsert);
        if (history.length <= config.totalrecords) {
            fs.writeFileSync(filepath,
                JSON.stringify(history, null, 2), 'utf8');
            break;
        }
        recordtoinsert = history.pop();
        fs.writeFileSync(resultfilepath(page),
            JSON.stringify(history, null, 2), 'utf8');
        page++;
    }
}

export { savehistory, resultfilepath };