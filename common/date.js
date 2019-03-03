const moment = require("moment")
// display date nicely

function require(s) {
  return window[s]
}

const now = moment()

function niceDate(datestr) {
  const d = moment(datestr)
  return d.fromNow()
}

for (let el of Array.from(document.querySelectorAll(".date"))) {
  if (moment(el.textContent).isValid()) {
    el.textContent = niceDate(new Date(el.textContent))
  } else {
    el.textContent = "TBD"
  }
}
