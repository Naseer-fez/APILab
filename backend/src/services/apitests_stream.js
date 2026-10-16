import crypto from "crypto";
import { resultmetric } from './resultsmetric.js';
const resultid = "api_test";

//This will track the bytes sent and received in the stream and update the resultmetric accordingly
const trackStreamBytes = async function* (stream) {
    for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

        await resultmetric.datacalulator(
            resultid,
            buffer,
            false // sent
        );

        yield buffer;
    }
};

const sendfiles = async (
    link,
    method,
    headers = {},
    obj = {},
    file = null,
    fieldname = "file",
    num = 1
) => {
    if (!file || !file.stream) {
        return [0, "Invalid file stream", 400];
    }

    let contentType = "";

    if (headers["content-type"]) {
        contentType = headers["content-type"];
    } else if (headers["Content-Type"]) {
        contentType = headers["Content-Type"];
    }

    if (
        contentType &&
        contentType.toLowerCase().includes("multipart/form-data") === false
    ) {
        let body = file.stream;

        if (obj.append === true && obj.appenddata != null) {
            body = appendToStream(
                file.stream,
                obj.appenddata
            );
        }
        body = trackStreamBytes(body);
        resultmetric.startlatency(resultid, num);
        const response = await fetch(link, {
            method: method,
            headers: headers,
            body: body,
            duplex: "half"
        });
        resultmetric.endlatency(resultid, num);

        return [
            1,
            response,
            response.status
        ];
    }

    const boundary =
        "----APIIntegration" + crypto.randomUUID();

    const filename = file.file
        ? file.file.split(/[\\/]/).pop()
        : "file";

    const multipartBody  = createMultipartStream(
        obj,
        file.stream,
        file.fieldname || fieldname,
        filename,
        file.mimetype || "application/octet-stream",
        boundary,
        obj.append === true ? obj.appenddata : null
    );
    const body = trackStreamBytes(multipartBody);
    const newHeaders = {};

    for (const key in headers) {
        if (key.toLowerCase() !== "content-type") {
            newHeaders[key] = headers[key];
        }
    }

    newHeaders["Content-Type"] =
        "multipart/form-data; boundary=" + boundary;
    resultmetric.startlatency(resultid, num);
    const response = await fetch(link, {
        method: method,
        headers: newHeaders,
        body: body,
        duplex: "half"
    });
    resultmetric.endlatency(resultid, num);
    return [
        1,
        response,
        response.status
    ];
};
const createMultipartStream = async function* (
    obj,
    filestream,
    fieldname,
    filename,
    mimetype,
    boundary,
    append
) {
    for (const key in obj) {
        if (
            key === "append" ||
            key === "appenddata" ||
            key === fieldname ||
            key === "multerfile" ||
            key === "defaultval"
        ) {
            continue;
        }

        if (obj[key] == null || typeof obj[key] === "object") {
            continue;
        }

        yield Buffer.from(
            "--" + boundary + "\r\n" +
            'Content-Disposition: form-data; name="' +
            key +
            '"\r\n\r\n' +
            obj[key] +
            "\r\n"
        );
    }

    yield Buffer.from(
        "--" + boundary + "\r\n" +
        'Content-Disposition: form-data; name="' +
        fieldname +
        '"; filename="' +
        filename +
        '"\r\n' +
        "Content-Type: " +
        mimetype +
        "\r\n\r\n"
    );

    for await (const chunk of filestream) {
        yield chunk;
    }

    if (append != null) {
        if (Buffer.isBuffer(append)) {
            yield append;
        } else {
            yield Buffer.from(String(append));
        }
    }

    yield Buffer.from(
        "\r\n--" + boundary + "--\r\n"
    );
};

const appendToStream = async function* (
    stream,
    append
) {
    for await (const chunk of stream) {
        yield chunk;
    }

    if (append != null) {
        if (Buffer.isBuffer(append)) {
            yield append;
        } else {
            yield Buffer.from(String(append));
        }
    }
};

const metricanalysis = async (result) => {
    let data;

    const text = await result.text();

    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    resultmetric.datacalulator(resultid, data, true); //recived
    const resultdata = {
        status: result.status,
        data: data,
        headers: Object.fromEntries(result.headers.entries())
    };

    await resultmetric.storeresult(resultid, resultdata);

    if (!result.ok) {
        await resultmetric.storediagnostics(resultid, resultdata);
    }
};



export {
    sendfiles
};