import { getAlbums, PARAMS } from "../common.js"
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
const HOSTS = {
    "i.imgur.com": ["", /([^\/]+)$/],
    "pbs.twimg.com": ["tw:", /media\/([^?]+)\?/],
    "cdn.donmai.us": ["db:", /([^\./\-_]+).{4,5}$/],
    "cdn.bsky.app": ["bs:", /did:plc:([^@]+)@/]
}


/** @param {string} href */
function parseUrl(href) {
    /** @type {[string, RegExp]} */
    const data = HOSTS[(new URL(href)).host]
    if (!data) return href
    const [prefix, re] = data
    return `${prefix}${href.match(re)[1]}`
}

function isCaptioned(o) {
    return Object.hasOwn(o, "src")
}

function replaceCard(ele, imgData) {
    const newNode = addImgNode(parseImageData(imgData), ele.idx)
    ele.closest(".card").replaceWith(newNode)
    return newNode
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
    if (["IMG", "VIDEO"].includes(e.target.nodeName) && e.target.parentElement.classList.contains("card-images")) {
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
        e.preventDefault()
    }
}

/** @param {KeyboardEvent} e */
function handleKeys(e) {
    if (e.ctrlKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
    }
    if (e.shiftKey && e.key == "E") {
        toggleEditMode()
        return
    }
    if (!ACTIVE) {
        return
    }
    switch (e.key) {
        case "d":
            remSelection()
            break
        case "a":
            addNewImage()
            break
        case "c":
            clearSelection()
            break
        case "s":
            save()
            break
        case "S":
            archive()
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
        case "D":
            toggleDevMode()
        case "C":
            createCollection()
        break
    }
}

function addNewImage() {
    if (SELECTION.size > 1) {
        alert("Multiple images selected. Clear selection to add to album or select 1 image/carousel.")
        return
    }
    const isMulti = SELECTION.size == 1
    const newImgUrl = prompt(isMulti ? "Add image to carousel" : "Add image to album")
    if (!newImgUrl) return
    const parsedImgUrl = parseUrl(newImgUrl)
    var imgList

    if (isMulti) {
        for (let ele of SELECTION) {
            let imgData = ALBUMS[CUR_ALBUM][ele.idx]
            imgList = isCaptioned(imgData) ? imgData.src : imgData
            if (!Array.isArray(imgList)) {
                // Create carousel
                imgList = [imgList]
                if (isCaptioned(imgData)) imgData.src = imgList
                else ALBUMS[CUR_ALBUM][ele.idx] = imgData = imgList
            }
            imgList.push(parsedImgUrl)
            ele = replaceCard(ele, imgData)
        }
        clearSelection()
    }
    else {
        imgList = ALBUMS[CUR_ALBUM]
        imgList.push(parsedImgUrl)
        addImgNode(parseImageData(parsedImgUrl), imgList.length - 1).scrollIntoView()
    }
    console.log(`Adding ${imgList.length - 1}: ${newImgUrl} to ${CUR_ALBUM} as ${parsedImgUrl}`)
    console.debug(ALBUMS[CUR_ALBUM])
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
        if (!isCaptioned(data)) {
            data = { src: data, title, msg }
            ALBUMS[CUR_ALBUM][ele.idx] = data
            replaceCard(ele, data)
        }
        else if (title == "" && msg == "") {
            data = data.src
            ALBUMS[CUR_ALBUM][ele.idx] = data
            replaceCard(ele, data)
        }
        else {
            if (title == "") delete data.title
            else data.title = title
            if (msg == "") delete data.msg
            else data.msg = msg
            const card = ele.closest(".card")
            card.querySelector(".card-title").textContent = title
            card.querySelector(".card-text").textContent = msg
        }
    }
    clearSelection()
}

function clearSelection() {
    SELECTION.clear()
    for (let card of document.querySelectorAll(".card-img-top.editing")) {
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

async function createCollection() {
    const curCbData = await navigator.clipboard.readText()
    var resultUrl, search
    if (curCbData && curCbData.startsWith("https://himari.moe/refs?col=")) {
        resultUrl = new URL(curCbData)
        search = resultUrl.searchParams
    }
    else {
        resultUrl = new URL("https://himari.moe/refs")
        search = new URLSearchParams()
    }
    const colString = Array.from(SELECTION).map(e => e.idx).join(",")
    search.append("col", `${CUR_ALBUM}:${colString}`)
    resultUrl.search = decodeURIComponent(search.toString())
    navigator.clipboard.writeText(resultUrl.toString())
}

function _jsonProc(k, v) {
    if (Array.isArray(v)) {
        v = v.filter(x => x) // Remove null/undef
        return !isNaN(k) && v.length == 1 ? v[0] : v
    }
    else return v
}

function save() {
    const data = JSON.stringify(ALBUMS, _jsonProc, 2)
    fetch(`/refs/albums${PARAMS.has("s") ? "_special" : ""}.json`, {
        method: "PUT",
        body: data
    }).then(d => d.text())
}

async function archive() {
    const data = []
    const isSpecial = PARAMS.has("s")
    isSpecial ? PARAMS.delete("s") : PARAMS.set("s", "1")
    var mergedAlbums =  await getAlbums()
    isSpecial ? PARAMS.set("s", "1") : PARAMS.delete("s")
    Object.assign(mergedAlbums, ALBUMS)

    for (let [albName, imageList] of Object.entries(mergedAlbums)) {
        for (let imgData of imageList) {
            if (!imgData) continue // Removals this session
            let parsedData = parseImageData(imgData)
            if (parsedData.isCarousel){
                for (let href of parsedData.src) {
                    data.push({albName, src: href})
                }
            }
            else data.push({albName, src: parsedData.src})
        }
    }
    fetch("/archive/", {
        method: "POST",
        body: JSON.stringify(data)
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

function toggleDevMode() {
    fetch("/devmode", {method: "POST"})
}

document.body.append(MODAL_COPYMOVE, MODAL_TITLE_EDIT)
document.addEventListener("click", select, { capture: true })
document.addEventListener("keyup", handleKeys, { passive: true })
if (PARAMS.has("a")) toggleEditMode()
