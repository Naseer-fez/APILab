const RESULTS = [
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"abc","age":9007199254740991,"salary":1.7976931348623157e+308}}',
        datasent: {
            name: 'abc',
            age: 9007199254740991,
            salary: 1.7976931348623157e+308
        }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"def","age":-9007199254740991,"salary":5e-324}}',
        datasent: { name: 'def', age: -9007199254740991, salary: 5e-324 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: NaN, salary: 2.220446049250313e-16 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: Infinity, salary: 1e-10 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: -Infinity, salary: 120000 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":0,"salary":-0.0025}}',
        datasent: { name: 'ghi', age: -0, salary: -0.0025 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":255,"salary":0.5}}',
        datasent: { name: 'ghi', age: 255, salary: 0.5 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":10,"salary":-0.75}}',
        datasent: { name: 'ghi', age: 10, salary: -0.75 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":493,"salary":1e-15}}',
        datasent: { name: 'ghi', age: 493, salary: 1e-15 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '007', salary: NaN }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '+42', salary: Infinity }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '-0', salary: -Infinity }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"  42  ","salary":"3.14.15"}}',
        datasent: { name: 'ghi', age: '  42  ', salary: '3.14.15' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"42px","salary":"1,234.56"}}',
        datasent: { name: 'ghi', age: '42px', salary: '1,234.56' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: null, salary: '.99' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: undefined, salary: '1e3' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":true,"salary":3.141592653589793}}',
        datasent: { name: 'ghi', age: true, salary: 3.141592653589793 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":false,"salary":[1.5]}}',
        datasent: { name: 'ghi', age: false, salary: [Array] }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: [], salary: null }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[5],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[1,2],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":{},"salary":false}}',
        datasent: { name: 'ghi', age: {}, salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"abc","age":9007199254740991,"salary":1.7976931348623157e+308}}',
        datasent: {
            name: 'abc',
            age: 9007199254740991,
            salary: 1.7976931348623157e+308
        }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"def","age":-9007199254740991,"salary":5e-324}}',
        datasent: { name: 'def', age: -9007199254740991, salary: 5e-324 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: NaN, salary: 2.220446049250313e-16 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: Infinity, salary: 1e-10 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: -Infinity, salary: 120000 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":0,"salary":-0.0025}}',
        datasent: { name: 'ghi', age: -0, salary: -0.0025 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":255,"salary":0.5}}',
        datasent: { name: 'ghi', age: 255, salary: 0.5 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":10,"salary":-0.75}}',
        datasent: { name: 'ghi', age: 10, salary: -0.75 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":493,"salary":1e-15}}',
        datasent: { name: 'ghi', age: 493, salary: 1e-15 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '007', salary: NaN }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '+42', salary: Infinity }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '-0', salary: -Infinity }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"  42  ","salary":"3.14.15"}}',
        datasent: { name: 'ghi', age: '  42  ', salary: '3.14.15' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"42px","salary":"1,234.56"}}',
        datasent: { name: 'ghi', age: '42px', salary: '1,234.56' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: null, salary: '.99' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: undefined, salary: '1e3' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":true,"salary":3.141592653589793}}',
        datasent: { name: 'ghi', age: true, salary: 3.141592653589793 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":false,"salary":[1.5]}}',
        datasent: { name: 'ghi', age: false, salary: [Array] }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: [], salary: null }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[5],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[1,2],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":{},"salary":false}}',
        datasent: { name: 'ghi', age: {}, salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"abc","age":9007199254740991,"salary":1.7976931348623157e+308}}',
        datasent: {
            name: 'abc',
            age: 9007199254740991,
            salary: 1.7976931348623157e+308
        }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"def","age":-9007199254740991,"salary":5e-324}}',
        datasent: { name: 'def', age: -9007199254740991, salary: 5e-324 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: NaN, salary: 2.220446049250313e-16 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: Infinity, salary: 1e-10 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: -Infinity, salary: 120000 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":0,"salary":-0.0025}}',
        datasent: { name: 'ghi', age: -0, salary: -0.0025 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":255,"salary":0.5}}',
        datasent: { name: 'ghi', age: 255, salary: 0.5 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":10,"salary":-0.75}}',
        datasent: { name: 'ghi', age: 10, salary: -0.75 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":493,"salary":1e-15}}',
        datasent: { name: 'ghi', age: 493, salary: 1e-15 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '007', salary: NaN }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '+42', salary: Infinity }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '-0', salary: -Infinity }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"  42  ","salary":"3.14.15"}}',
        datasent: { name: 'ghi', age: '  42  ', salary: '3.14.15' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"42px","salary":"1,234.56"}}',
        datasent: { name: 'ghi', age: '42px', salary: '1,234.56' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: null, salary: '.99' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: undefined, salary: '1e3' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":true,"salary":3.141592653589793}}',
        datasent: { name: 'ghi', age: true, salary: 3.141592653589793 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":false,"salary":[1.5]}}',
        datasent: { name: 'ghi', age: false, salary: [Array] }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: [], salary: null }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[5],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[1,2],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":{},"salary":false}}',
        datasent: { name: 'ghi', age: {}, salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"abc","age":9007199254740991,"salary":1.7976931348623157e+308}}',
        datasent: {
            name: 'abc',
            age: 9007199254740991,
            salary: 1.7976931348623157e+308
        }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"def","age":-9007199254740991,"salary":5e-324}}',
        datasent: { name: 'def', age: -9007199254740991, salary: 5e-324 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: NaN, salary: 2.220446049250313e-16 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: Infinity, salary: 1e-10 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: -Infinity, salary: 120000 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":0,"salary":-0.0025}}',
        datasent: { name: 'ghi', age: -0, salary: -0.0025 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":255,"salary":0.5}}',
        datasent: { name: 'ghi', age: 255, salary: 0.5 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":10,"salary":-0.75}}',
        datasent: { name: 'ghi', age: 10, salary: -0.75 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":493,"salary":1e-15}}',
        datasent: { name: 'ghi', age: 493, salary: 1e-15 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '007', salary: NaN }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '+42', salary: Infinity }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '-0', salary: -Infinity }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"  42  ","salary":"3.14.15"}}',
        datasent: { name: 'ghi', age: '  42  ', salary: '3.14.15' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":"42px","salary":"1,234.56"}}',
        datasent: { name: 'ghi', age: '42px', salary: '1,234.56' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: null, salary: '.99' }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: undefined, salary: '1e3' }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":true,"salary":3.141592653589793}}',
        datasent: { name: 'ghi', age: true, salary: 3.141592653589793 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":false,"salary":[1.5]}}',
        datasent: { name: 'ghi', age: false, salary: [Array] }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: [], salary: null }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[5],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":[1,2],"salary":false}}',
        datasent: { name: 'ghi', age: [Array], salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":{},"salary":false}}',
        datasent: { name: 'ghi', age: {}, salary: false }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"abc","age":9007199254740991,"salary":1.7976931348623157e+308}}',
        datasent: {
            name: 'abc',
            age: 9007199254740991,
            salary: 1.7976931348623157e+308
        }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"def","age":-9007199254740991,"salary":5e-324}}',
        datasent: { name: 'def', age: -9007199254740991, salary: 5e-324 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: NaN, salary: 2.220446049250313e-16 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: Infinity, salary: 1e-10 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: -Infinity, salary: 120000 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":0,"salary":-0.0025}}',
        datasent: { name: 'ghi', age: -0, salary: -0.0025 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":255,"salary":0.5}}',
        datasent: { name: 'ghi', age: 255, salary: 0.5 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":10,"salary":-0.75}}',
        datasent: { name: 'ghi', age: 10, salary: -0.75 }
    },
    {
        ok: true,
        status: 200,
        statusText: 'OK',
        response: '{"message":"Request received","data":{"name":"ghi","age":493,"salary":1e-15}}',
        datasent: { name: 'ghi', age: 493, salary: 1e-15 }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '007', salary: NaN }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '+42', salary: Infinity }
    },
    {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        response: '{"message":"Missing required fields"}',
        datasent: { name: 'ghi', age: '-0', salary: -Infinity }
    }
]


const resultsparser = (results) => {
    //Now lets work on this 
    // console.log("Results are: ", results);
    // const successfulRequests = results.filter(response => response.ok).length;
    // const failedRequests = results.length - successfulRequests;
    var successfulRequests = 0;
    var failedRequests = 0;
    var totalRequests = results.length;
    const output = new Map();
    const outputcount = new Map();
    const datasent = new Map();
    for (var i = 0; i < results.length; i++) {
        const status = results[i].status;
        if (!output.has(status)) {
            output.set(status, []);

        }
        output.get(status).push({

            tatustext: results[i].statusText,
            statuscode: status
        });
        if (!datasent.has(status)) {
            datasent.set(status, []);

        }
        datasent.get(status).push(results[i].datasent);
        outputcount.set(status, (output.get(status) || 0) + 1);




    }

    console.log("Output is: ", output);
    console.log("Output count is: ", outputcount);
    console.log("Datasent is: ", datasent);




    return {
        successful: successfulRequests,
        failed: failedRequests
    };

};

console.log(RESULTS[1])
resultsparser(RESULTS);
// console.log(RESULTS[1].datasent)