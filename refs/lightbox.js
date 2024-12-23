// Assumes bootstrap

function lightbox(e) {
    if (e.target.tagName != "IMG") return
    LB_IMG.src = e.target.src
    showLb()
}

function showLb() {
    LIGHTBOX.classList.remove("hide")
}

function hideLb() {
    LIGHTBOX.classList.add("hide")
}

export default function enableLightbox(e) {
    if (!e) return
    e.addEventListener("click", lightbox)
}

const LIGHTBOX = document.createElement("div")
LIGHTBOX.id = "lightbox"
LIGHTBOX.className = "media align-items-center justify-content-center hide"
const LB_IMG = document.createElement("img")
LB_IMG.id = "lbImg"
LIGHTBOX.appendChild(LB_IMG)
document.body.appendChild(LIGHTBOX)
LIGHTBOX.addEventListener("click", hideLb)
