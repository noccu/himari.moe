import { getAlbums } from "../common.js"
import { addImage as addImgNode } from "../refs.js"

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
    if (e.shiftKey && e.key == "E") {
        toggleEditMode()
        return
    }
    if (!ACTIVE || e.shiftKey || e.ctrlKey) {
        return
    }
    switch (e.key) {
        case "d":
            remSelection()
            break
        case "a":
            addImages()
            break
        case "c":
            clearSelection()
            break
        case "s":
            save()
            break
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

function addNewImage(collection, isMulti) {
    const newImgUrl = prompt(isMulti ? "Add image to carousel" : "Add image to album")
    if (!newImgUrl) return
    const parsedImgUrl = parseUrl(newImgUrl)
    const newIdx = collection.length
    collection.push(parsedImgUrl)
    console.log(`Adding ${newIdx}: ${newImgUrl} to ${CUR_ALBUM} as ${parsedImgUrl}`)
    console.log(ALBUMS[CUR_ALBUM])
    if (isMulti) {
        for (let ele of SELECTION) {
            const card = ele.closest(".card")
            const newImg = ele.cloneNode(true)
            newImg.src = newImgUrl
            newImg.idx = ele.idx
            newImg.subIdx = card.carouselImages.children.length
            newImg.classList.remove("active")
            card.carouselImages.append(newImg)
            card.carouselNum += 1
        }
    }
    else {
        addImgNode({ src: newImgUrl }, newIdx).scrollIntoView()
    }
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
        addNewImage(imgData, true)
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

function _jsonProc(k, v) {
    if (Array.isArray(v)) {
        v = v.filter(x => x) // Remove null/undef
        return v.length == 1 ? v[0] : v
    }
    else return v
}

function save() {
    const data = JSON.stringify(ALBUMS, _jsonProc, 4)
    fetch(`/refs/albums.json`, {
        method: "PUT",
        body: data
    })
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
