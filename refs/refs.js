import {getAlbums, randomInt, enumerate} from "./common.js"
import {enableCarouselControls} from "./carousel.js"

const imgHosts = {
    "im": "https://i.imgur.com/$",
    "tw": "https://pbs.twimg.com/media/$?format=jpg",
    "db": "https://cdn.donmai.us/sample/%1/%2/sample-$.jpg",
    "bs": "https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:$@jpeg"
}
const gallery = document.getElementById("gallery")
const t_imgCard = document.getElementById("t-img-card")
const msg = document.getElementById("msg")

enableLightbox(gallery)
document.getElementById("random").addEventListener("click", pickRandom)
document.getElementById("reset").addEventListener("click", pickReset)
handleRequest()

function handleRequest() {
    let params = new URLSearchParams(document.location.search)

    if (params.size == 0) {
        parseAlbum("Himari")
    }
    //albums
    else if (params.has("a")) {
        parseAlbum(params.get("a"))
    }
    //image list
    else if (params.has("i")) {
        parseImages(params.get("i"))
    }
    else if (params.has("gr")) {
        let an = params.get("an")
        getAlbums().then(data => addImage( parseImageData(data[an][params.get("gr")])) )
        msg.innerHTML = `Image randomly selected from the <a href="?a=${an}">${an}</a> album.`
        document.getElementById("randomizer").classList.remove("hide")
        document.getElementById("random").classList.add("hide")
        document.getElementById("reset").classList.add("hide")
    }
    else if (params.has("all")) {
        getAlbums().then(showAll)
    }
}

function parseImageSource(imgSrc) {
    if (imgSrc[2] == ":") {
        let [host, id] = imgSrc.split(":")
        imgSrc = imgHosts[host].replace("$", id)
        if (host == "db") {
            imgSrc = imgSrc.replace("%1", id.substring(0,2)).replace("%2", id.substring(2,4))
        }
    }
    else if (!imgSrc.startsWith("http")) {
        imgSrc = imgHosts["im"].replace("$", imgSrc)
    }
    return imgSrc
}

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

export function addImage(parsedImgData, idx) {
    let {src, title, msg, isCaptioned, isCarousel} = parsedImgData
    let imgCard = document.importNode(t_imgCard.content, true)
    if (isCarousel) {
        imgCard.querySelector(".carousel-controls").classList.remove("hide")
        let imageList = imgCard.querySelector(".card-images")
        let t_image = imgCard.querySelector(".card-img-top")
        let newImages = []
        for (let [i, imgSrc] of enumerate(src)) {
            let newImage = t_image.cloneNode()
            newImage.src = imgSrc
            newImage.idx = idx
            newImage.subIdx = i
            newImages.push(newImage)
        }
        imageList.classList.add("multi")
        newImages[0].classList.add("active")
        newImages[0].addEventListener(
            "load",
            e => { e.target.parentElement.style.height = e.target.clientHeight + "px" },
            { once: true, passive:true }
        )
        newImages[0].addEventListener("error", h_onImgError, { once: true, passive:true })
        imageList.replaceChildren(...newImages)
        enableCarouselControls(imgCard.firstElementChild)
    }
    else {
        let img = imgCard.querySelector("img")
        img.src = src
        img.idx = idx
        img.addEventListener("error", h_onImgError, { once: true, passive:true })
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
            if ( (parsed.isCarousel && seen.has(parsed.src[0])) || seen.has(parsed.src) ) {
                continue
            }
            seen.add(parsed.src)
        }
        addImage(parsed, i)
    }
}

async function parseAlbum(name) {
    let albums = await getAlbums()
    let imgs = albums[name]
    if (!imgs) {
        msg.textContent = "Album doesn't exist"
        // msg.classList.remove("hide")
        return
    }
    document.getElementById("name").textContent = ` (${name})`
    parseImages(imgs)
}

function pickRandom() {
    let idx = randomInt(gallery.children.length)
    let choice = gallery.children[idx]
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
    e.target.parentElement.parentElement.parentElement.classList.add("hide")
    var ele = document.getElementById("error-msg")
    var msg
    ele.errors = (ele.errors || 0) + 1
    if (ele.errors > 1) {
        msg = `${ele.errors} images failed to load`
        let host = new URL(e.target.src).host
        if (!ele.failedHosts.includes(host)) {
            ele.failedHosts.push(host)
        }
    }
    else {
        msg = "An image failed to load"
        ele.failedHosts = [new URL(e.target.src).host]
    }
    msg += ` from host${ele.failedHosts?.length > 1 ? "s" : ""}: ${ele.failedHosts.join(", ")}`
    ele.innerHTML = msg
    ele.classList.remove("hide")
    console.log(arguments)
}
