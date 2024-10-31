export async function getAlbums(){
    return (await import("./albums.json", {assert: {type: "json"}})).default
}

export function randomInt(max) {
    return Math.floor(Math. random() * max)
}