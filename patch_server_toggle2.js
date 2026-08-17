const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const regex = /const engineStatus = parsed\.engineStatus;/;
const replace = `const engineStatus = parsed.engineStatus !== undefined ? parsed.engineStatus : parsed.active;`;

s = s.replace(regex, replace);
fs.writeFileSync('server.js', s);
