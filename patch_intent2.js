const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = `        function launchUpiTerminalPayment() {
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

const replacement = `        function launchUpiTerminalPayment() {
            const targetUpiId = document.getElementById('terminal-upi-id').innerText.trim();
            const amtVal = parseFloat(currentTerminalAmount).toFixed(2);
            const provider = selectedTerminalAppVal || "MobiKwik";

            showNotificationBroadcast(\`📋 Launching \${provider} Intent...\`);

            // Best effort copy UPI ID
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(targetUpiId).catch(() => {});
            }
            
            const sellerName = encodeURIComponent("CRAZY PAY MERCHANT");
            let intentUri = \`upi://pay?pa=\${targetUpiId}&pn=\${sellerName}&am=\${amtVal}&tr=\${currentTerminalTradeId}&tn=\${currentTerminalTradeId}&cu=INR\`;
            
            if (provider.toLowerCase().includes("mobikwik")) {
                intentUri = \`intent://pay?pa=\${targetUpiId}&pn=\${sellerName}&am=\${amtVal}&tr=\${currentTerminalTradeId}&tn=\${currentTerminalTradeId}&cu=INR#Intent;scheme=upi;package=com.mobikwik_new;end\`;
            } else if (provider.toLowerCase().includes("paytm")) {
                intentUri = \`intent://pay?pa=\${targetUpiId}&pn=\${sellerName}&am=\${amtVal}&tr=\${currentTerminalTradeId}&tn=\${currentTerminalTradeId}&cu=INR#Intent;scheme=upi;package=net.one97.paytm;end\`;
            } else if (provider.toLowerCase().includes("phonepe")) {
                intentUri = \`intent://pay?pa=\${targetUpiId}&pn=\${sellerName}&am=\${amtVal}&tr=\${currentTerminalTradeId}&tn=\${currentTerminalTradeId}&cu=INR#Intent;scheme=upi;package=com.phonepe.app;end\`;
            } else if (provider.toLowerCase().includes("gpay") || provider.toLowerCase().includes("google")) {
                intentUri = \`intent://pay?pa=\${targetUpiId}&pn=\${sellerName}&am=\${amtVal}&tr=\${currentTerminalTradeId}&tn=\${currentTerminalTradeId}&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end\`;
            }

            try {
                // Direct PIN Entry Redirect targeting selected UPI Gateway
                window.location.href = intentUri;
                setTimeout(() => {
                    showNotificationBroadcast(\`🚀 Directing to \${provider}...\`);
                }, 500);
            } catch(e) {
                alert(\`Failed to launch \${provider}. Please pay manually using the copied details.\`);
            }
            
            if (typeof logAdminTelemetry === 'function') {
                logAdminTelemetry('UPI_COPIED', \`User launched UPI Intent for app \${provider}, VPA: \${targetUpiId}, amount ₹\${amtVal}\`);
            }
        }`;

const targetRegex = new RegExp(targetStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
if (targetRegex.test(html)) {
    html = html.replace(targetRegex, replacement);
    fs.writeFileSync('index.html', html);
    console.log("Replaced intent successfully!");
} else {
    console.log("Target intent not found!");
}
