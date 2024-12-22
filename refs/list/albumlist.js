import { getAlbums, PARAMS } from "../common.js"

const LIST = document.getElementById("list")
const T_ALBUM = document.getElementById("t-album")

async function parseAlbums() {
    const albums = await getAlbums()
    for (let [name, images] of Object.entries(albums)) {
        if (!images) {
            console.debug(`Album ${name} is empty`)
            continue
        }
        var albEntry = document.importNode(T_ALBUM.content, true)
        albEntry.querySelector("a").href = `../?a=${name}${PARAMS.has("s") ? "&s=1" : ""}`
        albEntry.querySelector(".album-name").textContent = name
        albEntry.querySelector(".album-num").textContent = images.length
        LIST.append(albEntry)
    }
}

parseAlbums()
