const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');

const regexStartVerification = /function startTerminalVerification\(\) \{[\s\S]*?function confirmTerminalSettle/;
const newVerification = `function startTerminalVerification() {
            const utrVal = document.getElementById('terminal-utr-input').value.trim();
            const errorEl = document.getElementById('terminal-error-message');
            
            errorEl.classList.add('hidden');
            errorEl.innerText = "";

            const hasScreenshot = !document.getElementById('terminal-screenshot-preview').classList.contains('hidden');
            
            if (!hasScreenshot || utrVal.length !== 12) {
                errorEl.innerText = "Screenshot image and valid 12-digit UTR are both mandatory for verification.";
                errorEl.classList.remove('hidden');
                return;
            }
            
            // Bypass simulateSmsDetection and make API call directly
            const progressContainer = document.getElementById('terminal-progress-container');
            const progressText = document.getElementById('terminal-progress-text');
            const progressBar = document.getElementById('terminal-progress-bar');
            const actionBox = document.getElementById('utr-confirmation-box');
            
            actionBox.classList.add('hidden');
            progressContainer.classList.remove('hidden');
            
            if (progressBar) progressBar.style.width = "50%";
            progressText.innerText = "🔍 Executing Strict Server-Side Match (Amount, UTR & Assigned UPI)...";

            setTimeout(async () => {
                const targetUpi = document.getElementById('terminal-upi-id') ? document.getElementById('terminal-upi-id').innerText.trim() : "";
                try {
                    const tripleResponse = await fetch('/api/verify_utr_triple_match', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            utr: utrVal,
                            payableAmount: currentTerminalAmount,
                            assignedUpi: targetUpi,
                            orderId: currentTerminalTradeId,
                            buyerPhone: currentUser ? currentUser.phone : "guest"
                        })
                    });
                    const tripleRes = await tripleResponse.json();
                    
                    progressContainer.classList.add('hidden');
                    actionBox.classList.remove('hidden');
                    
                    if (tripleRes.success) {
                        if (countdownTimerId) {
                            clearInterval(countdownTimerId);
                            countdownTimerId = null;
                        }
                        confirmTerminalSettle(utrVal);
                    } else {
                        errorEl.innerText = tripleRes.message || tripleRes.error || "⚠️ Triple-match verification failed.";
                        errorEl.classList.remove('hidden');
                        if (typeof showNotificationBroadcast === 'function') {
                            showNotificationBroadcast(tripleRes.message || tripleRes.error || "⚠️ Mismatch detected.");
                        }
                    }
                } catch (err) {
                    console.error("Triple Match API error:", err);
                    progressContainer.classList.add('hidden');
                    actionBox.classList.remove('hidden');
                    errorEl.innerText = "Server Error: Could not verify UTR.";
                    errorEl.classList.remove('hidden');
                }
            }, 1000);
        }

        function confirmTerminalSettle`;

s = s.replace(regexStartVerification, newVerification);
fs.writeFileSync('index.html', s);
