const LINK = "http://127.0.0.1:3000/api"

const endpoint = "/concurrencetest"

const url = LINK + endpoint


const getdata = async () => {
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                link: "http://127.0.0.1:3000",
                endpoint: "/health",
                method: "POST",
                headers: {}
            })
        });

        const body = await resp.json();

        console.log("Status:", resp.status);
        console.log("Body:", body);

        return body;
    } catch (err) {
        console.error("Fetch failed:", err.cause?.code, err.message);
        throw err;
    }
};

getdata()