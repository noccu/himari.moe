let imgs = [
    "https://i.imgur.com/iGOhH88.jpg",
    "https://i.imgur.com/4YSkzzk.jpg",
    "https://i.imgur.com/idYBAFY.jpg",
    "https://i.imgur.com/EfLmn9T.jpg",
    "https://i.imgur.com/nIsjtiq.jpg",
    "https://i.imgur.com/KQG25gr.jpg",
    "https://i.imgur.com/Pdj25z3.jpg",
    "https://i.imgur.com/I2X6gN6.jpg",
    "https://i.imgur.com/dU2Xfr6.jpg",
    "https://i.imgur.com/QL34oUo.jpg",
    "https://i.imgur.com/5a4AQW2.jpg",
    "https://i.imgur.com/VynA87y.jpg",
    "https://i.imgur.com/BIg2yuR.jpg",
    "https://i.imgur.com/I7ZQBYp.jpg",
    "https://i.imgur.com/TqjXMBr.jpg",
    "https://i.imgur.com/92668Re.jpg",
    "https://i.imgur.com/lLhPRei.jpg",
    "https://i.imgur.com/TMF5hrH.jpg",
    "https://i.imgur.com/zJiBsWm.png",
    "https://i.imgur.com/MWNv0Rf.jpg",
    "https://i.imgur.com/8Pq2vqC.jpg",
    "https://i.imgur.com/lBCPJme.jpg"
]
let g = document.getElementById("gallery")
let t = document.getElementById("t-img-card")
for (imgSrc of imgs) {
    n = document.importNode(t.content, true)
    // n.querySelector("a").href = imgSrc
    n.querySelector("img").src = imgSrc
    g.appendChild(n)
}

enableLightbox(g)