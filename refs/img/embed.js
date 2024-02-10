const imgHost = "https://i.imgur.com/"

const g = document.getElementById("gallery")
const t = document.getElementById("t-img-card")

function parseImages() {
    var imgs = document.location.hash
    if (!imgs) return
    for (let imgSrc of imgs.slice(1).split(",")) {
        imgSrc = imgHost + imgSrc
        n = document.importNode(t.content, true)
        n.querySelector("img").src = imgSrc
        g.appendChild(n)
    }
}

parseImages()
enableLightbox(g)
