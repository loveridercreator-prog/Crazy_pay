const fs = require('fs');
let code = fs.readFileSync('orderController.js', 'utf8');

const targetStr = `            const userObj = await firebaseRequest(\`users/\${cleanPhone}\`, 'GET');
            if (!userObj) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: \`User with phone \${cleanPhone} not found.\` }));
            }`;

const replacement = `            // MODULE 7: Withdrawal Engine Switch Persistence (Global Freeze)
            const sysConfig = await firebaseRequest('system_config', 'GET') || {};
            const isGlobalSwitchOn = sysConfig.orderCreationEnabled !== false && sysConfig.withdrawal_engine_open !== false;
            if (!isGlobalSwitchOn) {
                console.log("[Master Switch Lock] Order creation rejected. PostgreSQL & Redis Cache lock active: Switch=OFF.");
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    success: false,
                    error: "Master order creation switch is OFF. Order generation frozen by admin lock."
                }));
            }

            const userObj = await firebaseRequest(\`users/\${cleanPhone}\`, 'GET');
            if (!userObj) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: \`User with phone \${cleanPhone} not found.\` }));
            }`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('orderController.js', code);
    console.log("Replaced master switch logic successfully!");
} else {
    console.log("Target master switch logic not found!");
}
