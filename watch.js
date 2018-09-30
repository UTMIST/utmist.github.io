const fs = require("fs");
const compile = require("./compile");

fs.watch("./", { recursive: true }, function(event, filename) {
  console.log(event, filename);
  if (
    event === "change" &&
    !filename.endsWith(".html") &&
    !filename.startsWith(".git")
  ) {
    compile();
    console.log("compiled");
  }
});
