import http from "http"
import fs from "fs"
import fspath from "path"

const DIR_CACHE = {}
const MIME_TYPE = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".css": "text/css",
}

function saveFile(name, data) {
    if (name[0] == "/") name = name.slice(1)
    console.log(`saving ${name}`)
    fs.writeFileSync(name, data)
}

function notFound(r) {
    r.writeHead(404)
    r.end()
}

function readData(request) {
    return new Promise((r, x) => {
        let data = ""
        request.on("data", d => data += d)
        request.on("end", () => {
            if (!request.complete) {
                console.error("Connection terminated unexpectedly")
                x()
                return
            }
            r(data)
        })
    })
}

/**
 * @param {http.IncomingMessage} request
 * @param {http.ServerResponse} response
 */
function handleRequest(request, response) {
    console.log(`${request.method} ${request.url || "/"}`)
    const fullUrl = new URL(`http://localhost:8000${request.url}`)
    let relPath = fullUrl.pathname.slice(1)
    if (request.method == "PUT") {
        readData(request).then(data => {
            saveFile(relPath, data)
            response.end()
        })
    }
    else if (request.method == "GET") {
        if (relPath == "") relPath = "index.html"
        if (!fs.existsSync(relPath)) return notFound(response)
        const headers = {}
        var isDir = DIR_CACHE[relPath],
            basePath = undefined
        if (isDir === undefined) {
            DIR_CACHE[relPath] = isDir = fs.statSync(relPath).isDirectory()
        }
        if (isDir) {
            if (relPath[relPath.length - 1] != "/") {
                relPath += "/"
                basePath = "/" + relPath
                // response.writeHead(301, {location: fullUrl.toString()})
                // response.end()
                // return
            }
            relPath += "index.html"
        }
        if (!fs.existsSync(relPath)) return notFound(response)
        const ext = fspath.extname(relPath)
        headers["Content-Type"] = MIME_TYPE[ext] || "text/plain"
        var data = fs.readFileSync(relPath, { encoding: "utf-8" })
        if (ext == ".html") {
            if (basePath) {
                data = data.replace("<head>", `<head><base href="${basePath}">`)
            }
            data = data.replace(
                "</head>",
                `<script type="module" src="/refs/edit/edit.js"></script></head>`
            )
        }
        response.writeHead(200, headers)
        response.end(data)
    }
}

const server = http.createServer(handleRequest)
server.listen(8000, () => {
    console.log("Server listening on port 8000")
})
