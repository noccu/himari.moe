export async function getAlbums(){
    return fetch(`/refs/albums.json`).then(x => x.json())
    // return (await import("./albums.json", {assert: {type: "json"}})).default
}

export function randomInt(max) {
    return Math.floor(Math. random() * max)
}