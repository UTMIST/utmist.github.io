const pug = require('pug');

// Compile the source code
const compiledFunction = pug.compileFile('home.pug');

console.log(compiledFunction());
