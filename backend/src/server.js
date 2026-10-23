import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import app from './app.js';
import { CONFIG } from './config/serverconfig.js';



//work on this later

// if (CONFIG.NODE_ENV === 'True') { //measn development mode
//     // Will work on this later
// }
// else {



// }

const startServer = (port=3000) => {

    app.listen(port, () => {

        console.log(`The server is running on : http://127.0.0.1:${port}`);

    });

}
import path from 'path';
import { fileURLToPath } from 'url';

// Node equivalent of Python's `if __name__ == '__main__':`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    startServer(3000);
}
export default startServer;