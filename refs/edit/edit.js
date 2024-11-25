import { getAlbums } from "../common.js"
import { addImage as addImgNode, parseImageData } from "../refs.js"

class Modal extends HTMLDialogElement {
    constructor() {
        super()
        this.label = document.createElement("p")
        this.append(this.label)
    }
    setLabel(text) { this.label.textContent = text }
}
customElements.define("modal-menu", Modal, { extends: "dialog" })

const ALBUMS = await getAlbums()
const CUR_ALBUM = new URLSearchParams(location.search).get("a")
/** @type {Set<HTMLElement>} */
const SELECTION = new Set()
var ACTIVE = false
const MODAL_COPYMOVE = createCopyMoveModal()
const MODAL_TITLE_EDIT = createTitleEditModal()
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

/** @param {Modal} parent */
function createAlbumChoice(parent, onChoice) {
    const search = document.createElement("input")
    const searchList = document.createElement("datalist")
    const albNames = Object.keys(ALBUMS).sort()
    parent.append(search)
    parent.append(searchList)

    searchList.id = "album-names"
    search.setAttribute("list", searchList.id)
    for (let name of albNames) {
        let albEntry = document.createElement("option")
        albEntry.value = name
        searchList.append(albEntry)
    }
    if (onChoice) {
        search.addEventListener("keyup", e => {
            if (e.key == "Enter" && albNames.includes(search.value)) {
                onChoice(e, search.value)
            }
        })
    }
}

function createCopyMoveModal() {
    const modal = new Modal()
    modal.move = false
    createAlbumChoice(modal, (e, choice) => {
        const doClose = !e.shiftKey
        if (modal.move) move(choice, !doClose)
        else copy(choice, !doClose)
        if (doClose) modal.close()
    })
    return modal
}

function createTitleEditModal() {
    const modal = new Modal()
    modal.setLabel("Edit title & msg")
    const title = document.createElement("input")
    const msg = document.createElement("textarea")
    const clear = document.createElement("button")
    title.size = 50
    msg.rows = 5
    msg.style = "display: block; resize: none; width: 100%;"
    clear.textContent = "Clear"
    modal.append(title, msg, clear)

    modal.addEventListener("keyup", e => {
        if (!e.ctrlKey || e.key != "Enter") return
        editImgTitle(title.value, msg.value)
        modal.close()
    })
    clear.addEventListener("click", e => {
        title.value = msg.value = ""
        editImgTitle(title.value, msg.value)
        modal.close()
    })
    return modal
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
    if (!ACTIVE || e.shiftKey || e.ctrlKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
            showCopyMoveModal(false)
            break
        case "x":
            showCopyMoveModal(true)
            break
        case "m":
        case "t":
            showTitleEditModal()
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

function copy(destAlb, keepSelection) {
    for (let ele of SELECTION) {
        let imgData = ALBUMS[CUR_ALBUM][ele.idx]
        ALBUMS[destAlb].push(imgData)
        console.log(`Copied ${imgData.src || imgData} to ${destAlb}`)
    }
    if (!keepSelection) clearSelection()
}

function move(destAlb, keepSelection) {
    copy(destAlb, true)
    if (!keepSelection) remSelection()
}

function showCopyMoveModal(move = false) {
    MODAL_COPYMOVE.move = move
    if (move) MODAL_COPYMOVE.setLabel("Move to album")
    else MODAL_COPYMOVE.setLabel("Copy to album")
    MODAL_COPYMOVE.showModal()
}

function showTitleEditModal() {
    if (SELECTION.size > 1) {
        alert("Multiple images selected. Will only edit titles one at a time.")
        return
    }
    var currentData
    for (let ele of SELECTION) {
        currentData = Object(ALBUMS[CUR_ALBUM][ele.idx])
    }
    MODAL_TITLE_EDIT.querySelector("input").value = currentData.title || ""
    MODAL_TITLE_EDIT.querySelector("textarea").value = currentData.msg || ""
    MODAL_TITLE_EDIT.showModal()
}

function editImgTitle(title, msg) {
    var data
    for (let ele of SELECTION) {
        data = ALBUMS[CUR_ALBUM][ele.idx]
        const isObj = Object.hasOwn(data, "src")
        const clear = (title == "" && msg == "")

        if (clear) {
            data = data.src
            if (isObj) ALBUMS[CUR_ALBUM][ele.idx] = data
        }
        else {
            if (!isObj) {
                data = { src: data }
                ALBUMS[CUR_ALBUM][ele.idx] = data
            }
            if (title == "") delete data.title
            else data.title = title
            if (msg == "") delete data.msg
            else data.msg = msg
        }
        ele.closest(".card").replaceWith(addImgNode(parseImageData(data), ele.idx))
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
        return !isNaN(k) && v.length == 1 ? v[0] : v
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

document.body.append(MODAL_COPYMOVE, MODAL_TITLE_EDIT)
document.addEventListener("click", select, { capture: true })
document.addEventListener("keyup", handleKeys, { passive: true })
