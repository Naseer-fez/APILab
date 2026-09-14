import { requestengine } from '../src/services/concurencyengine.js';

const defaultvalues = {
    "requests": 10000,
    "concurency": 1000,
    "increment": 10,
    "interval": 1000,
    "timout": 50000


}


const testdata = {
    link: "http://127.0.0.1:3000/health",
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    bodytosend: {
        name: "John",
        age: 30
    },
    isget: false,
    data: defaultvalues
};

await requestengine({
    link: testdata.link,
    method: testdata.method,
    headers: testdata.headers,
    bodytosend: testdata.bodytosend,
    isget: testdata.isget,
    data: testdata.data
});
