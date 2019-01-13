const moment = require("moment")
// display date nicely

function require(s) {
  return window[s]
}

const now = moment()

function niceDate(datestr) {
  const d = moment(datestr)
  // past event
  if (d.isBefore(now)) {
    return d.fromNow()
  } else {
    return d.toNow()
  }
}

for (let el of document.querySelectorAll(".date"))
  el.textContent = niceDate(new Date(el.textContent))
