if (location.hash) {
    const posting = document.getElementById(location.hash.slice(1))
    if (posting) {
        (posting.firstElementChild as HTMLDivElement).click();
        (posting.previousElementSibling || posting.parentElement).scrollIntoView()
    }
}