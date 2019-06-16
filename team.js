if (location.hash) {
    const posting = document.getElementById(location.hash.slice(1));
    if (posting) {
        posting.firstElementChild.click();
        (posting.previousElementSibling || posting.parentElement).scrollIntoView();
    }
}
