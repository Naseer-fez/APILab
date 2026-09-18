import { parsebody } from '../services/concurencytest.js';
import {requestengine} from '../services/concurencyengine.js';

const concurrencetestcontroller = async (req, res) => {
    const bodydata = parsebody(req.body,req.file); // we have pased the body data and now we can use it to send the request to the endpoint

    // console.log("The body data is ", bodydata);
    if (bodydata[0] === 0) {
        return res.status(bodydata[2]).json({ message: bodydata[1] });
    }
    // console.log("The body data is ", bodydata[1]);
    // we have pased the body data and now we can use it to send the request to the endpoint
    const enginedata = await concurrencerequest(bodydata[1]);
    if (enginedata[0] === 0) {
        return res.status(enginedata[2]).json({ message: enginedata[1] });
    }

    res.status(200).json({ message: "concurrency test controller", data: enginedata[1] });
}

const concurrencerequest = async ({ link, method, headers, data, bodytosend }) => {
    // now the first thing is we need one function to send one requests 
    var isget = false;
    if (method == "GET") {
        // link = link + "?" + new URLSearchParams(bodytosend).toString();
        link = link //test nothing else
        isget = true;
    }


    const finaldata = {
        link: link,
        method: method,
        headers: headers,
        bodytosend: bodytosend,
        isget: isget
    }// so that we can send the data to the sendrequest function and get the response from it
    const reqdata = await requestengine({ link, method, headers, bodytosend, isget,data });
    return reqdata;
    //mostly will send a list ig




}



export { concurrencetestcontroller };