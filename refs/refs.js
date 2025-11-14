import {getAlbums, randomInt, enumerate, isVideo} from "./common.js"
import {enableCarouselControls} from "./carousel.js"
import enableLightbox from "./lightbox.js"

const imgHosts = {
    "im": "https://i.imgur.com/$",
    "tw": "https://pbs.twimg.com/media/$?format=jpg",
    "db": "https://cdn.donmai.us/sample/%1/%2/sample-$.jpg",
    "dbgif": "https://cdn.donmai.us/original/%1/%2/$.gif",
    "bs": "https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:$@jpeg"
}
const reqRef = ["cdn.donmai.us"]
const gallery = document.getElementById("gallery")
const t_imgCard = document.getElementById("t-img-card")
const msg = document.getElementById("msg")

/** Automatically tracks load state */
class ImgLoadState {
    #p
    #expect
    #done
    constructor() {
        this.reset()
    }
    reset() {
        this.#p = Promise.withResolvers()
        this.allLoaded = this.#p.promise
        this.#expect = this.#done = 0
    }
    imgAdded(img) {
        img.addEventListener(img.nodeName == "VIDEO" ? "loadedmetadata" : "load", this, {once: true, passive: true})
        img.addEventListener("error", this, {once: true, passive: true})
        this.#expect += 1
    }
    handleEvent(e) {
        this.#done += 1
        if (e.type == "error") h_onImgError(e)
        if (this.#done == this.#expect) {
            this.#p.resolve(this.#done)
            this.reset()
        }
        e.target.dispatchEvent(ev_media_load)
    }
}
const IMAGE_LOAD_STATE = new ImgLoadState()

const ev_media_load = new Event("mediaload")
const ev_height_reset = new Event("heightreset")

function handleRequest() {
    let params = new URLSearchParams(document.location.search)

    if (params.size == 0) {
        parseAlbum("Himari")
    }
    //albums
    else if (params.has("a")) {
        document.title += ` (${params.get("a")})`
        parseAlbum(params.get("a"))
            .then(() => {
                if (params.has("r")) pickRandom()
            })
    }
    //image list
    else if (params.has("i")) {
        parseImages(params.get("i"))
    }
    else if (params.has("gr")) {
        let an = params.get("an")
        getAlbums().then(data => addImage(parseImageData(data[an][params.get("gr")])))
        msg.innerHTML = `Image randomly selected from the <a href="?a=${an}">${an}</a> album.`
        document.getElementById("randomizer").classList.remove("hide")
        document.getElementById("random").classList.add("hide")
        document.getElementById("reset").classList.add("hide")
    }
    else if (params.has("all")) {
        getAlbums().then(showAll)
    }
    else if (params.has("col")) {
        parseCollection(params.getAll("col"))
    }
}

export function parseImageSource(imgSrc) {
    if (imgSrc.startsWith("http")) {
        return imgSrc
    }

    const [host, id] = imgSrc.split(":")
    if (id) {
        imgSrc = imgHosts[host].replace("$", id)
        if (["db", "dbgif"].includes(host)) {
            imgSrc = imgSrc.replace(/%(\d)/g, (_, n) => {
                switch (n) {
                    case "1": return id.substring(0, 2)
                    case "2": return id.substring(2, 4)
                }
            })
        }
    }
    else {
        imgSrc = imgHosts["im"].replace("$", imgSrc)
    }
    return imgSrc
}

/** @returns {{src: string | string[], title: string, msg:string, isCaptioned: boolean, isCarousel:boolean}} */
export function parseImageData(imgData) {
    let src, title, msg, isCaptioned = false, isCarousel = false
    if (Array.isArray(imgData)) {
        src = imgData.map(parseImageSource)
        isCarousel = true
    }
    else if (imgData instanceof Object) {
        ({src, isCarousel} = parseImageData(imgData.src))
        title = imgData.title
        msg = imgData.msg
        isCaptioned = true
    }
    else {
        src = parseImageSource(imgData)
    }
    return {src, title, msg, isCaptioned, isCarousel}
}

function tryCastVideo(src, contentBase) {
    var parsed_src = new URL(src)
    if (isVideo(parsed_src.pathname)) {
        const vid = document.createElement("video")
        vid.className = contentBase.className
        vid.controls = vid.muted = vid.loop = vid.playsinline = true
        vid.preload = "metadata"
        return vid
    }
}

export function requiresRef(href) {
    const url = new URL(href)
    return reqRef.includes(url.host)
}

function setReferrer(imgEle) {
    if (requiresRef(imgEle.src)) imgEle.referrerPolicy = ""
}

function resetHeight(e) {
    for (const child of e.target.parentElement.children) {
        child.removeAttribute("height")
    }
    e.target.dispatchEvent(ev_height_reset)
}

export function addImage(parsedImgData, idx) {
    let {src, title, msg, isCaptioned, isCarousel} = parsedImgData
    let imgCard = document.importNode(t_imgCard.content, true)
    let content = imgCard.querySelector(".card-img-top")
    if (isCarousel) {
        imgCard.querySelector(".carousel-controls").classList.remove("hide")
        let imageList = imgCard.querySelector(".card-images")
        let newImages = []
        for (let [i, imgSrc] of enumerate(src)) {
            let vid = tryCastVideo(imgSrc, content)
            let newImage = vid || content.cloneNode()
            newImage.src = imgSrc
            newImage.idx = idx
            newImage.subIdx = i
            setReferrer(newImage)
            newImages.push(newImage)
        }
        imageList.classList.add("multi")
        newImages[0].classList.add("active")
        newImages[0].addEventListener("mediaload", resetHeight)
        newImages[0].addEventListener(
            "heightreset",
            e => {
                for (let c of e.target.parentElement.children) {
                    c.style.height = e.target.parentElement.clientHeight + "px"
                }
            },
            {once: true, passive: true}
        )
        IMAGE_LOAD_STATE.imgAdded(newImages[0])
        imageList.replaceChildren(...newImages)
        enableCarouselControls(imgCard.firstElementChild)
    }
    else {
        let vid = tryCastVideo(src, content)
        if (vid) {
            content.replaceWith(vid)
            content = vid
        }
        content.src = src
        content.idx = idx
        setReferrer(content)
        content.addEventListener("mediaload", resetHeight)
        IMAGE_LOAD_STATE.imgAdded(content)
    }
    if (isCaptioned) {
        imgCard.querySelector(".card").classList.add("captioned")
        imgCard.querySelector(".card-title").innerText = title || ""
        imgCard.querySelector(".card-text").innerText = msg || ""
    }
    const newNode = imgCard.firstElementChild
    gallery.appendChild(imgCard)
    return newNode
}

function parseImages(imgs, seen = undefined) {
    if (!imgs) return
    if (!Array.isArray(imgs)) {
        imgs = imgs.split(",")
    }
    var parsed
    for (var [i, imgData] of enumerate(imgs)) {
        parsed = parseImageData(imgData)
        if (seen !== undefined) {
            if ((parsed.isCarousel && seen.has(parsed.src[0])) || seen.has(parsed.src)) {
                continue
            }
            seen.add(parsed.src)
        }
        addImage(parsed, i)
    }
}

async function parseAlbum(name) {
    if (name == "Himari") document.getElementById("note").classList.add("hide")
    let albums = await getAlbums()
    let imgs = albums[name]
    if (!imgs) {
        msg.textContent = "Album doesn't exist"
        // msg.classList.remove("hide")
        return
    }
    document.getElementById("name").textContent = ` (${name})`
    parseImages(imgs)
    return IMAGE_LOAD_STATE.allLoaded
}

function colImgParser(album, imgId) {
    let img = parseInt(imgId)
    if (Number.isNaN(img)) return imgId
    return album[img]
}

async function parseCollection(colList) {
    const albums = await getAlbums()
    const colImages = []
    const albumNames = []
    for (let set of colList) {
        let [albName, images] = set.split(":")
        albumNames.push(`<a href="?a=${albName}">${albName}</a>`)
        images = images.split(",").map(e => colImgParser(albums[albName], e))
        colImages.push(...images)
    }
    msg.innerHTML = `Images selected from albums: ${albumNames.join(", ")}`
    parseImages(colImages)
}

function pickRandom() {
    const filtered = gallery.querySelectorAll(".card:not(.error)")
    let idx = randomInt(filtered.length)
    let choice = filtered[idx]
    choice.classList.remove("hide")
    for (var card of gallery.children) {
        if (card == choice) continue
        card.classList.add("hide")
    }
}

function pickReset() {
    for (var card of gallery.children) {
        card.classList.remove("hide")
    }
}

function showAll(albums) {
    var seen = new Set()
    for (var [name, imgs] of Object.entries(albums)) {
        if (name == "Himari") continue
        parseImages(imgs, seen)
    }
}

function h_onImgError(e) {
    e.target.closest(".card").classList.add("error")
    const ele = document.getElementById("error-msg")
    const host = new URL(e.target.src).host
    var msg
    ele.errors = (ele.errors || 0) + 1
    if (ele.errors > 1) {
        msg = `${ele.errors} images failed to load`
        if (!ele.failedHosts.includes(host)) {
            ele.failedHosts.push(host)
        }
    }
    else {
        msg = "An image failed to load"
        ele.failedHosts = [host]
    }
    msg += ` from host${ele.failedHosts?.length > 1 ? "s" : ""}: ${ele.failedHosts.join(", ")}`
    msg += "\nOn some browsers, strict Enhanced Tracking Protection could be blocking images, check the icon to the left of the address bar."
    ele.innerHTML = msg
    ele.classList.remove("hide")
}

if (location.pathname.match(/refs\/?$/)) {
    enableLightbox(gallery)
    document.getElementById("random").addEventListener("click", pickRandom)
    document.getElementById("reset").addEventListener("click", pickReset)
    handleRequest()
}
