const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');
const startIndex = lines.findIndex(l => l.includes('server.listen(port'));
if (startIndex !== -1) {
    // Keep everything up to server.listen + 3 lines (the closure)
    lines = lines.slice(0, startIndex + 3);
}
fs.writeFileSync('server.js', lines.join('\n'));
