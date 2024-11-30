import http from "http"
import fs from "fs"
import fsp from "fs/promises"
import fspath from "path"
import { Readable } from "stream"

const ARCHIVE_ROOT = "archive"
const DIR_CACHE = {}
const MIME_TYPE = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".json": "application/json",
    ".css": "text/css",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".apng": "image/apng",
    ".webp": "image/webp",
    ".avif": "image/avif"
}
const MIME_TYPE_REV = Object.fromEntries(Object.entries(MIME_TYPE).map(([k, v]) => [v, k]))
const CACHE = {}
var DEV_MODE = false

function saveFile(name, data) {
    if (name[0] == "/") name = name.slice(1)
    console.log(`saving ${name}`)
    fs.writeFileSync(name, data)
}

async function downloadExternal(href, albName) {
    const pUrl = new URL(href)
    let fn = fspath.basename(pUrl.pathname)
    if (pUrl.host == "cdn.bsky.app") fn = fn.slice(0, -5)
    let savePath = fspath.join(ARCHIVE_ROOT, albName, fn)
    const existing = fs.globSync(savePath + "*")
    if (existing.length == 1) return
    else if (existing.length > 1) {
        console.warn(`Multiple files found for ${href}:\n`, existing)
        return
    }

    const resp = await fetch(href)
    if (!resp.ok) {
        console.warn("Request failed: ", href)
        return
    }
    const type = resp.headers.get("Content-Type")
    if (!type.startsWith("image")) {
        console.warn(`Tried to archive ${type}: ${href}`)
        return
    }
    if (!fspath.extname(fn)) {
        let ext = MIME_TYPE_REV[type]
        if (!ext) {
            console.warn("Couldn't find extension: ", href, type)
            return
        }
        savePath += ext
    }

    console.log(`Writing ${href} to ${savePath}`)
    const dir = fspath.dirname(savePath)
    if (!fs.existsSync(dir)) {
        console.log("Creating new dir: ", albName)
        fs.mkdirSync(dir, { recursive: true })
    }

    const img = Readable.fromWeb(resp.body)
    return fsp.writeFile(savePath, img)
}

async function archive(data) {
    console.log("Archiving album images")
    for (let { albName, src } of data) {
        // Don't get banned, usually few images anyway.
        await downloadExternal(src, albName)
    }
    console.log("Archive completed")
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
            response.writeHead(204)
            response.end()
        })
    }
    else if (request.method == "POST") {
        if (relPath == "archive/") {
            readData(request).then(data => {
                archive(JSON.parse(data))
            })
            response.writeHead(200)
        }
        else if (relPath == "devmode") {
            DEV_MODE = !DEV_MODE
            console.log(`Dev mode status: ${DEV_MODE}`)
            response.writeHead(200).end()
        }
        else response.writeHead(400)
        response.end()
    }
    else if (request.method == "GET") {
        if (relPath == "") relPath = "index.html"
        const headers = {
            "Cache-Control": "no-cache"
        }
        if (!fs.existsSync(relPath)) return notFound(response)
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

        const stat = fs.statSync(relPath, { throwIfNoEntry: false })
        if (!stat) return notFound(response)
        const modTime = stat.mtime.getTime()
        headers["Date"] = stat.mtime.toString()
        headers["ETag"] = modTime
        if (request.headers["if-none-match"] == modTime && request.headers["cache-control"] != "no-cache") {
            return response.writeHead(304, headers).end()
        }
        if (CACHE[relPath]) {
            console.log("Returning data from memory cache.")
            return response.writeHead(200, headers).end(CACHE[relPath])
        }
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
        if (fullUrl.search) {
            console.log("Caching data for query URL.")
            CACHE[relPath] = data
        }
        response.writeHead(200, headers)
        response.end(data)
    }
}

const server = http.createServer(handleRequest)
server.listen(8000, () => {
    console.log("Server listening on port 8000")
})
