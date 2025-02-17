export const PARAMS = new URLSearchParams(document.location.search)

export async function getAlbums(){
    return fetch(PARAMS.has("s") ? "/refs/albums_special.json" : "/refs/albums.json").then(x => x.json())
    // return (await import("./albums.json", {assert: {type: "json"}})).default
}

export function randomInt(max) {
    return Math.floor(Math. random() * max)
}

/**
 * @template T
 * @param {Iterable<T>} col
 * @returns {Generator<[number, T]>}
 * */
export function* enumerate(col) {
    let i = 0
    for (let e of col) {
        yield [i, e]
        i++
    }
}