const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `            if (amt > userAvailableBal) {
                alert(\`⚠️ Order Creation Rejected: Insufficient Account Balance!\\n\\nYour available wallet balance is ₹\${userAvailableBal.toFixed(2)}, but you requested an order of ₹\${amt.toFixed(2)}.\`);
                return;
            }`;

const replacement = `            const quantityEl = document.getElementById('withdraw-input-quantity');
            const batchCount = parseInt(quantityEl ? quantityEl.value : 1) || 1;
            const totalRequestedAmt = amt * batchCount;

            if (totalRequestedAmt > userAvailableBal) {
                alert(\`⚠️ Order Creation Rejected: Insufficient Account Balance!\\n\\nYour available wallet balance is ₹\${userAvailableBal.toFixed(2)}, but you requested \${batchCount} order(s) totaling ₹\${totalRequestedAmt.toFixed(2)}.\`);
                return;
            }`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(html)) {
    html = html.replace(targetRegex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Replaced patch3 successfully!");
} else {
    console.log("Target patch3 not found!");
}
