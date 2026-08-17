const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace verifyUsdtClicked
const verifyRegex = /function verifyUsdtClicked\(\) \{[\s\S]*?\}, 1500\);\n        \}/;
const newVerify = `function verifyUsdtClicked() {
            const spinner = document.getElementById('usdt-spinner-overlay');
            const title = document.getElementById('usdt-spinner-title');
            const subtitle = document.getElementById('usdt-spinner-subtitle');
            
            title.innerText = "Querying Blockchain RPC Node";
            subtitle.innerText = "Scanning ledger blocks...";
            spinner.classList.remove('hidden');

            fetch(\`/api/usdt/check_status?orderId=\${usdtActiveOrderId}\`)
                .then(r => r.json())
                .then(data => {
                    spinner.classList.add('hidden');
                    if (data.success && data.status === 'SUCCESS') {
                        // success handled by polling normally, but just in case
                        showNotificationBroadcast("✅ Blockchain RPC confirmed transaction!");
                    } else {
                        // Show fallback TxID screen
                        showNotificationBroadcast("🛰️ Auto-scan missed ledger credit. Initializing Fallback cross-check...");
                        hideAllUsdtSubscreens();
                        document.getElementById('usdt-txid-view').classList.remove('hidden');
                        document.getElementById('usdt-txid-input').value = ""; // Reset
                    }
                }).catch(() => {
                    spinner.classList.add('hidden');
                });
        }`;
if (verifyRegex.test(html)) {
    html = html.replace(verifyRegex, newVerify);
} else {
    console.log("verifyUsdtClicked not found");
}

// Replace confirmManualTxidClicked
const manualRegex = /function confirmManualTxidClicked\(\) \{[\s\S]*?\}, 1500\);\n        \}/;
const newManual = `function confirmManualTxidClicked() {
            const input = document.getElementById('usdt-txid-input');
            if (!input) return;
            const txid = input.value.trim();

            if (!txid || txid.length < 10) {
                showNotificationBroadcast("Invalid TxID");
                return;
            }

            const spinner = document.getElementById('usdt-spinner-overlay');
            const title = document.getElementById('usdt-spinner-title');
            const subtitle = document.getElementById('usdt-spinner-subtitle');
            
            title.innerText = "Cross-checking TxID Hash";
            subtitle.innerText = "Verifying transaction confirmation with RPC node...";
            spinner.classList.remove('hidden');

            fetch('/api/usdt/simulate_deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: usdtActiveOrderId, txHash: txid })
            }).then(r => r.json())
              .then(data => {
                  spinner.classList.add('hidden');
                  if (data.success && data.status === 'SUCCESS') {
                        if (usdtTimerId) {
                            clearInterval(usdtTimerId);
                            usdtTimerId = null;
                        }
                        const receivedUsdt = data.order.received_amount || usdtActiveAmount;
                        const rate = typeof usdtRate !== 'undefined' ? usdtRate : 117;
                        const inrCredited = receivedUsdt * rate;

                        if (currentUser) {
                            currentUser.balance = (currentUser.balance || 0) + inrCredited;
                            currentUser.usdtBalance = (currentUser.usdtBalance || 0) + receivedUsdt;
                            if (typeof database !== 'undefined' && database) {
                                const cleanPhone = currentUser.phone ? currentUser.phone.replace(/[^0-9]/g, '') : "guest";
                                database.ref('users/' + cleanPhone + '/balance').set(currentUser.balance);
                                database.ref('users/' + cleanPhone + '/usdtBalance').set(currentUser.usdtBalance);
                            }
                            if (typeof updateBalanceUi === 'function') updateBalanceUi();
                        }
                        
                        if (typeof addNewTxRecord === 'function') {
                            addNewTxRecord('USDT Manual Verification', inrCredited, 'Credited', \`TxHash: \${data.txHash ? data.txHash.substring(0, 12) : 'Web3_Sweep'}...\`);
                        }

                        hideAllUsdtSubscreens();
                        const successMsgEl = document.getElementById('usdt-success-msg');
                        if (successMsgEl) {
                            successMsgEl.innerHTML = \`Your deposit of <strong>₮\${receivedUsdt.toFixed(2)} USDT</strong> (= <strong>₹\${inrCredited.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong>) on <strong>\${usdtActiveNetwork}</strong> was verified.<br><br>⚡ Funds automatically swept to Master Receiver Wallet.\`;
                        }
                        const txidEl = document.getElementById('usdt-success-txid');
                        if (txidEl) txidEl.innerText = data.txHash || txid;
                        document.getElementById('usdt-success-view').classList.remove('hidden');
                        
                        showNotificationBroadcast(\`Credit Success! ₮\${receivedUsdt} USDT credited as ₹\${inrCredited.toFixed(2)}.\`);
                  } else {
                      hideAllUsdtSubscreens();
                      const failureMsg = document.getElementById('usdt-failure-msg');
                      if (failureMsg) failureMsg.innerHTML = "❌ Hash Verification Failed!<br><span style='font-size:12px; font-weight:normal;'>" + (data.error || "Invalid TxID or already used.") + "</span>";
                      document.getElementById('usdt-failure-view').classList.remove('hidden');
                  }
              }).catch(e => {
                  spinner.classList.add('hidden');
              });
        }`;
if (manualRegex.test(html)) {
    html = html.replace(manualRegex, newManual);
} else {
    console.log("confirmManualTxidClicked not found");
}

fs.writeFileSync('index.html', html);
console.log("UI scripts patched.");
