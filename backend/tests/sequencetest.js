import { setTimeout } from 'timers/promises';

const SIMULATION_API_URL = "http://localhost:3000/api/sequencetest";
const payload = {
    request: [
        {
            link: "http://localhost:3000",
            endpoint: "/health",
            endpointavailable: true,
            method: "POST",
            headers: {},
            storeheader: true,
            data: {
                message: "hello"
            },
            storedata: true,
            fileavailable: false,
            expectedstatus: 200,
            ignoreerros: false
        },
        {
            useheader: true,
            usedata: true,
            storeheader: false,
            storedata: false,
            link: "http://localhost:3000",
            endpoint: "/api/status",
            endpointavailable: true,
            method: "GET",
            fileavailable: false,
            expectedstatus: 200,
            ignoreerros: false,
            conditions: {
                "if": {
                    condition: "{{response.status}} == 200",
                    status: [200],
                    rasieerror: false,
                    message: "ok",
                    header: {},
                    body: {}
                }
            }
        }
    ]
};
async function runSimulation() {
    try {
        const response = await fetch(SIMULATION_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            console.log("Success:\n", JSON.stringify(result, null, 2));
        } else {
            console.error("Failed:\n", JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error(error.message);
    }
}

while (true) {
    runSimulation();
    //sleep timeeeee 
    await setTimeout(5000);

}