import {getAlbums, randomInt} from "../common.js"

async function selectGlobalRandom() {
    let albums = await getAlbums()
    let albumNames = Object.keys(albums)
    delete albumNames["Himari"]
    let chosenAlbum = albumNames[randomInt(albumNames.length)]
    let albumImgs = albums[chosenAlbum]
    let chosenImg = albumImgs[randomInt(albumImgs.length)]
    location.href = `${location.origin}/refs?i=${chosenImg}&gr=1&an=${chosenAlbum}`
}

selectGlobalRandom()