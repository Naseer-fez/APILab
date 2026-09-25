import fs from "fs";
import path from "path";

const API_TEST_ENDPOINT = "http://127.0.0.1:3000/api/apitests/file";

const FILE_PATHS = [
    "D:\\CODE\\JavaScript\\Projects\\APIintegration\\backend\\goal.md"
];

// true  -> multipart/form-data + Multer
// false -> application/json + local file paths
var USE_MULTER = false;

const testData = {
    link: "http://127.0.0.1:3000/tests/filetest",
    endpoint: "",
    endpointavailable: false,
    method: "POST",
    requests: 1,
    headers: {},
    fileavailable: true,
    data: {
        file: {
            type: "text",
            value: [],
            range: []
        }
    }
};

async function runTest() {
    try {
        let response;

        if (USE_MULTER) {
            console.log(
                "Running test with Multer file upload (multipart/form-data)..."
            );

            const formData = new FormData();

            // Read local file
            const fileBuffer = fs.readFileSync(FILE_PATHS[0]);

            // Create Blob
            const blob = new Blob(
                [fileBuffer],
                { type: "application/javascript" }
            );

            // Field name must match upload.single("file")
            formData.append(
                "file",
                blob,
                path.basename(FILE_PATHS[0])
            );

            // Request metadata
            formData.append("link", testData.link);
            formData.append("method", testData.method);
            formData.append("requests", String(testData.requests));
            formData.append("fileavailable", "true");

            // Tell backend this is Multer mode
            formData.append("data", "multer");

            response = await fetch(API_TEST_ENDPOINT, {
                method: "POST",
                body: formData
            });

        } else {
            console.log(
                "Running test with JSON file paths (application/json)..."
            );

            response = await fetch(API_TEST_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(testData)
            });
        }

        const contentType = response.headers.get("content-type");

        const result = contentType?.includes("application/json")
            ? await response.json()
            : await response.text();

        console.log("Status:", response.status);
        console.log(
            "Response:",
            JSON.stringify(result, null, 2)
        );

    } catch (error) {
        console.error("Test failed:", error);
    }
}

async function main() {
    while (true) {
        // IMPORTANT: wait for the current test to finish
        // before starting another one.
        // if(USE_MULTER) {
        //     console.log("Running test with Multer file upload (multipart/form-data)...");
        // } else {
        //     console.log("Running test with JSON file paths (application/json)...");
        // }
        // USE_MULTER = !USE_MULTER; // Toggle between Multer and JSON modes
        await runTest();
        
        // Sleep for 2 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

main();

