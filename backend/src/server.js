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

 let port = process.env.PORT || 3000;
    app.listen(port, () => {

        console.log(`The server is running on : http://127.0.0.1:${port}`);

    });