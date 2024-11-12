import {getAlbums, randomInt} from "../common.js"

async function selectGlobalRandom() {
    let albums = await getAlbums()
    let albumNames = Object.keys(albums)
    albumNames.splice(albumNames.indexOf("Himari"), 1)
    let chosenAlbum = albumNames[randomInt(albumNames.length)]
    let albumImgs = albums[chosenAlbum]
    location.href = `${location.origin}/refs?gr=${randomInt(albumImgs.length)}&an=${chosenAlbum}`
}

selectGlobalRandom()