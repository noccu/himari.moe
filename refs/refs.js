import {getAlbums, randomInt} from "./common.js"

const imgHosts = {
    "im": "https://i.imgur.com/$",
    "tw": "https://pbs.twimg.com/media/$?format=jpg"
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
    if (params.has("gr")) {
        let an = params.get("an")
        msg.innerHTML = `Image randomly selected from the <a href="?a=${an}">${an}</a> album.`
        document.getElementById("randomizer").classList.remove("hide")
    }
}

function addImage(fn) {
    let imgSrc
    if (fn.startsWith("http")) {
        imgSrc = fn
    }
    else if (fn[2] == ":") {
        let [host, id] = fn.split(":")
        imgSrc = imgHosts[host].replace("$", id)
    }
    else {
        imgSrc = imgHosts["im"].replace("$", fn)
    }

    let n = document.importNode(t_imgCard.content, true)
    n.querySelector("img").src = imgSrc
    gallery.appendChild(n)
}

function parseImages(imgs) {
    if (!imgs) return
    if (!Array.isArray(imgs)) {
        imgs = imgs.split(",")
    }
    for (let imgSrc of imgs) {
        addImage(imgSrc)
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
