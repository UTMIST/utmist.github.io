const pug = require("pug")
const fs = require("fs")

function compile() {
  const events = JSON.parse(fs.readFileSync("./database/events.json"))
  const execs = JSON.parse(fs.readFileSync("./database/execs.json"))
  const files = fs.readdirSync(".")
  files
    .filter(fn => fn.endsWith(".pug"))
    .forEach(pg => {
      const html = pug.renderFile(pg, {
        events: events.slice(-10),
        execs,
        pretty: true
      })
      fs.writeFileSync(pg.replace(".pug", ".html"), html)
    })
}

compile()
module.exports = compile
