const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const anchor = "if (req.method === 'POST' && urlPath === '/api/v1/admin/toggle-withdrawal-engine') {";
const replacement = `if (req.method === 'POST' && (urlPath === '/api/toggle_master_switch' || urlPath === '/api/v1/admin/toggle-withdrawal-engine')) {`;

s = s.replace(anchor, replacement);
fs.writeFileSync('server.js', s);
