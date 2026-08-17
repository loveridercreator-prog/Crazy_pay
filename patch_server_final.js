const fs = require('fs');
let serverJS = fs.readFileSync('server.js', 'utf8');

// MODULE 1: Toggle API Endpoint
const apiToggleCode = `
    if (req.method === 'POST' && urlPath === '/api/toggle_master_switch') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const active = !!payload.active;
                
                console.log(\`[Master Switch] Performing atomic lock update in DB. State: \${active ? 'ON' : 'OFF'}\`);
                
                const updates = {
                    'system_config/orderCreationEnabled': active,
                    'system_config/withdrawal_engine_open': active,
                    'system_config/backend_controller_active': active
                };
                await firebaseRequest('', 'PATCH', updates);
                
                cachedSystemConfig = await firebaseRequest('system_config', 'GET') || {};
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, active }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (req.method === 'GET' && urlPath === '/api/p2p_orders') {
`;
serverJS = serverJS.replace(`    if (req.method === 'GET' && urlPath === '/api/p2p_orders') {`, apiToggleCode);

// MODULE 2 & 3: Dynamic chunking & Paisa discounting in getDynamicOrderAmount
const getDynamicOrderAmountStr = `function getDynamicOrderAmount(balance, lastAmount = 0) {
    // STRICT ORDER AMOUNT BINDING: Direct assignment based on exact requested amount / balance
    const amt = parseFloat(balance || 0);
    if (isNaN(amt) || amt <= 0) return 100;
    return amt;
}`;

const newGetDynamicOrderAmountStr = `function getDynamicOrderAmount(balance, lastAmount = 0) {
    const amt = parseFloat(balance || 0);
    if (isNaN(amt) || amt < 100) return 0;
    
    // Dynamic Flexible Chunking
    // If balance is small, just create 1 order
    if (amt <= 500) return amt;
    
    // Random chunking logic: split into random amounts between 100 and 2000
    let maxChunk = Math.min(amt, 2000);
    let randomChunk = Math.floor(Math.random() * ((maxChunk - 100)/100)) * 100 + 100;
    if (randomChunk > amt) return amt;
    if (amt - randomChunk < 100) return amt; // Don't leave dust
    return randomChunk;
}`;

serverJS = serverJS.replace(getDynamicOrderAmountStr, newGetDynamicOrderAmountStr);

// Change the loop in processUserWithdrawalBatch to not be bounded by activeUpis.length but by numToCreate and balance
const processLoopRegex = /const batchSize = Math\.min\(numToCreate, activeUpis\.length\);\s*for \(let i = 0; i < batchSize; i\+\+\) \{([\s\S]*?)roundedAvailable = Math\.floor\(currentAvailable \/ 100\) \* 100;\s*if \(roundedAvailable < 100\) break;\s*const bestUpi = activeUpis\[i\]; \/\/ Distribute concurrent orders across all active UPIs simultaneously/m;

const newProcessLoop = `let upiIndex = 0;
        for (let i = 0; i < numToCreate; i++) {
            roundedAvailable = Math.floor(currentAvailable / 100) * 100;
            if (roundedAvailable < 100) break;
            const bestUpi = activeUpis[upiIndex % activeUpis.length];
            upiIndex++;`;

serverJS = serverJS.replace(processLoopRegex, newProcessLoop);

// Module 3: Paisa discount generation in createOrder
const precisePayableStr = `        let generatedPrecise = 0;
        if (precisePayableAmount && precisePayableAmount > 0) {
            generatedPrecise = precisePayableAmount;
        } else {
            // UNIQUE PAISA DISCOUNT ENGINE
            // Random variation of .01 to .99 instead of strict .10 to 1.99
            const randomVariation = parseFloat((Math.random() * (0.99 - 0.01) + 0.01).toFixed(2));
            generatedPrecise = parseFloat((selectedAmount - randomVariation).toFixed(2));
        }`;

const precisePayableOldStr = /let generatedPrecise = 0;\s*if \(precisePayableAmount && precisePayableAmount > 0\) \{\s*generatedPrecise = precisePayableAmount;\s*\} else \{\s*\/\/\s*UNIQUE PAISA DISCOUNT ENGINE[\s\S]*?generatedPrecise = parseFloat\(\(selectedAmount - randomVariation\)\.toFixed\(2\)\);\s*\}/m;

if (precisePayableOldStr.test(serverJS)) {
    serverJS = serverJS.replace(precisePayableOldStr, precisePayableStr);
} else {
    // If not matching, it might be the original simple one
    const backupPreciseStr = /let generatedPrecise = 0;\s*if \(precisePayableAmount && precisePayableAmount > 0\) \{\s*generatedPrecise = precisePayableAmount;\s*\}/m;
    serverJS = serverJS.replace(backupPreciseStr, precisePayableStr);
}

fs.writeFileSync('server.js', serverJS);
console.log("server.js patched");
