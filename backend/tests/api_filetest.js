const API_TEST_ENDPOINT = "http://localhost:3000/api/apitests/file";

const FILE_PATHS = [
   "D:\\CODE\\JavaScript\\Projects\\APIintegration\\backend\\src\\app.js"
];

const testData = {
    link: "http://localhost:3000/healthcheck",
    endpoint: "/api/healthcheck",
    endpointavailable: true,
    method: "POST",
    requests: 1,
    headers: {},
    fileavailable: true,
    data: {
        avatar: {
            type: "others",
            value: FILE_PATHS,
            range: []
        }
    }
};

async function runTest() {
    try {
        const response = await fetch(API_TEST_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(testData)
        });

        const contentType = response.headers.get("content-type");

        const result = contentType?.includes("application/json")
            ? await response.json()
            : await response.text();

        console.log("Status:", response.status);
        console.log("Response:", result);
    } catch (error) {
        console.error("Test failed:", error);
    }
}

runTest();