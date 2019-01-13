const fs = require("fs")
const compile = require("./compile")

fs.watch("./", { recursive: true }, function(event, filename) {
  console.log(event, filename)
  if (
    event === "change" &&
    !filename.endsWith(".html") &&
    !filename.startsWith(".git")
  ) {
    try {
      compile()
      console.log("compiled")
    } catch (e) {
      console.error(e)
    }
  }
})
