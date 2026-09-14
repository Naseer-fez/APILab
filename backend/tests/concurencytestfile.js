const LINK = "http://127.0.0.1:3000/api"

const endpoint = "/concurrencetest"

const url = LINK + endpoint


const getdata = async () => {
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({

                "link": "http://127.0.0.1:3000",
                "endpoint": "/health",
                "method": "POST",
                "headers": {}
                // ,
                // "data": {
                //     "requests": 1,
                //     "concurency": 2,
                //     "increment": 10,
                //     "interval": 3,
                //     "timeout": 50000,
                //     // "requests": 100
                // }
            })
        });
        const body = await resp.json();
        console.log("The body is ", body);
        // console.log("The response is ", resp);

    } catch (err) {
        console.log(err)

        return 0;
    }
}


getdata()