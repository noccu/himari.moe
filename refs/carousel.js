// Assumes bootstrap

function navigate(e) {
    if (!e.target.dataset.nav || e.currentTarget.carouselNum === undefined) return
    let card = e.currentTarget
    card.carouselImages.children[card.carouselCur].classList.remove("active")
    card.carouselCur += e.target.dataset.nav == "next" ? 1 : -1
    if (card.carouselCur < 0) card.carouselCur = card.carouselNum - 1
    else if (card.carouselCur >= card.carouselNum) card.carouselCur = 0
    card.carouselImages.children[card.carouselCur].classList.add("active")
}

export function enableCarouselControls(ele) {
    ele.addEventListener("click", navigate, {passive: true})
    ele.carouselImages = ele.querySelector(".card-images")
    ele.carouselNum = ele.carouselImages.children.length
    ele.carouselCur = 0
}