import { getAlbums } from "../common.js"

const ALBUMS = await getAlbums()
const CUR_ALBUM = new URLSearchParams(location.search).get("a")
/** @type {Set<HTMLElement>} */
const SELECTION = new Set()
var ACTIVE = false

const hosts = {
    "i.imgur.com": ["", /([^\/]+)$/],
    "pbs.twimg.com": ["tw:", /media\/([^?]+)\?/],
    "cdn.donmai.us": ["db:", /sample-([^\.]+).jpg/],
    "cdn.bsky.app": ["bs:", /did:plc:([^@]+)@/]
}

/** @param {string} href */
function parseUrl(href) {
    /** @type {[string, RegExp]} */
    const data = hosts[(new URL(href)).host]
    if (!data) return href
    const [prefix, re] = data
    return `${prefix}${href.match(re)[1]}`
}

/** @param {PointerEvent} e */
function select(e) {
    if (!ACTIVE) return
    if (e.target.nodeName == "IMG" && e.target.parentElement.classList.contains("card-images")) {
        let active = e.target.classList.toggle("editing")
        if (active) {
            SELECTION.add(e.target)
        }
        else {
            SELECTION.delete(e.target)
        }
        e.stopPropagation()
    }
}

/** @param {KeyboardEvent} e */
function handleKeys(e) {
    if (!e.shiftKey) {
        return
    }
    switch (e.key.toLowerCase()) {
        case "e":
            toggleEditMode()
            break
        case "d":
            remSelection()
            break
        case "a":
            addImages()
            break
        case "c":
            clearSelection()
    }
}

function addImages() {
    switch (SELECTION.size) {
        case 0:
            addNewImage(ALBUMS[CUR_ALBUM])
            clearSelection()
            break
        case 1:
            addToCarousel()
            break
        default:
            alert("Multiple images selected. Clear selection or select a carousel.")
    }
}

function addNewImage (collection, msg="Add image to album") {
    const newImgUrl = prompt(msg)
    if (!newImgUrl) return
    const parsedImgUrl = parseUrl(newImgUrl)
    collection.push(parsedImgUrl)
    console.log(`Adding ${newImgUrl} to ${CUR_ALBUM} as ${parsedImgUrl}`)
    console.log(ALBUMS[CUR_ALBUM])
}

function addToCarousel() {
    // Only ever 1 ele
    for (let ele of SELECTION) {
        if (ele.subIdx == undefined) {
            alert("Selected image is not a carousel")
            return
        }
        let imgData = ALBUMS[CUR_ALBUM][ele.idx]
        if (imgData.src) imgData = imgData.src
        addNewImage(imgData, "Add image to carousel")
    }
    clearSelection()
}

function clearSelection() {
    SELECTION.clear()
    for (let card of document.querySelectorAll("img.editing")) {
        card.classList.remove("editing")
    }
}

function remSelection() {
    var removed
    for (let ele of SELECTION) {
        if (ele.subIdx !== undefined) {
            let img = ALBUMS[CUR_ALBUM][ele.idx]
            if (img.src) img = img.src
            removed = img[ele.subIdx]
            img[ele.subIdx] = null

            const card = ele.closest(".card")
            if (card.carouselImages.childElementCount == 1) {
                card.remove()
            }
            else {
                ele.remove()
                card.carouselNum -= 1
                if (ele.classList.contains("active")) {
                    card.carouselCur = (ele.subIdx + 1) % card.carouselNum
                    card.carouselImages.children[card.carouselCur].classList.add("active")
                }
                if (card.carouselNum == 1) {
                    card.querySelector(".carousel-controls").classList.add("hide")
                    card.carouselImages.classList.remove("multi")
                }
            }
        }
        else {
            removed = ALBUMS[CUR_ALBUM][ele.idx]
            ALBUMS[CUR_ALBUM][ele.idx] = null
            ele.closest(".card").remove()
        }
        console.log(`Removing ${ele.idx} -> ${ele.subIdx} from ${CUR_ALBUM} (triggered by ${ele.src})`)
        console.log("Removed: ", removed)
    }
    clearSelection()
}


function toggleEditMode() {
    if (!CUR_ALBUM) {
        alert("Edit mode can only be used in albums.")
        return
    }
    ACTIVE = !ACTIVE
    document.body.classList.toggle("editing")
    if (!ACTIVE) clearSelection()
}

document.addEventListener("click", select, { capture: true })
document.addEventListener("keyup", handleKeys, { passive: true })
