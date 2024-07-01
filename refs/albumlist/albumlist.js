const LIST = document.getElementById("list")
const T_ALBUM = document.getElementById("t-album")

async function parseAlbums() {
    albums = await fetch("../albums.json").then(x => x.json())
    for (let [name, images] of Object.entries(albums)) {
        if (!images) {
            console.debug(`Album ${name} is empty`)
            continue
        }
        var albEntry = document.importNode(T_ALBUM.content, true)
        albEntry.querySelector("a").href = `../?a=${name}`
        albEntry.querySelector(".album-name").textContent = name
        albEntry.querySelector(".album-num").textContent = images.length
        LIST.append(albEntry)
    }
}

parseAlbums()
