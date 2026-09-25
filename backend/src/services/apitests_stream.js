import crypto from "crypto";

const sendfiles = async (
    link,
    method,
    headers = {},
    obj = {},
    file = null,
    fieldname = "file"
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

        const response = await fetch(link, {
            method: method,
            headers: headers,
            body: body,
            duplex: "half"
        });

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

    const body = createMultipartStream(
        obj,
        file.stream,
        file.fieldname || fieldname,
        filename,
        file.mimetype || "application/octet-stream",
        boundary,
        obj.append === true ? obj.appenddata : null
    );

    const newHeaders = {};

    for (const key in headers) {
        if (key.toLowerCase() !== "content-type") {
            newHeaders[key] = headers[key];
        }
    }

    newHeaders["Content-Type"] =
        "multipart/form-data; boundary=" + boundary;

    const response = await fetch(link, {
        method: method,
        headers: newHeaders,
        body: body,
        duplex: "half"
    });

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

export {
    sendfiles
};