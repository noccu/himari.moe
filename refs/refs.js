import {getAlbums, randomInt} from "./common.js"

const imgHosts = {
    "im": "https://i.imgur.com/$",
    "tw": "https://pbs.twimg.com/media/$?format=jpg",
    "db": "https://cdn.donmai.us/sample/%1/%2/sample-$.jpg"
}
const gallery = document.getElementById("gallery")
const t_imgCard = document.getElementById("t-img-card")
const t_imgCard_captioned = document.getElementById("t-img-card-captioned")
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
    if (params.has("gr")) {
        let an = params.get("an")
        msg.innerHTML = `Image randomly selected from the <a href="?a=${an}">${an}</a> album.`
        document.getElementById("randomizer").classList.remove("hide")
        document.getElementById("random").classList.add("hide")
        document.getElementById("reset").classList.add("hide")
    }
}

function addImage(imgData) {
    let isCaptioned = false
    if (imgData instanceof Object) {
        var {src: imgSrc, title: imgTitle, msg: imgMsg} = imgData
        isCaptioned = true
    }
    else {
        var imgSrc = imgData
    }

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

    let imgCard
    if (isCaptioned) {
        imgCard = document.importNode(t_imgCard_captioned.content, true)
        imgCard.querySelector(".card-title").innerText = imgTitle || ""
        imgCard.querySelector(".card-text").innerText = imgMsg || ""
    }
    else {
        imgCard = document.importNode(t_imgCard.content, true)
    }
    imgCard.querySelector("img").src = imgSrc
    gallery.appendChild(imgCard)
}

function parseImages(imgs) {
    if (!imgs) return
    if (!Array.isArray(imgs)) {
        imgs = imgs.split(",")
    }
    for (let imgData of imgs) {
        addImage(imgData)
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
