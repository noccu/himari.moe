import { getAlbums } from "../common.js"
import { addImage as addImgNode } from "../refs.js"

const ALBUMS = await getAlbums()
const CUR_ALBUM = new URLSearchParams(location.search).get("a")
/** @type {Set<HTMLElement>} */
const SELECTION = new Set()
var ACTIVE = false
const DIA_ALBUM_CHOICE = createDialog()

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

function createDialog() {
    const dia = document.createElement("dialog")
    const action = document.createElement("p")
    const search = document.createElement("input")
    const searchList = document.createElement("datalist")
    const albNames = Object.keys(ALBUMS).sort()
    dia.append(action)
    dia.append(search)
    dia.append(searchList)

    dia.actionLabel = action
    searchList.id = "album-names"
    search.setAttribute("list", searchList.id)
    for (let name of albNames) {
        let albEntry = document.createElement("option")
        albEntry.value = name
        searchList.append(albEntry)
    }
    search.addEventListener("keyup", e => {
        if (e.key == "Enter" && albNames.includes(search.value)) {
            dia.dispatchEvent(new CustomEvent("choice", {
                bubbles: false,
                detail: search.value
            }))
            if (!e.shiftKey) {
                // default close event fires on ESC, contrary to spec!
                dia.dispatchEvent(new Event("submitClose"))
                dia.close()
            }
        }
    })
    document.body.append(dia)
    return dia
}

/** @param {PointerEvent} e */
function select(e) {
    if (!ACTIVE) return
    if (e.target.nodeName == "IMG" && e.target.parentElement.classList.contains("card-images")) {
        var targets
        if (e.shiftKey && e.target.subIdx !== undefined) {
            targets = e.target.parentElement.children
        }
        else targets = [e.target]

        const isNowSelected = !e.target.classList.contains("editing")
        for (let t of targets) {
            if (isNowSelected) {
                SELECTION.add(t)
                t.classList.add("editing")
            }
            else {
                SELECTION.delete(t)
                t.classList.remove("editing")
            }
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
    if (!ACTIVE || e.shiftKey || e.ctrlKey || e.target instanceof HTMLInputElement) {
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
        case "v":
            copy()
            break
        case "x":
            move()
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

function copy(msg = "Copy to album", clearSel = true) {
    function _copy(e) {
        for (let ele of SELECTION) {
            let imgData = ALBUMS[CUR_ALBUM][ele.idx]
            ALBUMS[e.detail].push(imgData)
            console.log(`Copied ${imgData.src || imgData} to ${e.detail}`)
        }
    }
    const listenerCtrl = new AbortController()
    DIA_ALBUM_CHOICE.actionLabel.textContent = msg
    DIA_ALBUM_CHOICE.addEventListener("choice", _copy, { signal: listenerCtrl.signal })
    DIA_ALBUM_CHOICE.addEventListener("submitClose", () => {
        if (clearSel) clearSelection()
    }, { once: true, signal: listenerCtrl.signal })
    DIA_ALBUM_CHOICE.addEventListener("close", () => listenerCtrl.abort(), { once: true })
    DIA_ALBUM_CHOICE.showModal()
}

function move() {
    //? If move listener is first, we don't need to clearSelection
    const listenerCtrl = new AbortController()
    DIA_ALBUM_CHOICE.addEventListener("submitClose", remSelection, {
        once: true,
        signal: listenerCtrl.signal
    })
    DIA_ALBUM_CHOICE.addEventListener("close", () => listenerCtrl.abort(), { once: true })
    copy("Move to album", false)
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
