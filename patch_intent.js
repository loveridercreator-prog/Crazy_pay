const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `        function launchUpiTerminalPayment() {
            const targetUpiId = document.getElementById('terminal-upi-id').innerText;
            const amtVal = currentTerminalAmount;
            const provider = selectedTerminalAppVal || "MobiKwik";

            showNotificationBroadcast(\`📋 Launching \${provider} Intent & copying UPI: \${targetUpiId}...\`);
            
            if (typeof launchUpiAppIntent === 'function') {
                launchUpiAppIntent(provider, targetUpiId, "CRAZY PAY MERCHANT", amtVal, currentTerminalTradeId, (failMsg) => {
                    alert(failMsg);
                });
            } else {
                const appName = getAppNameForProvider ? getAppNameForProvider(provider) : provider;
                const uri = generateTargetedUpiUri ? generateTargetedUpiUri(targetUpiId, "CRAZY PAY MERCHANT", amtVal, currentTerminalTradeId, provider) : \`upi://pay?pa=\${encodeURIComponent(targetUpiId)}&am=\${amtVal}\`;

                window.location.href = uri;
            }
            
            logAdminTelemetry('UPI_COPIED', \`User launched UPI Intent for app \${provider}, VPA: \${targetUpiId}, amount ₹\${amtVal}\`);
        }`;

const replacement = `        function launchUpiTerminalPayment() {
            const targetUpiId = document.getElementById('terminal-upi-id').innerText.trim();
            const amtVal = parseFloat(currentTerminalAmount).toFixed(2);
            const provider = selectedTerminalAppVal || "MobiKwik";

            showNotificationBroadcast(\`📋 Launching \${provider} Intent...\`);

            navigator.clipboard.writeText(targetUpiId).catch(() => {});
            
            const sellerName = encodeURIComponent("CRAZY PAY MERCHANT");
            const intentUri = \`upi://pay?pa=\${targetUpiId}&pn=\${sellerName}&am=\${amtVal}&tr=\${currentTerminalTradeId}&cu=INR\`;
            
            try {
                window.location.href = intentUri;
                setTimeout(() => {
                    showNotificationBroadcast(\`🚀 Directing to \${provider}...\`);
                }, 500);
            } catch(e) {
                alert(\`Failed to launch \${provider}. Please pay manually using the copied details.\`);
            }
            
            logAdminTelemetry('UPI_COPIED', \`User launched UPI Intent for app \${provider}, VPA: \${targetUpiId}, amount ₹\${amtVal}\`);
        }`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(html)) {
    html = html.replace(targetRegex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Replaced intent successfully!");
} else {
    console.log("Target intent not found!");
}
