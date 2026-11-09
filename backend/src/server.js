import app from './app.js';
import { CONFIG } from './config/serverconfig.js';
import os from 'node:os';
import path from 'path';

const getLocalIp = () => {
    try {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
    } catch { }
    return '127.0.0.1';
};

const startServer = (port = 3000, host = '127.0.0.1', runhost = false) => {
    app.listen(port, host, () => {
        if (runhost) {
            const localIp = getLocalIp();
            console.log(`\nServer running and accessible on your network:`);
            console.log(`  Local:   http://localhost:${port}`);
            console.log(`  Network: http://${localIp}:${port}\n`);
        } else {
            console.log(`\nServer running on localhost:`);
            console.log(`  Local:   http://localhost:${port}\n`);
        }
    });
};

// Node equivalent of Python's `if __name__ == '__main__':`
if (process.argv[1] && path.basename(process.argv[1]).includes('server.js')) {
    startServer(3000);
}

export default startServer;
