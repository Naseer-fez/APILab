import express from 'express';

const seqtestendpnt = express.Router();

seqtestendpnt.use(express.json({ type: "*/*" }));
seqtestendpnt.post("/step1", (req, res) => {

    console.log("\n================ STEP 1 ================");
    console.log("Body received:", req.body);
    console.log("Headers received:", req.headers);

    res.status(200).json({
        step: 1,

        token: "abc123",

        user: {
            id: 101,
            name: "Naseer"
        }
    });
});

seqtestendpnt.post("/step2", (req, res) => {

    console.log("\n================ STEP 2 ================");
    console.log("Body received:", req.body);
    console.log("Headers received:", req.headers);

    const bodyCorrect =
        req.body?.userId === 101 &&
        req.body?.userName === "Naseer" &&
        req.body?.token === "abc123";

    const headerCorrect =
        req.headers.authorization === "Bearer abc123" &&
        req.headers["x-user-id"] === "101";

    if (!bodyCorrect || !headerCorrect) {

        return res.status(400).json({
            success: false,
            message: "STEP 2 VALIDATION FAILED",

            expected: {
                body: {
                    userId: 101,
                    userName: "Naseer",
                    token: "abc123"
                },

                headers: {
                    authorization: "Bearer abc123",
                    "x-user-id": "101"
                }
            },

            received: {
                body: req.body,

                headers: {
                    authorization: req.headers.authorization,
                    "x-user-id": req.headers["x-user-id"]
                }
            }
        });
    }

    console.log("STEP 2 BODY + HEADER VALIDATION PASSED");

    res.status(200).json({
        step: 2,

        orderId: 9876,
        total: 1499,

        message: "Step 2 successful"
    });
});

seqtestendpnt.post("/step3", (req, res) => {

    console.log("\n================ STEP 3 ================");
    console.log("Body received:", req.body);
    console.log("Headers received:", req.headers);

    const bodyCorrect =
        req.body?.orderId === 9876 &&
        req.body?.total === 1499;

    const headerCorrect =
        req.headers["x-order-id"] === "9876";

    if (!bodyCorrect || !headerCorrect) {

        return res.status(400).json({
            success: false,
            message: "STEP 3 VALIDATION FAILED",

            expected: {
                body: {
                    orderId: 9876,
                    total: 1499
                },

                headers: {
                    "x-order-id": "9876"
                }
            },

            received: {
                body: req.body,

                headers: {
                    "x-order-id": req.headers["x-order-id"]
                }
            }
        });
    }

    console.log("STEP 3 BODY + HEADER VALIDATION PASSED");

    res.status(200).json({
        success: true,
        message: "FULL SEQUENCE TEST PASSED",

        received: {
            body: req.body,

            headers: {
                "x-order-id": req.headers["x-order-id"]
            }
        }
    });
});


export default seqtestendpnt;