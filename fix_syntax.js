const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const regex = /return \{ success: true, count: createdOrders\.length, activeWithdrawal: createdOrders\[0\] \};\n\}\n    return null;\n\}/;
s = s.replace(regex, `return { success: true, count: createdOrders.length, activeWithdrawal: createdOrders[0] };\n}`);
fs.writeFileSync('server.js', s);
