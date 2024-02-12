import albums from "./albums.json" assert { type: 'json' };

function parse() {
    if (!document.location.hash) {
        document.getElementById("msg").textContent = "Incorrect album syntax"
        return
    }
    let albumName = document.location.hash.slice(1)
    let imgs = albums[albumName]
    document.getElementById("album").textContent = albumName
    if (!imgs) {
        document.getElementById("msg").textContent = "Album doesn't exist"
        return
    }
    document.location.assign("../refs/img#" + imgs.join(","))
}

parse()
