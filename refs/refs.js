// import albums from "./albums.json" assert { type: 'json' }
const imgHost = "https://i.imgur.com/"

const gallery = document.getElementById("gallery")
const t_imgCard = document.getElementById("t-img-card")
const msg = document.getElementById("msg")

enableLightbox(gallery)
document.getElementById("random").addEventListener("click", pickRandom)
document.getElementById("reset").addEventListener("click", pickReset)
handleRequest()

function handleRequest() {
    params = new URLSearchParams(document.location.search)

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
}

function addImage(fn) {
    imgSrc = imgHost + fn
    n = document.importNode(t_imgCard.content, true)
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
    albums = await fetch("./albums.json").then(x => x.json())
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
    let idx = Math.floor(Math. random() * gallery.children.length)
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
