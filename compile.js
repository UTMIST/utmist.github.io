const pug = require("pug");
const fs = require("fs");

function compile() {
  const files = fs.readdirSync(".");
  files.filter(fn => fn.endsWith(".pug")).forEach(pg => {
    const html = pug.renderFile(pg);
    fs.writeFileSync(pg.replace(".pug", ".html"), html);
  });
};
compile()
module.exports = compile