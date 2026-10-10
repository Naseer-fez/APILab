


const client = new Map();


//This will be a simple controller that will be used to send the Checkpoints from the main function to the client
const SSEcontroller =  (req, res) => {
    const jobid = String(req.query.jobid ?? 1); //Because maybe only one user will test the endpoint simultaneously 

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    if (!client.has(jobid)) {
        client.set(jobid, new Set());
    }
    const connection = client.get(jobid);
    connection.add(res);
    res.write('data: Connected to the server\n\n'); //send the initial message to the client
    const heartbeat = setInterval(() => {
        if (!res.writableEnded && !res.destroyed) {

            res.write(': keep-alive\n\n'); //send another poll

        }
    }, 30000); //send a heartbeat every 30 seconds to keep the connection alive


    res.on('close', () => {
        clearInterval(heartbeat);
        connection.delete(res);
        if (connection.size === 0) {
            client.delete(jobid);
        }

    });


}
const sendtheevent =  (jobid = 1, data, eventname = "checkpoint") => {
    const connection = client.get(String(jobid));

    if (!connection || connection.size === 0) {
        return [0, "No active connections for this job"];
    }
    const message = `event: ${eventname}\ndata: ${JSON.stringify(data)}\n\n`;
    let sent = 0;
    for (const client of connection) {
        if (!client.writableEnded && !client.destroyed) {
            client.write(message);
            sent++;
        } else {
            connection.delete(client);
        }
    }
    return sent
        ? [1, `Event sent to ${sent} connection(s)`]
        : [0, 'No active connections for this job'];


}
//THe reason job id is set to 1 is because maybe only one user will test the endpoint simultaneously






export { SSEcontroller, sendtheevent };