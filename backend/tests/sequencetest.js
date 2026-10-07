const SIMULATION_API_URL =
    "http://localhost:3000/api/sequencetest";

const payload = {
    request: [
        {
            link: "http://localhost:3000/tests/step1",
            endpointavailable: false,
            method: "POST",
            headers: {},
            data: {
                message: "hello"
            },
            storeheader: false,
            storedata: true,
            fileavailable: false,
            expectedstatus: 200,
            ignoreerrors: false,
            conditions: {
                if: {
                    condition: "{{response.status}} == 200",
                    status: [200],
                    raiseerror: false,
                    data: {
                        userId: "{{response.data.user.id}}",
                        userName: "{{response.data.user.name}}",
                        token: "{{response.data.token}}"
                    },
                    dataavailable: true,
                    header: {
                        Authorization: "Bearer {{response.data.token}}",
                        "X-User-ID": "{{response.data.user.id}}"
                    },
                    headeravailable: true,
                    overwritenextdata: true,
                    overwriteheader: true
                }
            }
        },
        {
            link: "http://localhost:3000/tests/step2",
            endpointavailable: false,
            method: "POST",
            headers: {
                Authorization: "{{Authorization}}",
                "X-User-ID": "{{X-User-ID}}"
            },
            data: {
                userId: "{{userId}}",
                userName: "{{userName}}",
                token: "{{token}}"
            },
            storeheader: false,
            storedata: true,
            fileavailable: false,
            expectedstatus: 200,
            ignoreerrors: false,
            conditions: {
                if: {
                    condition: "{{response.status}} == 200",
                    status: [200],
                    raiseerror: false,
                    data: {
                        orderId: "{{response.data.orderId}}",
                        total: "{{response.data.total}}"
                    },
                    dataavailable: true,
                    header: {
                        "X-Order-ID": "{{response.data.orderId}}"
                    },
                    headeravailable: true,
                    overwritenextdata: true,
                    overwriteheader: true
                }
            }
        },
        {
            link: "http://localhost:3000/tests/step3",
            endpointavailable: false,
            method: "POST",
            headers: {
                "X-Order-ID": "{{X-Order-ID}}"
            },
            data: {
                orderId: "{{orderId}}",
                total: "{{total}}"
            },
            storeheader: false,
            storedata: false,
            fileavailable: false,
            expectedstatus: 200,
            ignoreerrors: false
        }
    ]
};

async function runSimulation() {
    try {
        console.log("\n\n========================================");
        console.log("STARTING FULL SEQUENCE TEST");
        console.log("========================================\n");

        const response = await fetch(SIMULATION_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        console.log("\n========================================");
        console.log("FINAL RESULT");
        console.log("========================================");

        console.log(
            JSON.stringify(result, null, 2)
        );

        if (response.ok) {
            console.log("\n✅ FULL SEQUENCE TEST COMPLETED");
        } else {
            console.log("\n❌ FULL SEQUENCE TEST FAILED");
        }

    } catch (error) {
        console.error("\nERROR:", error.message);
    }
}

while (true) {
    runSimulation();
    //sleep for 3 sec`
    await new Promise(resolve => setTimeout(resolve,3000));
}