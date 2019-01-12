const pug = require("pug")
const fs = require("fs")
const events = require("./database/events.json")

function compile() {
  const files = fs.readdirSync(".")
  files
    .filter(fn => fn.endsWith(".pug"))
    .forEach(pg => {
      const html = pug.renderFile(pg, {
        events: events.slice(-10),
        pretty: true
      })
      fs.writeFileSync(pg.replace(".pug", ".html"), html)
    })
}
compile()
module.exports = compile
