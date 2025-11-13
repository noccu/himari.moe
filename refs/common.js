export const PARAMS = new URLSearchParams(document.location.search)
export const VIDEO_EXTS = ["mp4", "gifv", "webm"]

export async function getAlbums(){
    return fetch(PARAMS.has("s") ? "/refs/albums_special.json" : "/refs/albums.json").then(x => x.json())
    // return (await import("./albums.json", {assert: {type: "json"}})).default
}

export function randomInt(max) {
    return Math.floor(Math. random() * max)
}

/**
 * @template T
 * @param {Iterable<T>} col
 * @returns {Generator<[number, T]>}
 * */
export function* enumerate(col) {
    let i = 0
    for (let e of col) {
        yield [i, e]
        i++
    }
}

/** @returns {?string} */
export function getExt(str) {
    const m = str.match(/[\.=](.{1,4})$/)
    if (!m) return m
    return m[1].toLowerCase()
}

export function isVideo(href) {
    return VIDEO_EXTS.includes(getExt(href))
}

export async function isUrl404(href) {
    const res = await fetch(href, { method: "HEAD" })
    return res.status == 404
}

export function isImg404(href, useRef=false) {
    const img = new Image()
    if (!useRef) img.referrerPolicy = "no-referrer"
    /** @type {Promise<boolean>} */
    const p = new Promise(r => {
        img.addEventListener("error", _ => r(true), { once: true })
        img.addEventListener(isVideo(href) ? "loadedmetadata" : "load", _ => r(false), { once: true })
    })
    img.src = href
    return p
}