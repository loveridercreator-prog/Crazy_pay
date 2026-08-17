const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `            let sum = 0;
            if (baseP2pOrders && baseP2pOrders.length > 0) {
                baseP2pOrders.forEach(o => {
                    const isOurOrder = o.sellerPhone && o.sellerPhone.replace(/[^0-9]/g, '') === cleanPhone;
                    const status = (o.status || "").toUpperCase();
                    if (isOurOrder && (status === "PENDING" || status === "AVAILABLE" || status === "IN TRANSACTION")) {
                        const amt = o.executionAmount !== undefined ? parseFloat(o.executionAmount) : parseFloat(o.amount || 0);
                        if (amt <= currentBalance) {
                            sum += amt;
                        }
                    }
                });
            }
            
            // If sum is 0 but there is still an activeWithdrawalSession, fallback to that if within current balance
            if (sum === 0 && activeWithdrawalSession && activeWithdrawalSession.preciseAmount) {
                const sessionAmt = parseFloat(activeWithdrawalSession.preciseAmount);
                if (sessionAmt <= currentBalance) {
                    sum = sessionAmt;
                } else {
                    activeWithdrawalSession = null;
                }
            }`;

const replacement = `            let sum = 0;
            if (baseP2pOrders && baseP2pOrders.length > 0) {
                baseP2pOrders.forEach(o => {
                    const isOurOrder = o.sellerPhone && o.sellerPhone.replace(/[^0-9]/g, '') === cleanPhone;
                    const status = (o.status || "").toUpperCase();
                    if (isOurOrder && (status === "PENDING" || status === "AVAILABLE" || status === "IN TRANSACTION")) {
                        const amt = o.executionAmount !== undefined ? parseFloat(o.executionAmount) : parseFloat(o.amount || 0);
                        sum += amt;
                    }
                });
            }
            
            if (sum > currentBalance) {
                sum = currentBalance;
            }
            
            // If sum is 0 but there is still an activeWithdrawalSession, fallback to that if within current balance
            if (sum === 0 && activeWithdrawalSession && activeWithdrawalSession.preciseAmount) {
                const sessionAmt = parseFloat(activeWithdrawalSession.preciseAmount);
                if (sessionAmt <= currentBalance) {
                    sum = sessionAmt;
                } else {
                    sum = currentBalance;
                }
            }`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(html)) {
    html = html.replace(targetRegex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Replaced metric logic successfully!");
} else {
    console.log("Target metric logic not found!");
}
