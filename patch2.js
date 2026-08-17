const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `                    .then(data => {
                        const endTime = performance.now();
                        const duration = (endTime - startTime).toFixed(2);
                        console.timeEnd("Sell-to-Buy Handshake");
                        
                        if (data.success) {
                            showNotificationBroadcast(\`✅ \${data.orders ? data.orders.length : 1} Order(s) generated successfully.\`);
                            completeSuccessfulWrite("API-Batch-Engine", duration);`;

const replacement = `                    .then(data => {
                        const endTime = performance.now();
                        const duration = (endTime - startTime).toFixed(2);
                        console.timeEnd("Sell-to-Buy Handshake");
                        
                        if (data.success) {
                            showNotificationBroadcast(\`✅ \${data.orders ? data.orders.length : 1} Order(s) generated successfully.\`);
                            if (data.orders && data.orders.length > 0) {
                                // Overwrite the frontend preciseAmount with the first generated order's precise amount for the UI
                                preciseAmount = data.orders[0].preciseAmount;
                            }
                            completeSuccessfulWrite("API-Batch-Engine", duration);`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(html)) {
    html = html.replace(targetRegex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Replaced successfully!");
} else {
    console.log("Target not found!");
}
