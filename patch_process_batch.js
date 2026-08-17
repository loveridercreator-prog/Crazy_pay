const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const start = s.indexOf('async function processUserWithdrawalBatch(cleanPhone, user, p2pOrdersList) {');
if (start !== -1) {
    let braceCount = 0;
    let end = -1;
    let inFunction = false;
    for (let i = start; i < s.length; i++) {
        if (s[i] === '{') {
            braceCount++;
            inFunction = true;
        } else if (s[i] === '}') {
            braceCount--;
        }
        if (inFunction && braceCount === 0) {
            end = i;
            break;
        }
    }
    if (end !== -1) {
        const replacement = `async function processUserWithdrawalBatch(cleanPhone, user, p2pOrdersList) {
    const systemConfig = await firebaseRequest('system_config', 'GET') || {};
    const isEngineOpen = systemConfig.withdrawal_engine_open !== false && systemConfig.withdrawal_engine_open !== "false";
    if (!isEngineOpen) {
        console.log(\`[Auto-Engine Server] Blocked batch generation for \${cleanPhone}. Withdrawal Engine is OFF.\`);
        return null;
    }

    const balance = parseFloat(user.walletBalance !== undefined ? user.walletBalance : (user.balance || 0));
    
    // MODULE 1: Dynamic flexible chunking & Balance capping
    // No hardcoded 10-order splits. 1 order for exact balance up to available.
    if (balance < 50) {
        return { success: false, reason: "Insufficient balance (Min 50)" };
    }
    
    // Sum of active orders check
    const activeWithdrawalSnap = await firebaseRequest(\`users/\${cleanPhone}/active_withdrawal\`, 'GET') || {};
    let totalActiveAmount = 0;
    for (const k in activeWithdrawalSnap) {
        totalActiveAmount += (activeWithdrawalSnap[k].display_amount || activeWithdrawalSnap[k].amount || 0);
    }
    if (totalActiveAmount + balance > balance && Object.keys(activeWithdrawalSnap).length > 0) {
        // Just meaning if we already have active orders taking up the balance, don't create more exceeding it.
        // For simplicity, we just use the remaining balance
        const remaining = balance - totalActiveAmount;
        if (remaining < 50) return { success: false, reason: "Insufficient remaining balance" };
        let createdOrders = [];
        const orderResult = await createOrder(cleanPhone, remaining, user.upiId || 'crazy@upi', user);
        if (orderResult && orderResult.activeWithdrawal) createdOrders.push(orderResult.activeWithdrawal);
        return { success: true, count: createdOrders.length, activeWithdrawal: createdOrders[0] };
    } else {
        let createdOrders = [];
        const orderResult = await createOrder(cleanPhone, balance, user.upiId || 'crazy@upi', user);
        if (orderResult && orderResult.activeWithdrawal) createdOrders.push(orderResult.activeWithdrawal);
        return { success: true, count: createdOrders.length, activeWithdrawal: createdOrders[0] };
    }
}`;
        s = s.substring(0, start) + replacement + s.substring(end + 1);
        fs.writeFileSync('server.js', s);
        console.log("Replaced processUserWithdrawalBatch correctly.");
    }
}
